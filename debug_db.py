import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(r"c:\Users\keine\.gemini\antigravity\scratch\checkadmin\backend\.env")

async def debug_db():
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    
    print(f"Connecting to {mongo_url} / {db_name}")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    collections = await db.list_collection_names()
    print(f"Collections: {collections}")
    
    if 'users' in collections:
        count = await db.users.count_documents({})
        print(f"Users count: {count}")
        users = await db.users.find().to_list(10)
        for u in users:
            print(f"- {u.get('email')} | {u.get('company_id')}")
    else:
        print("Users collection NOT found")

if __name__ == "__main__":
    asyncio.run(debug_db())
