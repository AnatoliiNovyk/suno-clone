import os
import asyncio
from urllib.parse import quote

import httpx
from dotenv import load_dotenv

# Load env variables
load_dotenv(dotenv_path="../.env")

SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


async def refill_credits(email: str, amount: int = 1000):
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are missing from ../.env")
        return

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Find user by email in profiles. The address is URL-encoded: an
        #    unescaped '+' would otherwise be read as a space by PostgREST.
        print(f"Searching for user with email: {email}...")
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/profiles?email=eq.{quote(email, safe='')}&select=id,credits",
            headers=headers,
        )

        if resp.status_code != 200:
            print(f"Error fetching profile: {resp.text}")
            return

        users = resp.json()
        if not users:
            print("User not found in 'profiles' table.")
            return

        user_id = users[0]["id"]
        print(f"Found user. Current credits: {users[0]['credits']}")

        # 2. Move the balance through the atomic RPC. A read-modify-write PATCH
        #    on profiles.credits would silently discard any generation that
        #    charged credits in between — and it would skip the ledger row.
        update_resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/rpc/adjust_credits",
            headers=headers,
            json={
                "p_user_id": user_id,
                "p_delta": amount,
                "p_type": "manual_refill",
                "p_description": f"refill_credits.py (+{amount})",
            },
        )

        if update_resp.status_code == 200:
            print(f"SUCCESS! Added {amount} credits. New balance: {update_resp.json()}")
        else:
            print(f"Failed to update credits: {update_resp.text}")


if __name__ == "__main__":
    email = input("Enter user email to refill: ")
    asyncio.run(refill_credits(email.strip()))
