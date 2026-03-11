# AccuCloud Pro 2026 - Documentación Técnica Completa

## 📋 Índice
1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Estructura del Proyecto](#estructura-del-proyecto)
5. [Configuración del Entorno](#configuración-del-entorno)
6. [Base de Datos - Modelos](#base-de-datos---modelos)
7. [API Endpoints](#api-endpoints)
8. [Frontend - Componentes](#frontend---componentes)
9. [Autenticación y Seguridad](#autenticación-y-seguridad)
10. [Integraciones Externas](#integraciones-externas)
11. [Guía de Despliegue](#guía-de-despliegue)

---

## 📝 Descripción General

**AccuCloud Pro 2026** es un Sistema ERP Industrial (SaaS) diseñado para empresas de producción y farmacéuticas. Incluye gestión de inventario, ventas TPV, producción industrial, nómina, finanzas y reportes.

### Características Principales:
- ✅ Multi-tenant (filtrado por `company_id`)
- ✅ Autenticación JWT con roles
- ✅ Modo oscuro
- ✅ Diseño responsive premium
- ✅ Envío de correos transaccionales (Brevo)
- ✅ Upload de imágenes (productos y perfil)

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                    React + TailwindCSS                       │
│                      Puerto: 3000                            │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP/REST
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│                   FastAPI (Python)                           │
│                      Puerto: 8001                            │
│                    Prefijo: /api                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATABASE                               │
│                       MongoDB                                │
│                    Puerto: 27017                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Stack Tecnológico

### Backend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Python | 3.11+ | Lenguaje principal |
| FastAPI | 0.109+ | Framework API REST |
| Motor | 3.3+ | Driver async MongoDB |
| PyJWT | 2.8+ | Tokens JWT |
| Passlib | 1.7+ | Hash de contraseñas (bcrypt) |
| sib-api-v3-sdk | 7.6+ | Envío de emails (Brevo) |
| aiofiles | 25.1+ | Manejo async de archivos |
| python-multipart | 0.0.22 | Upload de archivos |

### Frontend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 18+ | Framework UI |
| React Router | 6+ | Enrutamiento SPA |
| Axios | 1.6+ | Cliente HTTP |
| TailwindCSS | 3+ | Estilos CSS |
| Shadcn/UI | - | Componentes UI |
| Recharts | 2+ | Gráficos |
| Lucide React | - | Iconos |
| Sonner | - | Notificaciones toast |

### Base de Datos
| Tecnología | Propósito |
|------------|-----------|
| MongoDB | Base de datos NoSQL |

---

## 📁 Estructura del Proyecto

```
/app/
├── backend/
│   ├── server.py           # API principal (FastAPI)
│   ├── utils.py            # Utilidades (email, HTML templates)
│   ├── requirements.txt    # Dependencias Python
│   ├── uploads/            # Archivos subidos (imágenes)
│   └── .env                # Variables de entorno
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/         # Componentes Shadcn/UI
│   │   │   ├── Layout.js   # Layout principal
│   │   │   └── Sidebar.js  # Menú lateral
│   │   │
│   │   ├── pages/
│   │   │   ├── LoginPage.js      # Autenticación
│   │   │   ├── Dashboard.js      # Panel principal
│   │   │   ├── SalesTPV.js       # Terminal punto de venta
│   │   │   ├── Inventory.js      # Gestión de inventario
│   │   │   ├── Production.js     # Producción industrial
│   │   │   ├── Payroll.js        # Nómina y empleados
│   │   │   ├── Finance.js        # Finanzas
│   │   │   ├── Reports.js        # Panel de reportes
│   │   │   ├── UserManagement.js # Gestión de usuarios
│   │   │   └── Settings.js       # Configuración
│   │   │
│   │   ├── App.js          # Componente raíz + rutas
│   │   ├── index.js        # Punto de entrada
│   │   └── index.css       # Estilos globales
│   │
│   ├── public/
│   ├── package.json
│   ├── tailwind.config.js
│   └── .env
│
├── scripts/
│   ├── seed_data.py        # Datos de prueba
│   └── seed_production.py  # Datos de producción
│
└── memory/
    └── PRD.md              # Documento de requisitos
```

---

## ⚙️ Configuración del Entorno

### Backend (.env)
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="*"
JWT_SECRET_KEY="tu-clave-secreta-cambiar-en-produccion"
SENDER_EMAIL="noreply@tudominio.com"
BREVO_API_KEY="tu-api-key-de-brevo"
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## 📊 Base de Datos - Modelos

### Users (usuarios)
```javascript
{
  id: string,              // UUID
  email: string,           // Único
  password: string,        // Hash bcrypt
  name: string,
  company_id: string,      // Multi-tenant
  role: "admin" | "user" | "bodeguero" | "operario",
  permissions: string[],   // ["dashboard", "sales", "inventory", ...]
  phone?: string,
  address?: string,
  profile_image?: string,  // URL de imagen
  created_at: datetime
}
```

### Products (productos)
```javascript
{
  id: string,
  company_id: string,
  sku: string,             // Código único
  name: string,
  expiry_date?: string,    // Fecha vencimiento
  cost_buy: number,        // Costo compra
  cost_sell: number,       // Precio venta
  stock_min: number,       // Stock mínimo
  stock_current: number,   // Stock actual
  image_url?: string,      // URL imagen producto
  profit_percentage: number, // Calculado
  created_at: datetime
}
```

### Sales (ventas)
```javascript
{
  id: string,
  company_id: string,
  shift_id: string,        // Turno de caja
  user_id: string,
  total: number,
  payment_method: "efectivo" | "tarjeta" | "transferencia",
  amount_paid?: number,    // Monto pagado (efectivo)
  change?: number,         // Cambio
  requires_invoice: boolean,
  customer_email?: string,
  created_at: datetime
}
```

### Employees (empleados)
```javascript
{
  id: string,
  company_id: string,
  document: string,        // Cédula/NIT
  name: string,
  email?: string,
  base_salary: number,     // Salario mensual
  daily_rate: number,      // Calculado (base/30)
  start_date: string,
  eps: string,             // EPS
  arl: string,             // ARL
  pension: string,         // Fondo pensión
  status: "active" | "inactive",
  created_at: datetime
}
```

### Payroll (liquidaciones nómina)
```javascript
{
  id: string,
  company_id: string,
  employee_id: string,
  employee_name: string,
  days_worked: number,
  extra_hours: number,
  base_salary: number,
  extra_hours_pay: number,
  transport_subsidy: number,  // $200,000 si salario <= $3,501,810
  health_deduction: number,   // 4%
  pension_deduction: number,  // 4%
  arl_deduction: number,      // 0.522%
  total_deductions: number,
  net_salary: number,         // A pagar al empleado
  employer_health: number,    // 8.5%
  employer_pension: number,   // 12%
  employer_arl: number,       // 0.522%
  employer_total_cost: number, // Costo total empresa
  created_at: datetime
}
```

### CashShifts (turnos de caja)
```javascript
{
  id: string,
  company_id: string,
  user_id: string,
  initial_amount: number,  // Monto inicial
  status: "open" | "closed",
  opened_at: datetime,
  closed_at?: datetime,
  summary?: {
    total_sales: number,
    num_transactions: number,
    total_cash: number,
    total_card: number,
    total_transfer: number,
    expected_cash_in_register: number
  }
}
```

### Recipes (recetas/kits de producción)
```javascript
{
  id: string,
  company_id: string,
  name: string,
  description?: string,
  ingredients: [
    {
      raw_material_id: string,
      raw_material_name: string,
      quantity: number
    }
  ],
  output_quantity: number,
  created_at: datetime
}
```

### ProductionOrders (órdenes de producción)
```javascript
{
  id: string,
  company_id: string,
  recipe_id: string,
  recipe_name: string,
  quantity: number,
  status: "montada" | "alistada" | "procesada" | "terminada",
  stage: number,           // 1-4
  notes?: string,
  created_at: datetime,
  updated_at: datetime
}
```

---

## 🔌 API Endpoints

### Autenticación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/register` | Registrar usuario |
| GET | `/api/auth/me` | Obtener usuario actual |
| PUT | `/api/auth/me` | Actualizar perfil |

### Dashboard
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Métricas generales |

### Productos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/products` | Listar productos |
| POST | `/api/products` | Crear producto |
| PUT | `/api/products/{id}` | Actualizar producto |
| DELETE | `/api/products/{id}` | Eliminar producto |

### Ventas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/sales` | Listar ventas |
| POST | `/api/sales` | Crear venta |
| GET | `/api/sales/today-summary` | Resumen del día |
| GET | `/api/sales/by-date/{date}` | Ventas por fecha |

### Caja Registradora
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/cash-shifts/current` | Turno actual |
| POST | `/api/cash-shifts` | Abrir turno |
| POST | `/api/cash-shifts/{id}/close-with-summary` | Cerrar turno |
| GET | `/api/cash-shifts/history` | Historial de turnos |

### Empleados
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/employees` | Listar empleados |
| POST | `/api/employees` | Crear empleado |
| DELETE | `/api/employees/{id}` | Eliminar empleado |

### Nómina
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/payroll` | Listar liquidaciones |
| POST | `/api/payroll/liquidate` | Liquidar nómina |

### Producción
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/recipes` | Listar recetas |
| POST | `/api/recipes` | Crear receta |
| GET | `/api/production-orders` | Listar órdenes |
| POST | `/api/production-orders` | Crear orden |
| PUT | `/api/production-orders/{id}/advance` | Avanzar etapa |

### Materias Primas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/raw-materials` | Listar materias primas |
| POST | `/api/raw-materials` | Crear materia prima |
| PUT | `/api/raw-materials/{id}` | Actualizar stock |

### Gestión de Usuarios (Admin)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/users/company` | Listar usuarios empresa |
| POST | `/api/users/company` | Crear usuario |
| PUT | `/api/users/company/{id}` | Actualizar usuario |
| DELETE | `/api/users/company/{id}` | Eliminar usuario |

### Uploads
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/upload/product-image/{id}` | Subir imagen producto |
| POST | `/api/upload/profile-image` | Subir foto perfil |

---

## 🖥️ Frontend - Componentes

### Páginas Principales

| Componente | Ruta | Descripción |
|------------|------|-------------|
| `LoginPage` | `/login` | Autenticación |
| `Dashboard` | `/` | Panel principal con métricas |
| `SalesTPV` | `/sales` | Terminal punto de venta |
| `Inventory` | `/inventory` | Gestión de productos |
| `Production` | `/production` | Órdenes de producción |
| `Payroll` | `/payroll` | Empleados y nómina |
| `Finance` | `/finance` | Transacciones financieras |
| `Reports` | `/reports` | Gráficos y reportes |
| `UserManagement` | `/users` | Gestión usuarios (admin) |
| `Settings` | `/settings` | Configuración perfil |

### Componentes UI (Shadcn/UI)
Ubicados en `/frontend/src/components/ui/`:
- Button, Card, Input, Label
- Dialog, Select, Tabs
- Switch, Checkbox, Progress
- Toast (Sonner)

---

## 🔐 Autenticación y Seguridad

### JWT Token
```javascript
{
  "user_id": "uuid",
  "company_id": "uuid",
  "email": "user@email.com",
  "role": "admin",
  "exp": 1234567890
}
```

### Roles y Permisos
| Rol | Permisos |
|-----|----------|
| `admin` | Acceso total + Gestión usuarios |
| `user` | Según permisos asignados |
| `bodeguero` | Inventario, Producción |
| `operario` | Producción |

### Middleware de Autenticación
```python
async def get_current_user(credentials: HTTPAuthorizationCredentials):
    # Decodifica JWT y retorna usuario
    
async def require_admin(current_user: dict):
    # Verifica rol admin
```

---

## 📧 Integraciones Externas

### Brevo (Email)
- **SDK**: sib-api-v3-sdk
- **Uso**: Facturas electrónicas, comprobantes nómina
- **Configuración**: `BREVO_API_KEY` en .env

```python
# Ejemplo de uso
await send_email_async(
    to_email="cliente@email.com",
    subject="Factura #12345",
    html_content="<html>...</html>"
)
```

---

## 🚀 Guía de Despliegue

### Requisitos
- Python 3.11+
- Node.js 18+
- MongoDB 6+

### Instalación Local

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd accucloud-pro

# 2. Backend
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
cp .env.example .env
# Editar .env con tus credenciales

# 3. Frontend
cd ../frontend
yarn install
cp .env.example .env
# Editar .env

# 4. Iniciar servicios
# Terminal 1 - MongoDB
mongod

# Terminal 2 - Backend
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Terminal 3 - Frontend
cd frontend
yarn start
```

### Variables de Entorno Producción
```env
# Backend
MONGO_URL="mongodb+srv://user:pass@cluster.mongodb.net/dbname"
JWT_SECRET_KEY="clave-secreta-muy-larga-y-segura"
BREVO_API_KEY="tu-api-key"
SENDER_EMAIL="noreply@tudominio.com"

# Frontend
REACT_APP_BACKEND_URL="https://api.tudominio.com"
```

---

## 👤 Credenciales de Prueba

```
Email: admin@demo.com
Password: Demo2026!

Email: admin@accucloud.pro
Password: AccuCloudPro2026!
```

---

## 📞 Soporte

- **WhatsApp**: +57 315 802 2191
- **Email**: soporte@accucloud.pro

---

## 📄 Licencia

Propiedad de AccuCloud Pro 2026. Todos los derechos reservados.
