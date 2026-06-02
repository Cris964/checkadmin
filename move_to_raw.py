import asyncio
import motor.motor_asyncio

async def main():
    client = motor.motor_asyncio.AsyncIOMotorClient("mongodb+srv://checkadmin_user:yvo9ygPlrFr6IYu6@checkadmin.p2m4chr.mongodb.net/?appName=CheckAdmin")
    db = client.checkadmin_prod
    
    prods = await db.products.find({}).to_list(None)
    
    # We will move all 131 products to raw_materials
    moved = 0
    for p in prods:
        # Convert to RawMaterial format
        raw_mat = {
            "id": p.get("id"),
            "company_id": p.get("company_id"),
            "name": p.get("name"),
            "sku": p.get("sku", ""),
            "current_stock": float(p.get("stock_current", 0)),
            "min_stock": float(p.get("stock_min", 0)),
            "unit": "unidades", # default
            "purchase_price": float(p.get("cost_buy", 0)),
            "purchase_quantity": 1.0,
            "purchase_unit_measure": "unidades",
            "cost_per_unit": float(p.get("cost_buy", 0)),
            "supplier": "",
            "created_at": p.get("created_at")
        }
        
        # Check if it already exists
        exists = await db.raw_materials.find_one({"id": raw_mat["id"]})
        if not exists:
            await db.raw_materials.insert_one(raw_mat)
            moved += 1
            
    print(f"Successfully moved {moved} items to raw_materials.")
    
    # Optionally, we should delete them from products
    if moved > 0:
        res = await db.products.delete_many({})
        print(f"Deleted {res.deleted_count} items from products.")

if __name__ == '__main__':
    asyncio.run(main())
