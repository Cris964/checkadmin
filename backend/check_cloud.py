import asyncio
import motor.motor_asyncio
import os
from dotenv import load_dotenv

async def main():
    load_dotenv()
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    
    print(f"Connecting to {mongo_url}")
    client = motor.motor_asyncio.AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    companies = await db.companies.find({}).to_list(100)
    print("COMPANIES:")
    for c in companies:
        print(c.get('id'), c.get('name'))
    
    users = await db.users.find({}).to_list(100)
    print("USERS:")
    for u in users:
        print(u.get('email'), u.get('company_id'), u.get('name'))

if __name__ == '__main__':
    asyncio.run(main())
