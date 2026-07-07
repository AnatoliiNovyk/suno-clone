import os
import asyncio
import base64
import struct
import time
import traceback
import uuid
from typing import Optional

import httpx
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables from the root .env file
load_dotenv(dotenv_path="../.env")

# Configuration
GOOGLE_AI_API_KEY = os.getenv("GOOGLE_AI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Google Lyria 3 (Pro) — full-song generation via the Gemini Interactions API.
LYRIA_MODEL = "lyria-3-pro-preview"

if not GOOGLE_AI_API_KEY:
    print("WARNING: GOOGLE_AI_API_KEY is missing")
if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("WARNING: Supabase credentials are missing")

# Initialize FastAPI
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Simple Supabase Client using HTTPX to avoid dependency on 'supabase' package which requires compilation tools on some systems
class SimpleSupabaseClient:
    def __init__(self, url, key):
        self.url = url
        self.key = key
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json"
        }

    async def update_track_status(self, track_id, updates):
        async with httpx.AsyncClient() as client:
            resp = await client.patch(
                f"{self.url}/rest/v1/tracks?id=eq.{track_id}",
                headers=self.headers,
                json=updates
            )
            resp.raise_for_status()
            return resp

    async def create_track(self, track_data):
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.url}/rest/v1/tracks",
                headers={**self.headers, "Prefer": "return=representation"},
                json=track_data
            )
            resp.raise_for_status()
            return resp.json()[0]

    async def get_profile(self, user_id):
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.url}/rest/v1/profiles?id=eq.{user_id}&select=credits",
                headers=self.headers
            )
            resp.raise_for_status()
            data = resp.json()
            return data[0] if data else None

    async def update_credits(self, user_id, new_credits):
        async with httpx.AsyncClient() as client:
            resp = await client.patch(
                f"{self.url}/rest/v1/profiles?id=eq.{user_id}",
                headers=self.headers,
                json={"credits": new_credits}
            )
            resp.raise_for_status()
            return resp

    async def upload_file(self, bucket, path, file_data, content_type="audio/mpeg"):
        upload_headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": content_type,
            "x-upsert": "true"
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.url}/storage/v1/object/{bucket}/{path}",
                headers=upload_headers,
                content=file_data
            )
            resp.raise_for_status()
            return resp

supabase_client = SimpleSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY else None


def is_service_ready() -> tuple[bool, str | None]:
    """Lightweight preflight run before charging credits.

    The Lyria 3 Interactions API is generally available, so we no longer probe a
    model-listing endpoint (Lyria 3 preview models are not reliably enumerated
    there). We only verify the server is configured; any real access problem
    surfaces during generation and triggers a credit refund.
    """
    if not GOOGLE_AI_API_KEY:
        return False, "Missing GOOGLE_AI_API_KEY"
    if not supabase_client:
        return False, "Supabase unavailable"
    return True, None


# MIME type -> file extension for audio returned by Lyria 3.
_AUDIO_EXT_BY_MIME = {
    "audio/wav": "wav",
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/ogg_opus": "ogg",
    "audio/opus": "opus",
    "audio/flac": "flac",
    "audio/aac": "aac",
    "audio/m4a": "m4a",
    "audio/aiff": "aiff",
}


def wav_duration_seconds(container: bytes) -> int:
    """Best-effort duration (in whole seconds) parsed from a WAV container.

    Returns 0 if the bytes are not a parseable PCM WAV.
    """
    try:
        if len(container) < 12 or container[0:4] != b"RIFF" or container[8:12] != b"WAVE":
            return 0
        sample_rate = channels = bits = data_size = None
        idx = 12
        while idx + 8 <= len(container):
            chunk_id = container[idx:idx + 4]
            chunk_size = struct.unpack("<I", container[idx + 4:idx + 8])[0]
            body = idx + 8
            if chunk_id == b"fmt " and body + 16 <= len(container):
                channels = struct.unpack("<H", container[body + 2:body + 4])[0]
                sample_rate = struct.unpack("<I", container[body + 4:body + 8])[0]
                bits = struct.unpack("<H", container[body + 14:body + 16])[0]
            elif chunk_id == b"data":
                data_size = chunk_size
            idx = body + chunk_size + (chunk_size & 1)  # chunks are word-aligned
        if sample_rate and channels and bits and data_size:
            bytes_per_second = sample_rate * channels * (bits // 8)
            if bytes_per_second > 0:
                return int(data_size / bytes_per_second)
    except Exception:
        pass
    return 0


def _extract_audio_content(interaction):
    """Pull the AudioContent object out of a completed interaction.

    Prefers the top-level `output_audio`; falls back to scanning model-output
    steps for an audio content block.
    """
    audio = getattr(interaction, "output_audio", None)
    if audio is not None and getattr(audio, "data", None):
        return audio

    steps = getattr(interaction, "steps", None) or []
    for step in steps:
        contents = getattr(step, "content", None) or []
        for content in contents:
            if getattr(content, "type", None) == "audio" and getattr(content, "data", None):
                return content
    return None


class GenerateRequest(BaseModel):
    prompt: str
    genre: str
    user_id: str

    # Optional Lyria 3 inputs
    lyrics: Optional[str] = None
    negative_prompt: Optional[str] = None


def _build_input_text(prompt: str, genre: str, negative_prompt: str | None, lyrics: str | None) -> str:
    parts: list[str] = []
    if prompt and prompt.strip():
        parts.append(prompt.strip())
    if genre and genre.strip():
        parts.append(f"Genre: {genre.strip()}.")
    if negative_prompt and negative_prompt.strip():
        parts.append(f"Avoid: {negative_prompt.strip()}.")

    text = " ".join(parts).strip() or "Create an original song."
    if lyrics and lyrics.strip():
        text += f"\n\nUse these lyrics:\n{lyrics.strip()}"
    return text


async def generate_music_task(
    track_id: str,
    prompt: str,
    genre: str,
    user_id: str,
    *,
    lyrics: str | None = None,
    negative_prompt: str | None = None,
):
    print(f"[Task] Starting Lyria 3 generation for track {track_id}")

    if not supabase_client:
        print("[Error] Supabase client not initialized")
        return

    try:
        # 1. Mark as processing
        await supabase_client.update_track_status(track_id, {"status": "processing"})

        # 2. Generate a full song via Google Lyria 3 Pro (Gemini Interactions API).
        # Official docs: https://ai.google.dev/gemini-api/docs/music-generation
        from google import genai

        input_text = _build_input_text(prompt, genre, negative_prompt, lyrics)

        client = genai.Client(api_key=GOOGLE_AI_API_KEY)

        interaction = await client.aio.interactions.create(
            model=LYRIA_MODEL,
            input=input_text,
            response_format={
                "type": "audio",
                "mime_type": "audio/wav",
                "delivery": "inline",
            },
            timeout=600.0,
        )

        # Pro songs can take a while; poll until the interaction settles.
        deadline = time.time() + 600.0
        while (
            getattr(interaction, "status", None) in ("in_progress", "requires_action")
            and time.time() < deadline
        ):
            await asyncio.sleep(5)
            interaction = await client.aio.interactions.get(interaction.id)

        status = getattr(interaction, "status", None)
        if status != "completed":
            raise Exception(f"Lyria 3 interaction did not complete (status={status})")

        # 3. Extract inline audio + generated lyrics
        audio = _extract_audio_content(interaction)
        if audio is None or not getattr(audio, "data", None):
            raise Exception("No audio returned by Lyria 3")

        audio_bytes = base64.b64decode(audio.data)
        mime_type = getattr(audio, "mime_type", None) or "audio/wav"
        file_ext = _AUDIO_EXT_BY_MIME.get(mime_type, "wav")
        generated_lyrics = getattr(interaction, "output_text", None)

        if len(audio_bytes) < 1024:
            raise Exception("Lyria 3 returned an empty audio payload")

        duration_seconds = wav_duration_seconds(audio_bytes) if file_ext == "wav" else 0

        # 4. Upload to Supabase Storage
        file_path = f"generated/{user_id}/{track_id}.{file_ext}"
        await supabase_client.upload_file("audio", file_path, audio_bytes, mime_type)

        # 5. Public URL
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/audio/{file_path}"

        # 6. Mark completed
        updates = {
            "status": "completed",
            "audio_url": public_url,
            "duration": duration_seconds,
        }
        if generated_lyrics and generated_lyrics.strip():
            updates["lyrics"] = generated_lyrics.strip()
        await supabase_client.update_track_status(track_id, updates)

        print(f"[Task] Successfully completed track {track_id}")

    except Exception as e:
        print(f"[Error] Failed processing track {track_id}: {traceback.format_exc()}")

        # Cleanup + best-effort refund (credits are deducted before the task starts)
        if supabase_client:
            try:
                await supabase_client.update_track_status(track_id, {"status": "failed"})
                profile = await supabase_client.get_profile(user_id)
                if profile and isinstance(profile.get('credits'), (int, float)):
                    await supabase_client.update_credits(user_id, int(profile['credits']) + 10)
            except Exception:
                pass


@app.post("/generate-music")
async def generate_music_endpoint(request: GenerateRequest, background_tasks: BackgroundTasks):
    ready, reason = is_service_ready()
    if not ready:
        raise HTTPException(status_code=500, detail=f"Server misconfigured: {reason}")

    # 1. Check Credits
    try:
        profile = await supabase_client.get_profile(request.user_id)
        if not profile or profile['credits'] < 10:
            raise HTTPException(status_code=402, detail="Insufficient credits")

        current_credits = profile['credits']
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error checking credits: {e}")
        raise HTTPException(status_code=500, detail="Failed to check credits")

    # 2. Deduct Credits
    try:
        await supabase_client.update_credits(request.user_id, current_credits - 10)
    except Exception as e:
        print(f"Error deducting credits: {e}")
        raise HTTPException(status_code=500, detail="Failed to deduct credits")

    # 3. Create Pending Track
    track_id = str(uuid.uuid4())
    try:
        track_data = {
            "id": track_id,
            "user_id": request.user_id,
            "title": request.prompt[:50] or "Generated Track",
            "prompt": request.prompt,
            "genre": request.genre,
            "status": "pending",
            "is_public": False,
            "duration": 0
        }
        if request.lyrics and request.lyrics.strip():
            track_data["lyrics"] = request.lyrics.strip()
        await supabase_client.create_track(track_data)
    except Exception as e:
        print(f"Error creating track: {e}")
        # Attempt refund
        await supabase_client.update_credits(request.user_id, current_credits)
        raise HTTPException(status_code=500, detail="Failed to create track record")

    background_tasks.add_task(
        generate_music_task,
        track_id,
        request.prompt,
        request.genre,
        request.user_id,
        lyrics=request.lyrics,
        negative_prompt=request.negative_prompt,
    )
    return {"status": "accepted", "message": "Generation started", "track": track_data, "credits_remaining": current_credits - 10}

@app.get("/")
def health_check():
    return {"status": "ok", "service": "suno-clone-python-proxy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
