from pymongo import MongoClient
from passlib.context import CryptContext
import uuid
from datetime import datetime, timezone

pwd = CryptContext(schemes=['bcrypt'])
# URL de Atlas para asegurar acceso inmediato
uri = 'mongodb+srv://accucloud_user:AccuCloud2026@cluster0.demo.mongodb.net/?retryWrites=true&w=majority'
client = MongoClient(uri)
db = client['accucloud_pro_demo']

# Crear empresa
company_id = str(uuid.uuid4())

# Datos del usuario admin
email = 'admin@demo.com'
password_plain = 'Demo2026!'

user = {
    'id': str(uuid.uuid4()),
    'email': email,
    'password': pwd.hash(password_plain),
    'name': 'Administrador Demo',
    'company_id': company_id,
    'role': 'admin',
    'permissions': ['dashboard','sales','inventory','production','payroll','finance','settings'],
    'created_at': datetime.now(timezone.utc).isoformat()
}

if not db.users.find_one({'email': email}):
    db.users.insert_one(user)
    print(f'USUARIO_CREADO: {email}')
else:
    print(f'USUARIO_EXISTENTE: {email}')
