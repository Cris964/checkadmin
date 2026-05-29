import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(r"c:\Users\keine\.gemini\antigravity\scratch\checkadmin\backend\.env")

async def list_warehouses():
    mongo_url = os.environ.get('MONGO_URL')
    db_name = "checkadmin_prod"
    company_id = "1f275bb6-b236-4791-9f14-35fe997e2536" # Lab Imperio
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    warehouses = await db.warehouses.find({"company_id": company_id}).to_list(100)
    print(f"Warehouses for {company_id}:")
    for wh in warehouses:
        print(f"- {wh.get('name')} | id: {wh.get('id')}")

if __name__ == "__main__":
    asyncio.run(list_warehouses())
