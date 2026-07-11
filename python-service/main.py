import os
import asyncio
import base64
import struct
import time
import traceback
import uuid
from typing import Optional

import httpx
from fastapi import FastAPI, BackgroundTasks, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables from the root .env file
load_dotenv(dotenv_path="../.env")

# Configuration
GOOGLE_AI_API_KEY = os.getenv("GOOGLE_AI_API_KEY")
SUPABASE_URL = (os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

# Google Lyria 3 (Pro) — full-song generation via the Gemini Interactions API.
LYRIA_MODEL = "lyria-3-pro-preview"

# CORS: comma-separated origins, or "*" for wide-open (dev only).
_cors_raw = (os.getenv("CORS_ORIGINS") or "http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173").strip()
if _cors_raw == "*":
    CORS_ORIGINS = ["*"]
    CORS_CREDENTIALS = False
else:
    CORS_ORIGINS = [o.strip() for o in _cors_raw.split(",") if o.strip()]
    CORS_CREDENTIALS = True

if not GOOGLE_AI_API_KEY:
    print("WARNING: GOOGLE_AI_API_KEY is missing")
if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("WARNING: Supabase credentials are missing")
if not SUPABASE_ANON_KEY:
    print("WARNING: SUPABASE_ANON_KEY missing — JWT verification will fail")

# Initialize FastAPI
app = FastAPI(title="suno-clone-python-proxy")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=CORS_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)

_bearer = HTTPBearer(auto_error=False)


class InsufficientCreditsError(Exception):
    """Raised when an atomic credit deduction would make the balance negative."""


# Simple Supabase Client using HTTPX to avoid the heavy supabase package.
class SimpleSupabaseClient:
    def __init__(self, url, key):
        self.url = url
        self.key = key
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    async def update_track_status(self, track_id, updates):
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.patch(
                f"{self.url}/rest/v1/tracks?id=eq.{track_id}",
                headers=self.headers,
                json=updates,
            )
            resp.raise_for_status()
            return resp

    async def create_track(self, track_data):
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{self.url}/rest/v1/tracks",
                headers={**self.headers, "Prefer": "return=representation"},
                json=track_data,
            )
            resp.raise_for_status()
            return resp.json()[0]

    async def adjust_credits(self, user_id, delta):
        """Atomically adjust the user's credits via the adjust_credits RPC.

        Returns the new balance. Raises InsufficientCreditsError when the
        adjustment would drive the balance below zero.
        """
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{self.url}/rest/v1/rpc/adjust_credits",
                headers=self.headers,
                json={"p_user_id": user_id, "p_delta": delta},
            )
            if resp.status_code == 400 and "insufficient_credits" in resp.text:
                raise InsufficientCreditsError()
            resp.raise_for_status()
            return resp.json()

    async def upload_file(self, bucket, path, file_data, content_type="audio/mpeg"):
        upload_headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": content_type,
            "x-upsert": "true",
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{self.url}/storage/v1/object/{bucket}/{path}",
                headers=upload_headers,
                content=file_data,
            )
            resp.raise_for_status()
            return resp


supabase_client = (
    SimpleSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
    else None
)


async def verify_supabase_user(token: str) -> dict:
    """Validate a Supabase access token via Auth API; return the user object."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(status_code=500, detail="Server misconfigured: auth keys missing")

    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {token}",
            },
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    data = resp.json()
    user_id = data.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid session payload")
    return data


async def require_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> dict:
    if credentials is None or credentials.scheme.lower() != "bearer" or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Authorization Bearer token required")
    return await verify_supabase_user(credentials.credentials)


def get_config_issues() -> list[str]:
    missing: list[str] = []
    if not GOOGLE_AI_API_KEY:
        missing.append("GOOGLE_AI_API_KEY")
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not SUPABASE_SERVICE_ROLE_KEY:
        missing.append("SUPABASE_SERVICE_ROLE_KEY")
    if not SUPABASE_ANON_KEY:
        missing.append("SUPABASE_ANON_KEY")
    if not missing and not supabase_client:
        missing.append("Supabase client unavailable")
    return missing


def is_service_ready() -> tuple[bool, str | None]:
    """Lightweight preflight before charging credits."""
    missing = get_config_issues()
    if missing:
        return False, ", ".join(missing)
    return True, None


@app.on_event("startup")
async def startup_validate_configuration():
    ready, reason = is_service_ready()
    if not ready:
        raise RuntimeError(f"Server misconfigured: {reason}")


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
    """Best-effort duration (whole seconds) from a WAV container."""
    try:
        if len(container) < 12 or container[0:4] != b"RIFF" or container[8:12] != b"WAVE":
            return 0
        sample_rate = channels = bits = data_size = None
        idx = 12
        while idx + 8 <= len(container):
            chunk_id = container[idx : idx + 4]
            chunk_size = struct.unpack("<I", container[idx + 4 : idx + 8])[0]
            body = idx + 8
            if chunk_id == b"fmt " and body + 16 <= len(container):
                channels = struct.unpack("<H", container[body + 2 : body + 4])[0]
                sample_rate = struct.unpack("<I", container[body + 4 : body + 8])[0]
                bits = struct.unpack("<H", container[body + 14 : body + 16])[0]
            elif chunk_id == b"data":
                data_size = chunk_size
            idx = body + chunk_size + (chunk_size & 1)
        if sample_rate and channels and bits and data_size:
            bytes_per_second = sample_rate * channels * (bits // 8)
            if bytes_per_second > 0:
                return int(data_size / bytes_per_second)
    except Exception:
        pass
    return 0


def _extract_audio_content(interaction):
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
    prompt: str = ""
    genre: str = "pop"
    # Optional client hint; ignored if it does not match the JWT subject.
    user_id: Optional[str] = None
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
        await supabase_client.update_track_status(track_id, {"status": "processing"})

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

        file_path = f"generated/{user_id}/{track_id}.{file_ext}"
        await supabase_client.upload_file("audio", file_path, audio_bytes, mime_type)

        public_url = f"{SUPABASE_URL}/storage/v1/object/public/audio/{file_path}"

        updates = {
            "status": "completed",
            "audio_url": public_url,
            "duration": duration_seconds,
        }
        if generated_lyrics and generated_lyrics.strip():
            updates["lyrics"] = generated_lyrics.strip()
        await supabase_client.update_track_status(track_id, updates)

        print(f"[Task] Successfully completed track {track_id}")

    except Exception:
        print(f"[Error] Failed processing track {track_id}: {traceback.format_exc()}")

        if supabase_client:
            try:
                await supabase_client.update_track_status(track_id, {"status": "failed"})
            except Exception:
                print(f"[Error] Failed to mark track {track_id} as failed: {traceback.format_exc()}")
            try:
                await supabase_client.adjust_credits(user_id, 10)
            except Exception:
                print(
                    f"[CRITICAL] Refund of 10 credits FAILED for user {user_id} "
                    f"(track {track_id}): {traceback.format_exc()}"
                )


@app.post("/generate-music")
async def generate_music_endpoint(
    request: GenerateRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_user),
):
    ready, reason = is_service_ready()
    if not ready:
        raise HTTPException(status_code=500, detail=f"Server misconfigured: {reason}")

    # Always charge/create for the authenticated user (JWT subject).
    user_id = user["id"]
    if request.user_id and request.user_id != user_id:
        raise HTTPException(status_code=403, detail="user_id does not match authenticated user")

    try:
        credits_remaining = await supabase_client.adjust_credits(user_id, -10)
    except InsufficientCreditsError:
        raise HTTPException(status_code=402, detail="Insufficient credits")
    except Exception as e:
        print(f"Error deducting credits: {e}")
        raise HTTPException(status_code=500, detail="Failed to deduct credits")

    track_id = str(uuid.uuid4())
    prompt = (request.prompt or "").strip()
    genre = (request.genre or "pop").strip() or "pop"
    try:
        track_data = {
            "id": track_id,
            "user_id": user_id,
            "title": (prompt[:50] if prompt else "Generated Track"),
            "prompt": prompt,
            "genre": genre,
            "status": "pending",
            "is_public": False,
            "duration": 0,
        }
        if request.lyrics and request.lyrics.strip():
            track_data["lyrics"] = request.lyrics.strip()
        await supabase_client.create_track(track_data)
    except Exception as e:
        print(f"Error creating track: {e}")
        try:
            await supabase_client.adjust_credits(user_id, 10)
        except Exception:
            print(
                f"[CRITICAL] Refund failed for user {user_id} after track-create error: "
                f"{traceback.format_exc()}"
            )
        raise HTTPException(status_code=500, detail="Failed to create track record")

    background_tasks.add_task(
        generate_music_task,
        track_id,
        prompt,
        genre,
        user_id,
        lyrics=request.lyrics,
        negative_prompt=request.negative_prompt,
    )
    return {
        "status": "accepted",
        "message": "Generation started",
        "track": track_data,
        "credits_remaining": credits_remaining,
    }


@app.get("/")
def health_check():
    ready, reason = is_service_ready()
    return {
        "status": "ok" if ready else "degraded",
        "service": "suno-clone-python-proxy",
        "ready": ready,
        "reason": reason,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
