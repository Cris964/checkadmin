import asyncio
import motor.motor_asyncio
from datetime import datetime, timezone, timedelta

async def main():
    client = motor.motor_asyncio.AsyncIOMotorClient("mongodb+srv://checkadmin_user:yvo9ygPlrFr6IYu6@checkadmin.p2m4chr.mongodb.net/?appName=CheckAdmin")
    db = client.checkadmin_prod
    
    prods = await db.products.find({}).to_list(None)
    
    # Sort by created_at string
    prods.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)
    
    print("Latest 5 products:")
    for p in prods[:5]:
        print(p.get('name'), p.get('created_at'), p.get('category'))
        
    print("\nTotal products:", len(prods))

if __name__ == '__main__':
    asyncio.run(main())
