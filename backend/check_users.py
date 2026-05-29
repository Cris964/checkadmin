import asyncio
import motor.motor_asyncio

async def main():
    client = motor.motor_asyncio.AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['accucloud_pro']
    companies = await db.companies.find({}).to_list(100)
    print("COMPANIES:")
    for c in companies:
        print(c.get('id'), c.get('name'))
    
    users = await db.users.find({}).to_list(100)
    print("USERS:")
    for u in users:
        print(u.get('email'), u.get('company_id'))

if __name__ == '__main__':
    asyncio.run(main())
