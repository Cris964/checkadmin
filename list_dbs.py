import asyncio
import motor.motor_asyncio

async def main():
    client = motor.motor_asyncio.AsyncIOMotorClient("mongodb+srv://checkadmin_user:yvo9ygPlrFr6IYu6@checkadmin.p2m4chr.mongodb.net/?appName=CheckAdmin")
    dbs = await client.list_database_names()
    print("Databases:", dbs)

if __name__ == '__main__':
    asyncio.run(main())
