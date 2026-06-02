import asyncio
import motor.motor_asyncio

async def main():
    client = motor.motor_asyncio.AsyncIOMotorClient("mongodb+srv://admin:CheckAdmin2026@cluster0.dbw3s.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
    db = client.checkadmin
    prods = await db.products.count_documents({})
    raw = await db.raw_materials.count_documents({})
    print(f"Products: {prods}, Raw Materials: {raw}")
    
    # Get products
    products = await db.products.find({}).to_list(None)
    print("Sample Product:", products[0] if products else None)
    
if __name__ == '__main__':
    asyncio.run(main())
