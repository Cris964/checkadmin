import asyncio
import motor.motor_asyncio
from datetime import datetime

async def main():
    client = motor.motor_asyncio.AsyncIOMotorClient("mongodb+srv://checkadmin_user:yvo9ygPlrFr6IYu6@checkadmin.p2m4chr.mongodb.net/?appName=CheckAdmin")
    db = client.checkadmin_prod
    
    prods = await db.products.find({}).to_list(None)
    print(f"Total Products: {len(prods)}")
    
    raw = await db.raw_materials.find({}).to_list(None)
    print(f"Total Raw Materials: {len(raw)}")
    
    if prods:
        print("Sample Product from checkadmin_prod:")
        print(prods[-1])
        
if __name__ == '__main__':
    asyncio.run(main())
