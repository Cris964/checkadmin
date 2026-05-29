import asyncio
import motor.motor_asyncio
import os
from dotenv import load_dotenv

async def main():
    load_dotenv()
    mongo_url = os.environ.get('MONGO_URL')
    client = motor.motor_asyncio.AsyncIOMotorClient(mongo_url)
    db = client['checkadmin_prod']
    company_id = '1f275bb6-b236-4791-9f14-35fe997e2536'
    
    result = await db.raw_materials.update_many(
        {'company_id': company_id},
        {
            '$rename': {
                'stock_current': 'current_stock',
                'stock_min': 'min_stock',
                'unit_measure': 'unit',
                'expiry_date': 'vencimiento'
            },
            '$set': {
                'purchase_price': 0.0,
                'purchase_quantity': 1.0,
                'purchase_unit_measure': 'Unidad'
            }
        }
    )
    print("Modified count:", result.modified_count)

if __name__ == '__main__':
    asyncio.run(main())
