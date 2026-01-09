import os
import asyncio
import traceback
import httpx
import struct
import time
from typing import Optional
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

# Cache Lyria availability to avoid calling model list on every request.
_lyria_availability_cache: dict[str, object] = {
    "checked_at": 0.0,
    "available": None,
    "reason": None,
}


async def is_lyria_available() -> tuple[bool, str | None]:
    now = time.time()
    checked_at = float(_lyria_availability_cache.get("checked_at") or 0.0)
    available = _lyria_availability_cache.get("available")
    reason = _lyria_availability_cache.get("reason")

    # Cache for 10 minutes
    if available is not None and (now - checked_at) < 600:
        return bool(available), reason if isinstance(reason, str) else None

    if not GOOGLE_AI_API_KEY:
        _lyria_availability_cache.update({"checked_at": now, "available": False, "reason": "Missing GOOGLE_AI_API_KEY"})
        return False, "Missing GOOGLE_AI_API_KEY"

    try:
        # Lyria RealTime is an experimental model served via v1alpha.
        # The models endpoint is paginated; we must follow nextPageToken.
        target = "models/lyria-realtime-exp"

        next_page_token: str | None = None
        async with httpx.AsyncClient(timeout=30.0) as http:
            while True:
                params = {"pageToken": next_page_token} if next_page_token else None
                resp = await http.get(
                    "https://generativelanguage.googleapis.com/v1alpha/models",
                    headers={"x-goog-api-key": GOOGLE_AI_API_KEY},
                    params=params,
                )
                if not resp.is_success:
                    _lyria_availability_cache.update({
                        "checked_at": now,
                        "available": False,
                        "reason": f"Model list failed: {resp.status_code}",
                    })
                    return False, f"Model list failed: {resp.status_code}"

                data = resp.json()
                names = [m.get("name", "") for m in data.get("models", []) if isinstance(m, dict)]

                if any(isinstance(n, str) and n == target for n in names):
                    _lyria_availability_cache.update({"checked_at": now, "available": True, "reason": None})
                    return True, None

                next_page_token = data.get("nextPageToken")
                if not isinstance(next_page_token, str) or not next_page_token:
                    break

        _lyria_availability_cache.update({
            "checked_at": now,
            "available": False,
            "reason": "Lyria RealTime model is not available for this API key/project.",
        })
        return False, "Lyria RealTime model is not available for this API key/project."
    except Exception as e:
        _lyria_availability_cache.update({
            "checked_at": now,
            "available": False,
            "reason": f"Model list exception: {type(e).__name__}",
        })
        return False, f"Model list exception: {type(e).__name__}"

def create_wav_header(pcm_data: bytes, sample_rate: int = 24000, channels: int = 1, bits_per_sample: int = 16) -> bytes:
    """
    Creates a standard WAV header for PCM data.
    """
    audio_format = 1  # PCM
    byte_rate = sample_rate * channels * bits_per_sample // 8
    block_align = channels * bits_per_sample // 8
    data_size = len(pcm_data)
    chunk_size = 36 + data_size

    # Pack the header
    return struct.pack(
        '<4sI4s4sIHHIIHH4sI',
        b'RIFF',
        chunk_size,
        b'WAVE',
        b'fmt ',
        16,             # Subchunk1Size
        audio_format,
        channels,
        sample_rate,
        byte_rate,
        block_align,
        bits_per_sample,
        b'data',
        data_size
    )

class GenerateRequest(BaseModel):
    prompt: str
    genre: str
    user_id: str

    # Optional Lyria RealTime controls (forwarded to LiveMusicGenerationConfig)
    bpm: Optional[int] = None
    guidance: Optional[float] = None
    density: Optional[float] = None
    brightness: Optional[float] = None
    temperature: Optional[float] = None
    top_k: Optional[int] = None
    seed: Optional[int] = None
    scale: Optional[str] = None
    music_generation_mode: Optional[str] = None
    mute_bass: Optional[bool] = None
    mute_drums: Optional[bool] = None
    only_bass_and_drums: Optional[bool] = None

async def generate_music_task(
    track_id: str,
    prompt: str,
    genre: str,
    user_id: str,
    *,
    bpm: int | None = None,
    guidance: float | None = None,
    density: float | None = None,
    brightness: float | None = None,
    temperature: float | None = None,
    top_k: int | None = None,
    seed: int | None = None,
    scale: str | None = None,
    music_generation_mode: str | None = None,
    mute_bass: bool | None = None,
    mute_drums: bool | None = None,
    only_bass_and_drums: bool | None = None,
):
    print(f"[Task] Starting generation for track {track_id}")
    
    if not supabase_client:
        print("[Error] Supabase client not initialized")
        return

    try:
        # 1. Update status to processing (already set to pending initially, but processing is next step)
        await supabase_client.update_track_status(track_id, {"status": "processing"})

        # 2. Generate music via Google Lyria RealTime (WebSocket streaming)
        # Official docs: https://ai.google.dev/gemini-api/docs/music-generation
        from google import genai
        from google.genai import types

        duration_seconds = 30
        sample_rate = 48000
        channels = 2
        bits_per_sample = 16
        bytes_per_second = sample_rate * channels * (bits_per_sample // 8)
        target_bytes = duration_seconds * bytes_per_second

        # Lyria RealTime is instrumental; keep the prompt music-focused.
        prompt_text = f"{prompt}. Genre: {genre}. Instrumental music.".strip()

        client = genai.Client(
            api_key=GOOGLE_AI_API_KEY,
            http_options={"api_version": "v1alpha"},
        )

        pcm = bytearray()
        last_chunk_at = time.time()

        async with client.aio.live.music.connect(model="models/lyria-realtime-exp") as session:
            await session.set_weighted_prompts(
                prompts=[types.WeightedPrompt(text=prompt_text, weight=1.0)]
            )

            config_kwargs: dict[str, object] = {}
            if bpm is not None:
                config_kwargs["bpm"] = int(bpm)
            if guidance is not None:
                config_kwargs["guidance"] = float(guidance)
            if density is not None:
                config_kwargs["density"] = float(density)
            if brightness is not None:
                config_kwargs["brightness"] = float(brightness)
            if temperature is not None:
                config_kwargs["temperature"] = float(temperature)
            if top_k is not None:
                config_kwargs["top_k"] = int(top_k)
            if seed is not None:
                config_kwargs["seed"] = int(seed)

            if isinstance(scale, str) and scale.strip():
                scale_key = scale.strip()
                scale_value = getattr(types.Scale, scale_key, None)
                if scale_value is not None:
                    config_kwargs["scale"] = scale_value

            if isinstance(music_generation_mode, str) and music_generation_mode.strip():
                mode_key = music_generation_mode.strip()
                mode_value = getattr(types.MusicGenerationMode, mode_key, None)
                if mode_value is not None:
                    config_kwargs["music_generation_mode"] = mode_value

            if mute_bass is not None:
                config_kwargs["mute_bass"] = bool(mute_bass)
            if mute_drums is not None:
                config_kwargs["mute_drums"] = bool(mute_drums)
            if only_bass_and_drums is not None:
                config_kwargs["only_bass_and_drums"] = bool(only_bass_and_drums)

            if not config_kwargs:
                config_kwargs["temperature"] = 1.1

            await session.set_music_generation_config(
                config=types.LiveMusicGenerationConfig(**config_kwargs)
            )
            await session.play()

            # Safety margin: allow a bit more time than duration_seconds to collect enough bytes.
            deadline = time.time() + float(duration_seconds) + 20.0

            async for message in session.receive():
                if time.time() > deadline:
                    break

                server_content = getattr(message, "server_content", None)
                audio_chunks = getattr(server_content, "audio_chunks", None) if server_content is not None else None
                if not audio_chunks:
                    continue

                for chunk in audio_chunks:
                    data = getattr(chunk, "data", None)
                    if isinstance(data, (bytes, bytearray)):
                        pcm.extend(data)
                        last_chunk_at = time.time()
                    elif isinstance(data, str):
                        # Defensive: some SDK shapes might surface base64 as str
                        try:
                            import base64 as _b64
                            pcm.extend(_b64.b64decode(data))
                            last_chunk_at = time.time()
                        except Exception:
                            pass

                    if len(pcm) >= target_bytes:
                        break

                if len(pcm) >= target_bytes:
                    break

                # If we haven't received any audio for a while, stop early.
                if (time.time() - last_chunk_at) > 10.0:
                    break

            try:
                await session.stop()
            except Exception:
                pass

        if len(pcm) < bytes_per_second:
            raise Exception("No audio received from Lyria RealTime session")

        # 3. Wrap raw PCM into WAV for browser playback
        wav_header = create_wav_header(bytes(pcm), sample_rate=sample_rate, channels=channels, bits_per_sample=bits_per_sample)
        container_data = wav_header + bytes(pcm)
        content_type = "audio/wav"
        file_ext = "wav"

        # 4. Upload to Supabase Storage
        file_path = f"generated/{user_id}/{track_id}.{file_ext}"
        
        # Upload using our simple client
        await supabase_client.upload_file("audio", file_path, container_data, content_type)
        
        # 5. Get Public URL
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/audio/{file_path}"
        
        # 6. Update DB with completion
        await supabase_client.update_track_status(track_id, {
            "status": "completed",
            "audio_url": public_url,
            "duration": duration_seconds
        })
        
        print(f"[Task] Successfully completed track {track_id}")

    except Exception as e:
        error_msg = str(e)
        print(f"[Error] Failed processing track {track_id}: {traceback.format_exc()}")
        
        # Cleanup if track exists
        if supabase_client:
            try:
                await supabase_client.update_track_status(track_id, {"status": "failed"})
                # Best-effort refund (credits are deducted before starting the background task)
                profile = await supabase_client.get_profile(user_id)
                if profile and isinstance(profile.get('credits'), (int, float)):
                    await supabase_client.update_credits(user_id, int(profile['credits']) + 10)
            except:
                pass

@app.post("/generate-music")
async def generate_music_endpoint(request: GenerateRequest, background_tasks: BackgroundTasks):
    if not GOOGLE_AI_API_KEY:
        raise HTTPException(status_code=500, detail="Server misconfigured: Missing API Key")
    
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Server misconfigured: Supabase unavailable")

    # Preflight: ensure Lyria is available for this API key before charging credits.
    lyria_ok, lyria_reason = await is_lyria_available()
    if not lyria_ok:
        raise HTTPException(
            status_code=503,
            detail=(
                "Google Lyria RealTime (models/lyria-realtime-exp) недоступна для цього API ключа/проєкту. "
                "Будь ласка, використайте ключ/проєкт з доступом до Lyria RealTime або інший провайдер генерації музики. "
                f"({lyria_reason})"
            ),
        )

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
    import uuid
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
        bpm=request.bpm,
        guidance=request.guidance,
        density=request.density,
        brightness=request.brightness,
        temperature=request.temperature,
        top_k=request.top_k,
        seed=request.seed,
        scale=request.scale,
        music_generation_mode=request.music_generation_mode,
        mute_bass=request.mute_bass,
        mute_drums=request.mute_drums,
        only_bass_and_drums=request.only_bass_and_drums,
    )
    return {"status": "accepted", "message": "Generation started", "track": track_data, "credits_remaining": current_credits - 10}

@app.get("/")
def health_check():
    return {"status": "ok", "service": "suno-clone-python-proxy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
