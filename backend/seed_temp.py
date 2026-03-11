import os
from dotenv import load_dotenv
from pymongo import MongoClient
from passlib.context import CryptContext
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

pwd = CryptContext(schemes=['bcrypt'])
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'accucloud_pro_2026')

client = MongoClient(mongo_url)
db = client[db_name]

# Crear empresa
company_id = str(uuid.uuid4())

# Crear admin
user = {
    'id': str(uuid.uuid4()),
    'email': 'admin@demo.com',
    'password': pwd.hash('Demo2026!'),
    'name': 'Admin Demo',
    'company_id': company_id,
    'role': 'admin',
    'permissions': ['dashboard','sales','inventory','production','payroll','finance','settings'],
    'created_at': datetime.now(timezone.utc).isoformat()
}

if not db.users.find_one({'email': 'admin@demo.com'}):
    db.users.insert_one(user)
    print('Usuario admin@demo.com creado!')
else:
    print('Usuario admin@demo.com ya existe.')
