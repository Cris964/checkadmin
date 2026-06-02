import asyncio
import motor.motor_asyncio
from datetime import datetime, timezone, timedelta

async def main():
    client = motor.motor_asyncio.AsyncIOMotorClient("mongodb+srv://checkadmin_user:yvo9ygPlrFr6IYu6@checkadmin.p2m4chr.mongodb.net/?appName=CheckAdmin")
    db = client.checkadmin_prod
    
    # Let's find products created in the last 2 days
    now = datetime.now(timezone.utc)
    two_days_ago = now - timedelta(days=2)
    
    prods = await db.products.find({}).to_list(None)
    
    recent_prods = []
    for p in prods:
        created = p.get("created_at")
        if isinstance(created, str):
            try:
                # Handle isoformat with or without Z/offset
                created_dt = datetime.fromisoformat(created.replace('Z', '+00:00'))
                if created_dt.tzinfo is None:
                    created_dt = created_dt.replace(tzinfo=timezone.utc)
                if created_dt > two_days_ago:
                    recent_prods.append(p)
            except Exception as e:
                print(f"Error parsing date {created}: {e}")
        elif isinstance(created, datetime):
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            if created > two_days_ago:
                recent_prods.append(p)
                
    print(f"Total Recent Products: {len(recent_prods)}")
    if recent_prods:
        print("Sample Recent:", recent_prods[0])

if __name__ == '__main__':
    asyncio.run(main())
