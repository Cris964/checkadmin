import pandas as pd
import math
import motor.motor_asyncio
import asyncio
from datetime import datetime, timezone
import uuid

def generate_id():
    return uuid.uuid4().hex[:12]

async def main():
    # Conectar a MongoDB
    client = motor.motor_asyncio.AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["accucloud_pro"]
    
    # 1. Borrar todos los inventarios de ventas y produccion
    print("Borrando productos (ventas)...")
    await db.products.delete_many({})
    print("Borrando materias primas (produccion)...")
    await db.raw_materials.delete_many({})
    
    # 2. Leer Excel
    excel_path = r"C:\Users\keine\.gemini\antigravity\scratch\KARDEX.xlsx"
    print(f"Leyendo Excel: {excel_path}")
    df = pd.read_excel(excel_path)
    
    # Obtener el company_id asumiendo que solo hay uno o buscar el admin
    user = await db.users.find_one({"email": "admin@chekadmin.com"})
    if not user:
        # Fallback a algun user
        user = await db.users.find_one({})
    
    company_id = user["company_id"] if user else "company-1"
    
    # Obtener/crear bodegas de produccion segun el Excel
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
            
    # Si alguna materia prima no tiene bodega, usar una por defecto
    default_wh = await db.raw_material_warehouses.find_one({"company_id": company_id, "name": "Bodega Principal"})
    if not default_wh:
        default_wh_id = generate_id()
        await db.raw_material_warehouses.insert_one({
            "id": default_wh_id,
            "company_id": company_id,
            "name": "Bodega Principal",
            "location": "",
            "description": "Default",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        default_wh = {"id": default_wh_id}
        
    inserted_count = 0
    
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
        wh_id = warehouse_map.get(b_name, default_wh["id"])
        
        raw_material = {
            "id": generate_id(),
            "company_id": company_id,
            "warehouse_id": wh_id,
            "sku": sku,
            "name": name,
            "unit_measure": "Unidad", # Por defecto
            "cost_per_unit": cost,
            "stock_current": stock,
            "stock_min": stock_min,
            "expiry_date": expiry,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.raw_materials.insert_one(raw_material)
        inserted_count += 1
        
    print(f"Completado! {inserted_count} materias primas importadas exitosamente a produccion.")

if __name__ == "__main__":
    asyncio.run(main())
