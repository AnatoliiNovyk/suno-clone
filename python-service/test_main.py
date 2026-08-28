import base64
import sys
import types
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from pydantic import ValidationError

import main


class FakeSupabaseClient:
    def __init__(self, transitions):
        self.transitions = list(transitions)
        self.transition_calls = []
        self.uploads = []
        self.deleted_files = []
        self.refunds = []

    async def transition_track_status(self, track_id, from_statuses, updates):
        self.transition_calls.append((track_id, from_statuses, updates))
        return self.transitions.pop(0)

    async def upload_file(self, bucket, path, file_data, content_type):
        self.uploads.append((bucket, path, file_data, content_type))

    async def delete_storage_object(self, bucket, path):
        self.deleted_files.append((bucket, path))

    async def adjust_credits(self, user_id, delta, tx_type, description):
        self.refunds.append((user_id, delta, tx_type, description))


def completed_interaction():
    return SimpleNamespace(
        status="completed",
        output_audio=SimpleNamespace(
            data=base64.b64encode(b"a" * 1024).decode(),
            mime_type="audio/wav",
        ),
        output_text=None,
    )


async def create_completed_interaction(*_args, **_kwargs):
    return completed_interaction()


async def create_failed_interaction(*_args, **_kwargs):
    raise RuntimeError("Lyria failed")


class GenerationLifecycleTests(unittest.IsolatedAsyncioTestCase):
    async def run_task(self, client, create_interaction):
        google = types.ModuleType("google")
        google.genai = SimpleNamespace(Client=lambda **_kwargs: object())
        with (
            patch.object(main, "supabase_client", client),
            patch.object(main, "_create_interaction", create_interaction),
            patch.dict(sys.modules, {"google": google}),
        ):
            await main.generate_music_task(
                "track-id",
                "prompt",
                "pop",
                "user-id",
                cost=10,
            )

    async def test_reaper_wins_completion_deletes_orphaned_audio_without_refund(self):
        client = FakeSupabaseClient([[{"status": "processing"}], []])

        await self.run_task(client, create_completed_interaction)

        self.assertEqual(client.refunds, [])
        self.assertEqual(client.deleted_files, [("audio", "generated/user-id/track-id.wav")])
        self.assertEqual(client.transition_calls[0][1], ("pending",))
        self.assertEqual(client.transition_calls[1][1], ("pending", "processing"))

    async def test_task_refunds_once_only_when_it_claims_failure(self):
        client = FakeSupabaseClient([[{"status": "processing"}], [{"status": "failed"}]])

        await self.run_task(client, create_failed_interaction)

        self.assertEqual(len(client.refunds), 1)
        self.assertEqual(client.refunds[0][0:3], ("user-id", 10, "refund"))
        self.assertEqual(client.transition_calls[1][1], ("pending", "processing"))

    async def test_task_does_not_refund_when_another_worker_claimed_failure(self):
        client = FakeSupabaseClient([[{"status": "processing"}], []])

        await self.run_task(client, create_failed_interaction)

        self.assertEqual(client.refunds, [])

    async def test_task_stops_before_generation_when_reaper_already_settled_track(self):
        client = FakeSupabaseClient([[]])

        await self.run_task(client, create_completed_interaction)

        self.assertEqual(len(client.transition_calls), 1)
        self.assertEqual(client.uploads, [])
        self.assertEqual(client.refunds, [])


class GenerateRequestValidationTests(unittest.TestCase):
    def test_accepts_limit_values(self):
        request = main.GenerateRequest(
            prompt="p" * 500,
            genre="g" * 100,
            title="t" * 100,
            seed=2_147_483_647,
            temperature=1,
            vocal_gender="female",
            style_influence=100,
            lyrics="l" * 5000,
            negative_prompt="n" * 500,
        )
        self.assertEqual(request.mode, "song")

    def test_rejects_invalid_generation_values(self):
        invalid_payloads = [
            {"mode": "invalid"},
            {"vocal_gender": "robot"},
            {"seed": 0},
            {"seed": 2_147_483_648},
            {"temperature": -0.1},
            {"temperature": 1.1},
            {"style_influence": -1},
            {"style_influence": 101},
            {"prompt": "p" * 501},
            {"genre": "g" * 101},
            {"title": "t" * 101},
            {"lyrics": "l" * 5001},
            {"negative_prompt": "n" * 501},
        ]
        for payload in invalid_payloads:
            with self.subTest(payload=payload), self.assertRaises(ValidationError):
                main.GenerateRequest(**payload)


if __name__ == "__main__":
    unittest.main()
