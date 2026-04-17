import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def setup_indexes():
    """
    Create essential MongoDB indexes for performance optimization.
    """
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    
    if not mongo_url or not db_name:
        print("Error: MONGO_URL or DB_NAME not set in environment.")
        return

    print(f"Connecting to MongoDB at {mongo_url}...")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    print("Setting up indexes...")
    
    # Users collection
    print("- Users collection")
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.users.create_index("company_id")
    
    # Companies collection
    print("- Companies collection")
    await db.companies.create_index("id", unique=True)
    
    # Products collection
    print("- Products collection")
    await db.products.create_index("id", unique=True)
    await db.products.create_index("company_id")
    await db.products.create_index("sku")
    
    # Cash shifts collection
    print("- Cash shifts collection")
    await db.cash_shifts.create_index("id", unique=True)
    await db.cash_shifts.create_index([("company_id", 1), ("status", 1)])
    
    # Sales collection
    print("- Sales collection")
    await db.sales.create_index("id", unique=True)
    await db.sales.create_index("company_id")
    await db.sales.create_index("shift_id")
    await db.sales.create_index("created_at")
    
    # Sale items collection (often queried for reports)
    print("- Sale items collection")
    await db.sale_items.create_index("company_id")
    await db.sale_items.create_index("sale_id")
    await db.sale_items.create_index("created_at")
    await db.sale_items.create_index("product_id")
    
    # Customers collection
    print("- Customers collection")
    await db.customers.create_index("id", unique=True)
    await db.customers.create_index("company_id")
    await db.customers.create_index("email")
    
    # Employees collection
    print("- Employees collection")
    await db.employees.create_index("id", unique=True)
    await db.employees.create_index("company_id")
    await db.employees.create_index("document")
    
    # Production orders collection
    print("- Production orders collection")
    await db.production_orders.create_index("id", unique=True)
    await db.production_orders.create_index("company_id")
    await db.production_orders.create_index("recipe_id")
    
    # Raw materials collection
    print("- Raw materials collection")
    await db.raw_materials.create_index("id", unique=True)
    await db.raw_materials.create_index("company_id")
    
    # Recipes collection
    print("- Recipes collection")
    await db.recipes.create_index("id", unique=True)
    await db.recipes.create_index("company_id")
    
    # Payroll collection
    print("- Payroll collection")
    await db.payroll.create_index("id", unique=True)
    await db.payroll.create_index("company_id")
    await db.payroll.create_index("employee_id")
    
    # Transactions collection
    print("- Transactions collection")
    await db.transactions.create_index("id", unique=True)
    await db.transactions.create_index("company_id")

    print("Indexes created successfully!")
    client.close()

if __name__ == "__main__":
    asyncio.run(setup_indexes())
