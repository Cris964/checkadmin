import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(r"c:\Users\keine\.gemini\antigravity\scratch\checkadmin\backend\.env")

async def list_dbs():
    mongo_url = os.environ.get('MONGO_URL')
    print(f"Connecting to {mongo_url}")
    client = AsyncIOMotorClient(mongo_url)
    dbs = await client.list_database_names()
    print(f"Databases: {dbs}")

if __name__ == "__main__":
    asyncio.run(list_dbs())
