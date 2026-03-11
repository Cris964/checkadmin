# AccuCloud Pro 2026 - Guía de Instalación Rápida

## 🚀 Inicio Rápido

### 1. Requisitos Previos
- Python 3.11+
- Node.js 18+
- MongoDB 6+ (local o Atlas)
- Git

### 2. Clonar y Configurar

```bash
# Clonar
git clone <tu-repositorio>
cd accucloud-pro

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Crear .env
cat > .env << EOF
MONGO_URL="mongodb://localhost:27017"
DB_NAME="accucloud_pro"
CORS_ORIGINS="*"
JWT_SECRET_KEY="cambia-esta-clave-en-produccion-12345"
SENDER_EMAIL="noreply@tudominio.com"
BREVO_API_KEY="tu-api-key-de-brevo"
EOF

# Frontend
cd ../frontend
yarn install

# Crear .env
echo 'REACT_APP_BACKEND_URL=http://localhost:8001' > .env
```

### 3. Iniciar Servicios

```bash
# Terminal 1 - Backend
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2 - Frontend
cd frontend
yarn start
```

### 4. Crear Usuario Admin

```bash
cd backend
python -c "
from pymongo import MongoClient
from passlib.context import CryptContext
import uuid
from datetime import datetime, timezone

pwd = CryptContext(schemes=['bcrypt'])
client = MongoClient('mongodb://localhost:27017')
db = client['accucloud_pro']

# Crear empresa
company_id = str(uuid.uuid4())

# Crear admin
db.users.insert_one({
    'id': str(uuid.uuid4()),
    'email': 'admin@tuempresa.com',
    'password': pwd.hash('TuPassword123!'),
    'name': 'Administrador',
    'company_id': company_id,
    'role': 'admin',
    'permissions': ['dashboard','sales','inventory','production','payroll','finance','settings'],
    'created_at': datetime.now(timezone.utc).isoformat()
})
print('Usuario admin creado!')
print('Email: admin@tuempresa.com')
print('Password: TuPassword123!')
"
```

### 5. Acceder
- Frontend: http://localhost:3000
- API Docs: http://localhost:8001/docs

---

## 📦 Dependencias Principales

### Backend (requirements.txt)
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
motor==3.3.2
pymongo==4.6.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.0
python-multipart==0.0.22
aiofiles==25.1.0
sib-api-v3-sdk==7.6.0
pydantic==2.5.3
pydantic-settings==2.1.0
```

### Frontend (package.json principales)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "axios": "^1.6.0",
    "recharts": "^2.10.0",
    "lucide-react": "^0.294.0",
    "sonner": "^1.3.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-select": "^2.0.0",
    "tailwindcss": "^3.4.0"
  }
}
```

---

## 🔧 Comandos Útiles

```bash
# Poblar base de datos con datos de prueba
cd backend
python scripts/seed_data.py

# Limpiar base de datos
python -c "from pymongo import MongoClient; MongoClient()['accucloud_pro'].drop()"

# Ver logs
tail -f /var/log/supervisor/backend.err.log

# Reiniciar servicios (si usas supervisor)
sudo supervisorctl restart backend frontend
```

---

## 🌐 Despliegue en Producción

### Opción 1: VPS (DigitalOcean, AWS EC2, etc.)
1. Instalar Nginx como reverse proxy
2. Usar PM2 o Supervisor para procesos
3. Configurar SSL con Let's Encrypt
4. Usar MongoDB Atlas para la base de datos

### Opción 2: Plataformas PaaS
- **Backend**: Railway, Render, Fly.io
- **Frontend**: Vercel, Netlify
- **Database**: MongoDB Atlas

### Nginx Config Ejemplo
```nginx
server {
    listen 80;
    server_name api.tudominio.com;

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name app.tudominio.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}
```

---

## ❓ Solución de Problemas

### Error: "MongoDB connection failed"
- Verificar que MongoDB esté corriendo
- Verificar MONGO_URL en .env

### Error: "JWT token invalid"
- Limpiar localStorage del navegador
- Verificar JWT_SECRET_KEY en .env

### Error: "CORS blocked"
- Verificar CORS_ORIGINS en backend/.env
- Verificar REACT_APP_BACKEND_URL en frontend/.env

### Emails no llegan
- Verificar BREVO_API_KEY
- Verificar dominio de envío en Brevo
