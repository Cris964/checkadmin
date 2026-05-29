import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(r"c:\Users\keine\.gemini\antigravity\scratch\checkadmin\backend\.env")

async def list_users():
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    users = await db.users.find().to_list(100)
    print("Users in DB:")
    for user in users:
        print(f"- {user.get('email')} (company: {user.get('company_id')})")

if __name__ == "__main__":
    asyncio.run(list_users())
