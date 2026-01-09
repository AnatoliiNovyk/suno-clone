import os
import asyncio
import httpx
from dotenv import load_dotenv

# Load env variables
load_dotenv(dotenv_path="../.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

async def refill_credits(email: str, amount: int = 1000):
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    async with httpx.AsyncClient() as client:
        # 1. Find user by email in profiles
        print(f"Searching for user with email: {email}...")
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/profiles?email=eq.{email}&select=*",
            headers=headers
        )
        
        if resp.status_code != 200:
            print(f"Error fetching profile: {resp.text}")
            return

        users = resp.json()
        if not users:
            print("User not found in 'profiles' table.")
            return

        user_id = users[0]['id']
        current_credits = users[0]['credits']
        print(f"Found user. Current credits: {current_credits}")

        # 2. Update credits
        new_credits = current_credits + amount
        update_resp = await client.patch(
            f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}",
            headers=headers,
            json={"credits": new_credits}
        )
        
        if update_resp.status_code == 200:
            print(f"SUCCESS! Added {amount} credits. New balance: {new_credits}")
        else:
            print(f"Failed to update credits: {update_resp.text}")

if __name__ == "__main__":
    email = input("Enter user email to refill: ")
    asyncio.run(refill_credits(email.strip()))
