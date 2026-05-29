import pandas as pd
import motor.motor_asyncio
import asyncio
import os
from datetime import datetime, timezone
import uuid
from dotenv import load_dotenv

def generate_id():
    return uuid.uuid4().hex[:12]

async def main():
    load_dotenv()
    mongo_url = os.environ.get("MONGO_URL")
    
    print(f"Connecting to {mongo_url}")
    client = motor.motor_asyncio.AsyncIOMotorClient(mongo_url)
    db = client["checkadmin_prod"]
    
    company_id = "1f275bb6-b236-4791-9f14-35fe997e2536" # Laboratorio Imperio Natural
    
    print(f"Deleting products and raw_materials for company {company_id}...")
    await db.products.delete_many({"company_id": company_id})
    await db.raw_materials.delete_many({"company_id": company_id})
    
    excel_path = r"C:\Users\keine\.gemini\antigravity\scratch\KARDEX.xlsx"
    print(f"Reading Excel: {excel_path}")
    df = pd.read_excel(excel_path)
    
    bodegas_unicas = df["Bodega"].dropna().unique()
    warehouse_map = {}
    
    for b_name in bodegas_unicas:
        b_name_str = str(b_name).strip()
        wh = await db.raw_material_warehouses.find_one({"company_id": company_id, "name": b_name_str})
        if not wh:
            new_id = generate_id()
            new_wh = {
                "id": new_id,
                "company_id": company_id,
                "name": b_name_str,
                "location": "",
                "description": "Creada automáticamente desde importación",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.raw_material_warehouses.insert_one(new_wh)
            warehouse_map[b_name_str] = new_id
        else:
            warehouse_map[b_name_str] = wh["id"]
            
    default_wh_id = generate_id()
    inserted = 0
    
    for _, row in df.iterrows():
        name = str(row.get("Nombre", "")).strip()
        if not name or name.lower() == 'nan':
            continue
            
        sku_val = row.get("SKU")
        sku = str(sku_val).strip() if pd.notna(sku_val) else ""
        cost_val = row.get("Costo Compra")
        cost = float(cost_val) if pd.notna(cost_val) else 0.0
        stock_val = row.get("Stock Actual")
        stock = float(stock_val) if pd.notna(stock_val) else 0.0
        stock_min_val = row.get("Stock Minimo")
        stock_min = float(stock_min_val) if pd.notna(stock_min_val) else 0.0
        expiry_val = row.get("Fecha Vencimiento")
        expiry = str(expiry_val).strip() if pd.notna(expiry_val) else None
        
        b_name = str(row.get("Bodega", "")).strip()
        wh_id = warehouse_map.get(b_name, default_wh_id)
        
        raw_material = {
            "id": generate_id(),
            "company_id": company_id,
            "warehouse_id": wh_id,
            "sku": sku,
            "name": name,
            "unit_measure": "Unidad",
            "cost_per_unit": cost,
            "stock_current": stock,
            "stock_min": stock_min,
            "expiry_date": expiry,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.raw_materials.insert_one(raw_material)
        inserted += 1
        
    print(f"DONE. Inserted {inserted} items into raw_materials for Laboratorio Imperio Natural.")

if __name__ == "__main__":
    asyncio.run(main())
