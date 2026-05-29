import asyncio
import os
import pandas as pd
import io
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load env
load_dotenv(r"c:\Users\keine\.gemini\antigravity\scratch\checkadmin\backend\.env")

async def force_import_imperio():
    # Production Constants
    user_email = "labimperio@chekadmin.com"
    db_name = "checkadmin_prod"
    file_path = r"C:\Users\keine\Downloads\alimenticios  plantilla_inventario.xlsx"
    
    # 1. Connect to mongo
    mongo_url = os.environ.get('MONGO_URL')
    print(f"Connecting to MongoDB Cluster / Database: {db_name}...")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # 2. Get user's company_id
    user = await db.users.find_one({"email": user_email})
    if not user:
        print(f"ERROR: User {user_email} not found in checkadmin_prod!")
        return
        
    company_id = user.get("company_id")
    print(f"Found Company ID: {company_id} for user {user_email}")
    
    # 3. Get existing warehouses
    warehouses = await db.warehouses.find({"company_id": company_id}).to_list(1000)
    wh_name_map = {str(wh['name']).strip().lower(): wh['id'] for wh in warehouses}
    print(f"Existing warehouses: {wh_name_map}")
    
    # 4. Read Excel
    try:
        df = pd.read_excel(file_path)
    except Exception as e:
        print(f"ERROR reading Excel: {e}")
        return

    # Normalize columns
    df.columns = [str(c).strip().lower() for c in df.columns]
    
    # Map essential columns
    col_map = {
        'sku': ['sku', 'codigo', 'código'],
        'nombre': ['nombre', 'name', 'producto'],
        'costo_compra': ['costo compra', 'cost_buy', 'costo de compra', 'costo'],
        'costo_venta': ['costo venta', 'cost_sell', 'costo de venta', 'precio'],
        'stock_current': ['stock actual', 'stock_current', 'cantidad'],
        'stock_min': ['stock minimo', 'stock_min', 'minimo'],
        'bodega': ['bodega', 'warehouse', 'almacen']
    }
    
    def get_col_value(row, possible_names, default=None):
        for name in possible_names:
            if name in row and pd.notna(row[name]):
                return row[name]
        return default
        
    imported = 0
    updated = 0
    wh_created = 0
    errors = 0
    
    for index, row in df.iterrows():
        try:
            sku = str(get_col_value(row, col_map['sku'], '')).strip()
            name = str(get_col_value(row, col_map['nombre'], '')).strip()
            
            if not sku or not name or name == 'nan':
                continue
                
            wh_name_input = str(get_col_value(row, col_map['bodega'], '')).strip()
            wh_key = wh_name_input.lower()
            
            # Auto-create warehouse if it doesn't exist
            if wh_name_input and wh_key not in wh_name_map:
                print(f"Warehouse '{wh_name_input}' not found. Creating it...")
                new_wh_id = str(uuid.uuid4())
                await db.warehouses.insert_one({
                    "id": new_wh_id,
                    "name": wh_name_input,
                    "location": "Principal",
                    "company_id": company_id,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                wh_name_map[wh_key] = new_wh_id
                wh_created += 1
            
            warehouse_id = wh_name_map.get(wh_key)
            
            # Extract numbers safely
            cost_buy = float(str(get_col_value(row, col_map['costo_compra'], 0)).replace(',', ''))
            cost_sell = float(str(get_col_value(row, col_map['costo_venta'], 0)).replace(',', ''))
            stock_cur = int(get_col_value(row, col_map['stock_current'], 0))
            stock_min = int(get_col_value(row, col_map['stock_min'], 0))
            
            product_data = {
                "sku": sku,
                "name": name,
                "cost_buy": cost_buy,
                "cost_sell": cost_sell,
                "stock_current": stock_cur,
                "stock_min": stock_min,
                "expiry_date": str(row.get('fecha vencimiento', '')) if 'fecha vencimiento' in row and pd.notna(row['fecha vencimiento']) else None,
                "warehouse_id": warehouse_id,
                "company_id": company_id
            }
            
            # Profit
            if product_data['cost_buy'] > 0:
                product_data['profit_percentage'] = ((product_data['cost_sell'] - product_data['cost_buy']) / product_data['cost_buy']) * 100
            else:
                product_data['profit_percentage'] = 0.0
                
            # Upsert
            existing = await db.products.find_one({"sku": sku, "company_id": company_id})
            if existing:
                await db.products.update_one(
                    {"id": existing['id']},
                    {"$set": product_data}
                )
                updated += 1
            else:
                product_data["id"] = str(uuid.uuid4())
                product_data["created_at"] = datetime.now(timezone.utc).isoformat()
                await db.products.insert_one(product_data)
                imported += 1
                
        except Exception as e:
            print(f"Error in row {index+2}: {e}")
            errors += 1
            
    print(f"\n--- IMPORT SUMMARY (Lab Imperio) ---")
    print(f"Warehouses Created: {wh_created}")
    print(f"Successfully Imported: {imported}")
    print(f"Successfully Updated: {updated}")
    print(f"Rows with errors: {errors}")
    print(f"------------------------------------")

if __name__ == "__main__":
    asyncio.run(force_import_imperio())
