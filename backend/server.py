from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import aiofiles
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import uuid
import mercadopago
from utils import generate_invoice_html, generate_payroll_html, send_email_async

ROOT_DIR = Path(__file__).parent
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
try:
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=2000)
    db = client[os.environ['DB_NAME']]
    # We'll check the connection lazily
except Exception:
    db = None

class MockCursor:
    def __init__(self, data):
        self.items = data
    def sort(self, *args, **kwargs):
        return self
    async def to_list(self, length):
        return self.items[:length]

class MockResult:
    def __init__(self, deleted_count=1, inserted_id="mock_id", modified_count=1):
        self.deleted_count = deleted_count
        self.inserted_id = inserted_id
        self.modified_count = modified_count

class MockCollection:
    def find(self, query=None, projection=None):
        return MockCursor([])
    async def find_one(self, query, projection=None):
        if not query: return None
        email = query.get("email") or query.get("id")
        if email in ["admin@demo.com", "admin_id", "admin@chekadmin.com"]:
            return {
                "id": "admin_id",
                "email": email if "@" in str(email) else "admin@demo.com",
                "name": "Admin Demo",
                "company_id": "company_123",
                "role": "admin",
                "password": pwd_context.hash("Admin123*"),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "permissions": ["dashboard", "sales", "inventory", "production", "payroll", "finance", "settings"]
            }
        return None
    async def insert_one(self, doc): return MockResult()
    async def update_one(self, q, u, upsert=False): return MockResult()
    async def delete_one(self, q): return MockResult()
    async def count_documents(self, query): return 0
    def aggregate(self, pipeline): return MockCursor([])

class MockDB:
    def __init__(self):
        self.users = MockCollection()
        self.companies = MockCollection()
        self.products = MockCollection()
        self.production_orders = MockCollection()
        self.employees = MockCollection()
        self.payroll = MockCollection()
        self.cash_shifts = MockCollection()
        self.sales = MockCollection()
        self.sale_items = MockCollection()
        self.warehouses = MockCollection()
        self.raw_materials = MockCollection()
        self.recipes = MockCollection()
        self.customers = MockCollection()
        self.transactions = MockCollection()
        self.password_resets = MockCollection()

mock_db = MockDB()

def get_db():
    return db if db is not None else mock_db

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

@app.middleware("http")
async def demo_user_readonly_middleware(request: Request, call_next):
    if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
        if request.url.path not in ["/api/auth/login", "/api/auth/register"]:
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                try:
                    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                    if payload.get("email") == "admin@demo.com":
                        return JSONResponse(
                            status_code=403,
                            content={"detail": "Acción no permitida en la versión de prueba."}
                        )
                except Exception:
                    pass
    return await call_next(request)

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "accucloud-pro-2026-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

# Mercado Pago configuration
MP_ACCESS_TOKEN = os.environ.get("MP_ACCESS_TOKEN", "TEST-YOUR-TOKEN-HERE")
mp_sdk = mercadopago.SDK(MP_ACCESS_TOKEN)

# ==================== SETTINGS & CONSTANTS ====================

COLOMBIAN_DATA = {
    "eps": ["Nueva", "Sura", "Sanitas", "Compensar", "Salud Total", "Famisanar", "Coosalud", "Savia Salud", "Asmet Salud", "Mutual Ser", "Emssanar", "Capital Salud", "OTRO"],
    "arl": ["SURA", "Positiva", "Colmena", "AXA Colpatria", "Bolívar", "OTRO"],
    "pension": ["Colpensiones", "Porvenir", "Protección", "Colfondos", "Skandia", "OTRO"],
    "cesantias": ["Porvenir", "Protección", "Colfondos", "Skandia", "Fondo Nacional del Ahorro", "OTRO"],
    "contract_types": ["Término indefinido", "Término fijo", "Obra o labor", "Aprendizaje", "Prestación de servicios"],
    "banks": ["Bancolombia", "Davivienda", "Banco de Bogotá", "Banco de Occidente", "BBVA", "Scotiabank Colpatria", "Banco Caja Social", "Banco Agrario", "Banco AV Villas", "Nequi", "Daviplata", "OTRO"],
    "account_types": ["Ahorros", "Corriente"]
}

@api_router.get("/constants/colombian-data")
async def get_colombian_data():
    return COLOMBIAN_DATA

# ==================== MODELS ====================

class Company(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CompanyCreate(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    company_id: str
    role: str = "user"  # admin, user, bodeguero, operario
    permissions: List[str] = Field(default_factory=lambda: ["dashboard", "sales", "inventory", "production", "payroll", "finance", "settings"])
    phone: Optional[str] = None
    address: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    company_name: str
    role: str = "admin"

class UserCreateByAdmin(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "user"
    permissions: List[str]

class UserUpdateByAdmin(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    permissions: Optional[List[str]] = None
    password: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    photo_url: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    sku: str
    name: str
    expiry_date: Optional[str] = None
    cost_buy: float
    cost_sell: float
    stock_min: int
    stock_current: int
    profit_percentage: float = 0.0
    image_url: Optional[str] = None
    warehouse_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    sku: str
    name: str
    expiry_date: Optional[str] = None
    cost_buy: float
    cost_sell: float
    stock_min: int
    stock_current: int
    image_url: Optional[str] = None
    warehouse_id: Optional[str] = None

class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    expiry_date: Optional[str] = None
    cost_buy: Optional[float] = None
    cost_sell: Optional[float] = None
    stock_min: Optional[int] = None
    stock_current: Optional[int] = None
    image_url: Optional[str] = None
    warehouse_id: Optional[str] = None

class Warehouse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    name: str
    location: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WarehouseCreate(BaseModel):
    name: str
    location: str
    description: Optional[str] = None

class WarehouseUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None

class RecipeIngredient(BaseModel):
    raw_material_id: str
    raw_material_name: str
    quantity: float
    unit: str  # kg, g, L, ml, unidades

class Recipe(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    cliente: Optional[str] = None
    description: Optional[str] = None
    output_product_id: str
    output_product_name: str
    expected_quantity: int
    image_url: Optional[str] = None
    ingredients: List[RecipeIngredient] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RecipeCreate(BaseModel):
    cliente: Optional[str] = None
    description: Optional[str] = None
    output_product_id: str
    output_product_name: str
    expected_quantity: int
    image_url: Optional[str] = None
    ingredients: List[RecipeIngredient]

class RawMaterial(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    name: str
    sku: str
    current_stock: float
    min_stock: float
    unit: str  # kg, g, L, ml, unidades
    cost_per_unit: float
    supplier: Optional[str] = None
    lote: Optional[str] = None
    vencimiento: Optional[str] = None
    warehouse_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RawMaterialCreate(BaseModel):
    name: str
    sku: str
    current_stock: float
    min_stock: float
    unit: str
    cost_per_unit: float
    supplier: Optional[str] = None
    lote: Optional[str] = None
    vencimiento: Optional[str] = None
    warehouse_id: Optional[str] = None

class RawMaterialUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    current_stock: Optional[float] = None
    min_stock: Optional[float] = None
    unit: Optional[str] = None
    cost_per_unit: Optional[float] = None
    supplier: Optional[str] = None
    lote: Optional[str] = None
    vencimiento: Optional[str] = None
    warehouse_id: Optional[str] = None

class ProductionOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    recipe_id: str
    recipe_name: str
    stage: str = "montada"  # montada, alistamiento, procesamiento, terminada
    created_by: str
    warehouse_person: Optional[str] = None
    operator_person: Optional[str] = None
    quantity: int = 1
    actual_output: Optional[int] = None
    observations: Optional[str] = None
    novedades: Optional[str] = None
    warehouse_id: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    checklist_alistamiento: List[dict] = Field(default_factory=list) # [{material_id, name, checked}]
    checklist_procesamiento: List[dict] = Field(default_factory=list) # [{task, checked}]
    responsable_alistamiento: Optional[str] = None
    responsable_procesamiento: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductionOrderCreate(BaseModel):
    recipe_id: str
    recipe_name: str
    quantity: int = 1
    warehouse_id: Optional[str] = None
    start_time: Optional[str] = None

class ProductionOrderUpdate(BaseModel):
    recipe_id: Optional[str] = None
    recipe_name: Optional[str] = None
    quantity: Optional[int] = None
    warehouse_id: Optional[str] = None
    stage: Optional[str] = None
    novedades: Optional[str] = None
    actual_output: Optional[int] = None

class ProductionOrderAdvance(BaseModel):
    next_stage: str
    checklist_alistamiento: Optional[List[dict]] = None
    checklist_procesamiento: Optional[List[dict]] = None
    responsable_alistamiento: Optional[str] = None
    responsable_procesamiento: Optional[str] = None
    novedades: Optional[str] = None
    actual_output: Optional[int] = None

class CashShift(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    user_id: str
    user_name: str
    initial_amount: float
    status: str = "open"  # open, closed
    opened_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    closed_at: Optional[datetime] = None

class CashShiftCreate(BaseModel):
    initial_amount: float

class Sale(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    shift_id: str
    user_id: str
    total: float
    payment_method: str = "efectivo"
    amount_paid: Optional[float] = None
    change: Optional[float] = None
    requires_invoice: bool = False
    customer_email: Optional[str] = None
    payment_details: Optional[dict] = None # {type: "debito/credito", franchise: "visa...", bank: "...", voucher_number: "..."}
    voucher_history: List[dict] = Field(default_factory=list) # Audit logs for voucher edits
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SaleItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    price: float
    subtotal: float

class SaleCreate(BaseModel):
    items: List[SaleItem]
    payment_method: str = "efectivo"
    amount_paid: Optional[float] = None
    requires_invoice: bool = False
    customer_email: Optional[str] = None
    payment_details: Optional[dict] = None # {type, franchise, bank, voucher_number}

class SaleVoucherUpdate(BaseModel):
    voucher_number: str
    user_name: str # For audit log

class Employee(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    document: str
    name: str
    email: Optional[EmailStr] = None
    base_salary: float
    daily_rate: float
    start_date: str
    eps: str
    arl: str
    pension: str
    cesantias: Optional[str] = None
    contract_type: str = "Término Indefinido" # Término Indefinido, Término Fijo, Obra o Labor, Aprendizaje
    deduct_health: bool = True
    deduct_pension: bool = True
    deduct_arl: bool = True
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmployeeCreate(BaseModel):
    document: str
    name: str
    email: Optional[EmailStr] = None
    base_salary: float
    start_date: str
    eps: str
    arl: str
    pension: str
    cesantias: Optional[str] = None
    contract_type: str = "Término Indefinido"
    deduct_health: bool = True
    deduct_pension: bool = True
    deduct_arl: bool = True

class PayrollLiquidation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    employee_id: str
    employee_name: str
    days_worked: int
    extra_hours: int
    daily_rate: float
    base_salary: float
    extra_hours_pay: float
    transport_subsidy: float
    health_deduction: float
    pension_deduction: float
    arl_deduction: float
    total_deductions: float
    net_salary: float
    employer_health: float
    employer_pension: float
    employer_arl: float
    employer_total_cost: float
    novedades_adicionales: float = 0.0
    observaciones_novedades: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PayrollLiquidationCreate(BaseModel):
    employee_id: str
    days_worked: int
    extra_hours: int = 0
    novedades_adicionales: float = 0.0
    observaciones_novedades: Optional[str] = None

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    type: str  # caja_menor, pago, gasto
    payment_method: str  # efectivo, tarjeta
    card_detail: Optional[str] = None
    amount: float
    description: str
    category: Optional[str] = None  # fijo, variable
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransactionCreate(BaseModel):
    type: str
    payment_method: str
    card_detail: Optional[str] = None
    amount: float
    description: str
    category: Optional[str] = None  # fijo, variable

# ==================== CUSTOMER MODEL ====================

class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    document: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    document: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    document: Optional[str] = None

# ==================== EMAIL REQUEST MODELS ====================

class PayrollEmailRequest(BaseModel):
    email: str
    liquidation: dict
    employee: dict

class InvoiceEmailRequest(BaseModel):
    email: str
    sale: dict
    items: list

class PaymentPreferenceCreate(BaseModel):
    items: List[SaleItem]
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None


# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        company_id: str = payload.get("company_id")
        role: str = payload.get("role", "user")
        email: str = payload.get("email")
        if user_id is None or company_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"user_id": user_id, "company_id": company_id, "email": email, "role": role}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_superadmin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("email") != "admin@chekadmin.com":
        raise HTTPException(status_code=403, detail="Requiere permisos de superadministrador")
    return current_user

# ==================== SUPERADMIN ====================

@api_router.get("/superadmin/companies")
async def get_all_companies(current_user: dict = Depends(get_superadmin_user)):
    database = get_db()
    companies = await database.companies.find({}, {"_id": 0}).to_list(1000)
    for c in companies:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
    return companies

@api_router.get("/superadmin/users")
async def get_all_users(current_user: dict = Depends(get_superadmin_user)):
    database = get_db()
    users = await database.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    for u in users:
        if isinstance(u.get('created_at'), str):
            u['created_at'] = datetime.fromisoformat(u['created_at'])
    return users

# ==================== ROUTES ====================

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    database = get_db()
    # Check if user exists
    existing_user = await database.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create company
    company_dict = Company(name=user_data.company_name).model_dump()
    company_dict['created_at'] = company_dict['created_at'].isoformat()
    await database.companies.insert_one(company_dict)
    
    # Create user
    hashed_pwd = hash_password(user_data.password)
    user = User(
        email=user_data.email,
        name=user_data.name,
        company_id=company_dict['id'],
        role=user_data.role
    )
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    user_dict['password'] = hashed_pwd
    await database.users.insert_one(user_dict)
    
    # Create token
    token = create_access_token({
        "user_id": user.id,
        "company_id": user.company_id,
        "email": user.email,
        "role": user.role
    })
    
    return Token(access_token=token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    database = get_db()
    try:
        user_dict = await database.users.find_one({"email": credentials.email}, {"_id": 0})
    except Exception:
        user_dict = await mock_db.users.find_one({"email": credentials.email}, {"_id": 0})

    if not user_dict or not verify_password(credentials.password, user_dict['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_dict.pop('password')
    if isinstance(user_dict['created_at'], str):
        user_dict['created_at'] = datetime.fromisoformat(user_dict['created_at'])
    user = User(**user_dict)
    
    token = create_access_token({
        "user_id": user.id,
        "company_id": user.company_id,
        "email": user.email,
        "role": user.role
    })
    
    return Token(access_token=token, token_type="bearer", user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    database = get_db()
    try:
        user_dict = await database.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "password": 0})
    except Exception:
        user_dict = await mock_db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "password": 0})
        
    if not user_dict:
        raise HTTPException(status_code=404, detail="User not found")
    if isinstance(user_dict['created_at'], str):
        user_dict['created_at'] = datetime.fromisoformat(user_dict['created_at'])
    return User(**user_dict)

@api_router.put("/auth/me", response_model=User)
async def update_me(update_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    update_fields = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if update_fields:
        await db.users.update_one(
            {"id": current_user["user_id"]},
            {"$set": update_fields}
        )
    user_dict = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "password": 0})
    if isinstance(user_dict['created_at'], str):
        user_dict['created_at'] = datetime.fromisoformat(user_dict['created_at'])
    return User(**user_dict)

@api_router.post("/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    database = get_db()
    user = await database.users.find_one({"email": req.email})
    if not user:
        # We don't want to reveal if a user exists, but for this demo/app we might just return success
        return {"message": "Si el correo está registrado, recibirás un código."}
    
    # Generate 6-digit code
    import random
    code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    expiry = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    # Save code to DB
    database = get_db()
    await database.password_resets.update_one(
        {"email": req.email},
        {"$set": {"code": code, "expiry": expiry.isoformat()}},
        upsert=True
    )
    
    # Send email
    html_content = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #4F46E5;">Recuperación de Contraseña</h2>
        <p>Has solicitado restablecer tu contraseña en CheckAdmin.</p>
        <p>Tu código de verificación es:</p>
        <div style="background: #f3f4f6; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; border-radius: 8px;">
            {code}
        </div>
        <p>Este código vencerá en 15 minutos.</p>
        <p>Si no solicitaste esto, puedes ignorar este correo.</p>
    </div>
    """
    await send_email_async(req.email, "Código de Recuperación - CheckAdmin", html_content)
    
    return {"message": "Código enviado con éxito"}

@api_router.post("/auth/reset-password")
async def reset_password(req: ResetPasswordRequest):
    database = get_db()
    reset_doc = await database.password_resets.find_one({"email": req.email})
    if not reset_doc or reset_doc['code'] != req.code:
        raise HTTPException(status_code=400, detail="Código inválido.")
    
    expiry = datetime.fromisoformat(reset_doc['expiry'])
    if datetime.now(timezone.utc) > expiry.replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=400, detail="El código ha vencido.")
    
    # Update password
    hashed_pwd = hash_password(req.new_password)
    await database.users.update_one({"email": req.email}, {"$set": {"password": hashed_pwd}})
    
    # Delete reset code
    await database.password_resets.delete_one({"email": req.email})
    
    return {"message": "Contraseña actualizada con éxito"}

# ==================== DASHBOARD ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    database = get_db()
    company_id = current_user["company_id"]
    
    # Total products in stock
    total_products = await database.products.count_documents({"company_id": company_id})
    
    # Production orders count
    production_orders = await database.production_orders.count_documents({"company_id": company_id})
    
    # Employees count
    employees = await database.employees.count_documents({"company_id": company_id, "status": "active"})
    
    # Current shift and total sales
    current_shift = await database.cash_shifts.find_one(
        {"company_id": company_id, "status": "open"},
        {"_id": 0}
    )
    
    total_sales = 0.0
    cash_box = 0.0
    
    if current_shift:
        sales_list = await database.sales.find(
            {"company_id": company_id, "shift_id": current_shift['id']},
            {"_id": 0}
        ).to_list(1000)
        total_sales = sum(sale['total'] for sale in sales_list)
        cash_box = current_shift['initial_amount'] + total_sales
    
    # Top 5 products
    pipeline = [
        {"$match": {"company_id": company_id}},
        {"$group": {
            "_id": "$product_id",
            "product_name": {"$first": "$product_name"},
            "total_quantity": {"$sum": "$quantity"}
        }},
        {"$sort": {"total_quantity": -1}},
        {"$limit": 5}
    ]
    top_products = await database.sale_items.aggregate(pipeline).to_list(5)
    
    # Weekly sales (last 7 days)
    weekly_sales = []
    for i in range(6, -1, -1):
        date = datetime.now(timezone.utc) - timedelta(days=i)
        date_str = date.strftime("%Y-%m-%d")
        day_sales = await database.sales.find(
            {
                "company_id": company_id,
                "created_at": {
                    "$gte": date.replace(hour=0, minute=0, second=0).isoformat(),
                    "$lt": date.replace(hour=23, minute=59, second=59).isoformat()
                }
            },
            {"_id": 0}
        ).to_list(1000)
        day_total = sum(sale['total'] for sale in day_sales)
        weekly_sales.append({
            "date": date_str,
            "day": date.strftime("%a"),
            "total": day_total
        })
    
    return {
        "total_sales": total_sales,
        "cash_box": cash_box,
        "total_products": total_products,
        "production_orders": production_orders,
        "employees": employees,
        "top_products": top_products,
        "weekly_sales": weekly_sales
    }

# ==================== PRODUCTS ====================

@api_router.get("/products", response_model=List[Product])
async def get_products(current_user: dict = Depends(get_current_user)):
    database = get_db()
    products = await database.products.find({"company_id": current_user["company_id"]}, {"_id": 0}).to_list(1000)
    for p in products:
        if isinstance(p['created_at'], str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])
    return products

@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, current_user: dict = Depends(get_current_user)):
    # Calculate profit percentage
    profit_pct = 0.0
    if product_data.cost_buy > 0:
        profit_pct = ((product_data.cost_sell - product_data.cost_buy) / product_data.cost_buy) * 100
    
    product = Product(
        company_id=current_user["company_id"],
        **product_data.model_dump(),
        profit_percentage=profit_pct
    )
    product_dict = product.model_dump()
    product_dict['created_at'] = product_dict['created_at'].isoformat()
    database = get_db()
    await database.products.insert_one(product_dict)
    return product

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_data: ProductUpdate, current_user: dict = Depends(get_current_user)):
    update_fields = product_data.model_dump(exclude_unset=True)
    
    database = get_db()
    # Recalculate profit if costs changed
    existing = await database.products.find_one({"id": product_id, "company_id": current_user["company_id"]}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    cost_buy = update_fields.get('cost_buy', existing['cost_buy'])
    cost_sell = update_fields.get('cost_sell', existing['cost_sell'])
    if cost_buy > 0:
        update_fields['profit_percentage'] = ((cost_sell - cost_buy) / cost_buy) * 100
    
    if update_fields:
        await database.products.update_one(
            {"id": product_id, "company_id": current_user["company_id"]},
            {"$set": update_fields}
        )
    
    product_dict = await database.products.find_one({"id": product_id}, {"_id": 0})
    if isinstance(product_dict['created_at'], str):
        product_dict['created_at'] = datetime.fromisoformat(product_dict['created_at'])
    return Product(**product_dict)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    database = get_db()
    result = await database.products.delete_one({"id": product_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

# ==================== WAREHOUSES ====================

@api_router.get("/warehouses", response_model=List[Warehouse])
async def get_warehouses(current_user: dict = Depends(get_current_user)):
    database = get_db()
    warehouses = await database.warehouses.find({"company_id": current_user["company_id"]}, {"_id": 0}).to_list(1000)
    for w in warehouses:
        if isinstance(w['created_at'], str):
            w['created_at'] = datetime.fromisoformat(w['created_at'])
    return warehouses

@api_router.post("/warehouses", response_model=Warehouse)
async def create_warehouse(warehouse_data: WarehouseCreate, current_user: dict = Depends(get_current_user)):
    warehouse = Warehouse(company_id=current_user["company_id"], **warehouse_data.model_dump())
    warehouse_dict = warehouse.model_dump()
    warehouse_dict['created_at'] = warehouse_dict['created_at'].isoformat()
    database = get_db()
    await database.warehouses.insert_one(warehouse_dict)
    return warehouse

@api_router.put("/warehouses/{warehouse_id}", response_model=Warehouse)
async def update_warehouse(warehouse_id: str, warehouse_data: WarehouseUpdate, current_user: dict = Depends(get_current_user)):
    update_data = warehouse_data.model_dump(exclude_unset=True)
    
    database = get_db()
    if update_data:
        await database.warehouses.update_one(
            {"id": warehouse_id, "company_id": current_user["company_id"]},
            {"$set": update_data}
        )
    
    warehouse_dict = await database.warehouses.find_one({"id": warehouse_id}, {"_id": 0})
    if not warehouse_dict:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    if isinstance(warehouse_dict['created_at'], str):
        warehouse_dict['created_at'] = datetime.fromisoformat(warehouse_dict['created_at'])
    return Warehouse(**warehouse_dict)

@api_router.get("/warehouses/{warehouse_id}/products")
async def get_warehouse_products(warehouse_id: str, current_user: dict = Depends(get_current_user)):
    database = get_db()
    products = await database.products.find(
        {"company_id": current_user["company_id"], "warehouse_id": warehouse_id},
        {"_id": 0}
    ).to_list(1000)
    for p in products:
        if isinstance(p.get('created_at'), str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])
    return products

@api_router.delete("/warehouses/{warehouse_id}")
async def delete_warehouse(warehouse_id: str, current_user: dict = Depends(get_current_user)):
    database = get_db()
    result = await database.warehouses.delete_one({"id": warehouse_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return {"message": "Warehouse deleted"}

# ==================== RAW MATERIALS ====================

@api_router.get("/raw-materials", response_model=List[RawMaterial])
async def get_raw_materials(current_user: dict = Depends(get_current_user)):
    database = get_db()
    raw_materials = await database.raw_materials.find({"company_id": current_user["company_id"]}, {"_id": 0}).to_list(1000)
    for rm in raw_materials:
        if isinstance(rm['created_at'], str):
            rm['created_at'] = datetime.fromisoformat(rm['created_at'])
    return raw_materials

@api_router.post("/raw-materials", response_model=RawMaterial)
async def create_raw_material(material_data: RawMaterialCreate, current_user: dict = Depends(get_current_user)):
    material = RawMaterial(company_id=current_user["company_id"], **material_data.model_dump())
    material_dict = material.model_dump()
    material_dict['created_at'] = material_dict['created_at'].isoformat()
    database = get_db()
    await database.raw_materials.insert_one(material_dict)
    return material

@api_router.put("/raw-materials/{material_id}", response_model=RawMaterial)
async def update_raw_material(material_id: str, material_data: RawMaterialUpdate, current_user: dict = Depends(get_current_user)):
    update_data = material_data.model_dump(exclude_unset=True)
    
    # Explicitly handle bodega (warehouse_id)
    if 'warehouse_id' in update_data and (update_data['warehouse_id'] == "" or update_data['warehouse_id'] is None):
        update_data['warehouse_id'] = None

    database = get_db()
    if update_data:
        await database.raw_materials.update_one(
            {"id": material_id, "company_id": current_user["company_id"]},
            {"$set": update_data}
        )
    
    material_dict = await database.raw_materials.find_one({"id": material_id}, {"_id": 0})
    if not material_dict:
        raise HTTPException(status_code=404, detail="Raw material not found")
    if isinstance(material_dict['created_at'], str):
        material_dict['created_at'] = datetime.fromisoformat(material_dict['created_at'])
    return RawMaterial(**material_dict)

@api_router.delete("/raw-materials/{material_id}")
async def delete_raw_material(material_id: str, current_user: dict = Depends(get_current_user)):
    database = get_db()
    result = await database.raw_materials.delete_one({"id": material_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Raw material not found")
    return {"message": "Raw material deleted"}

# ==================== RECIPES ====================

@api_router.get("/recipes", response_model=List[Recipe])
async def get_recipes(current_user: dict = Depends(get_current_user)):
    database = get_db()
    recipes = await database.recipes.find({"company_id": current_user["company_id"]}, {"_id": 0}).to_list(1000)
    for r in recipes:
        if isinstance(r.get('created_at'), str):
            r['created_at'] = datetime.fromisoformat(r['created_at'])
        if 'ingredients' not in r or r['ingredients'] is None:
            r['ingredients'] = []
        if not r.get('output_product_name'):
            # Get product name if missing
            product = await database.products.find_one({"id": r.get('output_product_id')}, {"_id": 0})
            r['output_product_name'] = product['name'] if product else "Producto Desconocido"
    return recipes

@api_router.post("/recipes", response_model=Recipe)
async def create_recipe(recipe_data: RecipeCreate, current_user: dict = Depends(get_current_user)):
    recipe = Recipe(company_id=current_user["company_id"], **recipe_data.model_dump())
    recipe_dict = recipe.model_dump()
    recipe_dict['created_at'] = recipe_dict['created_at'].isoformat()
    # Convert ingredients to dict
    recipe_dict['ingredients'] = [ing.model_dump() if hasattr(ing, 'model_dump') else ing for ing in recipe_dict['ingredients']]
    database = get_db()
    await database.recipes.insert_one(recipe_dict)
    return recipe

@api_router.put("/recipes/{recipe_id}", response_model=Recipe)
async def update_recipe(recipe_id: str, recipe_data: RecipeCreate, current_user: dict = Depends(get_current_user)):
    update_data = recipe_data.model_dump()
    update_data['ingredients'] = [ing.model_dump() if hasattr(ing, 'model_dump') else ing for ing in update_data['ingredients']]
    
    database = get_db()
    await database.recipes.update_one(
        {"id": recipe_id, "company_id": current_user["company_id"]},
        {"$set": update_data}
    )
    
    recipe_dict = await database.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not recipe_dict:
        raise HTTPException(status_code=404, detail="Recipe not found")
    if isinstance(recipe_dict['created_at'], str):
        recipe_dict['created_at'] = datetime.fromisoformat(recipe_dict['created_at'])
    return Recipe(**recipe_dict)

@api_router.delete("/recipes/{recipe_id}")
async def delete_recipe(recipe_id: str, current_user: dict = Depends(get_current_user)):
    database = get_db()
    result = await database.recipes.delete_one({"id": recipe_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return {"message": "Recipe deleted"}

# ==================== PRODUCTION ORDERS ====================

@api_router.get("/production-orders", response_model=List[ProductionOrder])
async def get_production_orders(current_user: dict = Depends(get_current_user)):
    database = get_db()
    orders = await database.production_orders.find({"company_id": current_user["company_id"]}, {"_id": 0}).to_list(1000)
    for o in orders:
        if isinstance(o.get('created_at'), str):
            o['created_at'] = datetime.fromisoformat(o['created_at'])
        if isinstance(o.get('updated_at'), str):
            o['updated_at'] = datetime.fromisoformat(o['updated_at'])
        
        # Ensure checklists exist for legacy orders
        if 'checklist_alistamiento' not in o or o['checklist_alistamiento'] is None:
            o['checklist_alistamiento'] = []
        if 'checklist_procesamiento' not in o or o['checklist_procesamiento'] is None:
            o['checklist_procesamiento'] = []
            
    return orders

@api_router.post("/production-orders", response_model=ProductionOrder)
async def create_production_order(order_data: ProductionOrderCreate, current_user: dict = Depends(get_current_user)):
    database = get_db()
    # Pre-populate checklist from recipe if available
    recipe = await database.recipes.find_one({"id": order_data.recipe_id}, {"_id": 0})
    checklist_alistamiento = []
    if recipe:
        for ing in recipe.get('ingredients', []):
            checklist_alistamiento.append({
                "material_id": ing.get('raw_material_id'),
                "name": ing.get('raw_material_name'),
                "checked": False
            })
    
    new_order = ProductionOrder(
        company_id=current_user["company_id"],
        created_by=current_user["email"],
        checklist_alistamiento=checklist_alistamiento,
        **order_data.model_dump()
    )
    order_dict = new_order.model_dump()
    order_dict['created_at'] = order_dict['created_at'].isoformat()
    order_dict['updated_at'] = order_dict['updated_at'].isoformat()
    await database.production_orders.insert_one(order_dict)
    return new_order

@api_router.put("/production-orders/{order_id}", response_model=ProductionOrder)
async def update_production_order(order_id: str, order_data: ProductionOrderUpdate, current_user: dict = Depends(get_current_user)):
    update_fields = order_data.model_dump(exclude_unset=True)
    update_fields['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    database = get_db()
    await database.production_orders.update_one(
        {"id": order_id, "company_id": current_user["company_id"]},
        {"$set": update_fields}
    )
    
    order_dict = await database.production_orders.find_one({"id": order_id}, {"_id": 0})
    if not order_dict:
        raise HTTPException(status_code=404, detail="Production order not found")
    
    if isinstance(order_dict['created_at'], str):
        order_dict['created_at'] = datetime.fromisoformat(order_dict['created_at'])
    if isinstance(order_dict['updated_at'], str):
        order_dict['updated_at'] = datetime.fromisoformat(order_dict['updated_at'])
    return ProductionOrder(**order_dict)

@api_router.post("/production-orders/{order_id}/advance", response_model=ProductionOrder)
async def advance_production_order(order_id: str, data: ProductionOrderAdvance, current_user: dict = Depends(get_current_user)):
    database = get_db()
    order = await database.production_orders.find_one({"id": order_id, "company_id": current_user["company_id"]}, {"_id": 0})
    if not order:
        # Debugging aid
        logger.warning(f"Order {order_id} not found for company {current_user['company_id']}")
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
    
    update_fields = {
        "stage": data.next_stage,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if data.checklist_alistamiento is not None:
        update_fields["checklist_alistamiento"] = data.checklist_alistamiento
    if data.checklist_procesamiento is not None:
        update_fields["checklist_procesamiento"] = data.checklist_procesamiento
    if data.responsable_alistamiento:
        update_fields["responsable_alistamiento"] = data.responsable_alistamiento
    if data.responsable_procesamiento:
        update_fields["responsable_procesamiento"] = data.responsable_procesamiento
    if data.novedades:
        update_fields["novedades"] = data.novedades
    if data.actual_output is not None:
        update_fields["actual_output"] = data.actual_output
    
    if data.next_stage == 'terminada':
        update_fields["end_time"] = datetime.now(timezone.utc).isoformat()
        
        # Update Inventory: subtract ingredients, add finished product
        recipe = await database.recipes.find_one({"id": order["recipe_id"]}, {"_id": 0})
        if recipe:
            # 1. Subtract Ingredients
            for ing in recipe.get('ingredients', []):
                qty = (ing['quantity'] * order.get('quantity', 1)) / (recipe.get('expected_quantity') or 1)
                await database.raw_materials.update_one(
                    {"id": ing['raw_material_id'], "company_id": current_user["company_id"]},
                    {"$inc": {"current_stock": -qty}}
                )
            
            # 2. Add Finished Product
            qty_to_add = data.actual_output if data.actual_output is not None else order.get('quantity', 1)
            await database.products.update_one(
                {"id": recipe['output_product_id'], "company_id": current_user["company_id"]},
                {"$inc": {"stock_current": qty_to_add}}
            )
            
    await database.production_orders.update_one(
        {"id": order_id},
        {"$set": update_fields}
    )
    
    updated_order = await database.production_orders.find_one({"id": order_id}, {"_id": 0})
    if isinstance(updated_order['created_at'], str):
        updated_order['created_at'] = datetime.fromisoformat(updated_order['created_at'])
    if isinstance(updated_order['updated_at'], str):
        updated_order['updated_at'] = datetime.fromisoformat(updated_order['updated_at'])
    return ProductionOrder(**updated_order)

# ==================== CASH SHIFTS ====================

@api_router.get("/cash-shifts/current")
async def get_current_shift(current_user: dict = Depends(get_current_user)):
    database = get_db()
    shift = await database.cash_shifts.find_one(
        {"company_id": current_user["company_id"], "status": "open"},
        {"_id": 0}
    )
    if shift and isinstance(shift['opened_at'], str):
        shift['opened_at'] = datetime.fromisoformat(shift['opened_at'])
    return shift

@api_router.post("/cash-shifts", response_model=CashShift)
async def open_cash_shift(shift_data: CashShiftCreate, current_user: dict = Depends(get_current_user)):
    database = get_db()
    # Check if there's already an open shift
    existing = await database.cash_shifts.find_one(
        {"company_id": current_user["company_id"], "status": "open"},
        {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=400, detail="There's already an open cash shift")
    
    user = await database.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    shift = CashShift(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        user_name=user['name'],
        initial_amount=shift_data.initial_amount
    )
    shift_dict = shift.model_dump()
    shift_dict['opened_at'] = shift_dict['opened_at'].isoformat()
    await database.cash_shifts.insert_one(shift_dict)
    return shift

@api_router.post("/cash-shifts/{shift_id}/close")
async def close_cash_shift(shift_id: str, current_user: dict = Depends(get_current_user)):
    database = get_db()
    await database.cash_shifts.update_one(
        {"id": shift_id, "company_id": current_user["company_id"]},
        {"$set": {"status": "closed", "closed_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Cash shift closed"}

# ==================== SALES ====================

@api_router.get("/sales", response_model=List[Sale])
async def get_sales(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"company_id": current_user["company_id"]}
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" not in query: query["created_at"] = {}
        query["created_at"]["$lte"] = end_date + "T23:59:59"
    if user_id:
        query["user_id"] = user_id
        
    database = get_db()
    sales = await database.sales.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for s in sales:
        if isinstance(s['created_at'], str):
            s['created_at'] = datetime.fromisoformat(s['created_at'])
    return sales

@api_router.put("/sales/{sale_id}/voucher")
async def update_sale_voucher(
    sale_id: str, 
    update: SaleVoucherUpdate, 
    current_user: dict = Depends(get_current_user)
):
    database = get_db()
    sale = await database.sales.find_one({"id": sale_id, "company_id": current_user["company_id"]})
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    payment_details = sale.get('payment_details') or {}
    old_voucher = payment_details.get('voucher_number', 'N/A')
    payment_details['voucher_number'] = update.voucher_number
    
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user": update.user_name,
        "action": "voucher_update",
        "old_value": old_voucher,
        "new_value": update.voucher_number
    }
    
    await database.sales.update_one(
        {"id": sale_id},
        {
            "$set": {"payment_details": payment_details},
            "$push": {"voucher_history": log_entry}
        }
    )
    return {"message": "Voucher updated successfully", "history": log_entry}

@api_router.post("/sales", response_model=Sale)
async def create_sale(sale_data: SaleCreate, current_user: dict = Depends(get_current_user)):
    database = get_db()
    # Verify open shift
    current_shift = await database.cash_shifts.find_one(
        {"company_id": current_user["company_id"], "status": "open"},
        {"_id": 0}
    )
    if not current_shift:
        raise HTTPException(status_code=400, detail="No open cash shift. Please open a shift first")
    
    # Calculate total and update stock
    total = 0.0
    for item in sale_data.items:
        total += item.subtotal
        
        # Decrease product stock
        await database.products.update_one(
            {"id": item.product_id, "company_id": current_user["company_id"]},
            {"$inc": {"stock_current": -item.quantity}}
        )
        
        # Save sale item
        item_dict = item.model_dump()
        item_dict['company_id'] = current_user["company_id"]
        await database.sale_items.insert_one(item_dict)
    
    # Calculate change if payment method is cash
    change = None
    if sale_data.payment_method == "efectivo" and sale_data.amount_paid:
        change = sale_data.amount_paid - total
    
    # Create sale
    sale = Sale(
        company_id=current_user["company_id"],
        shift_id=current_shift['id'],
        user_id=current_user["user_id"],
        total=total,
        payment_method=sale_data.payment_method,
        amount_paid=sale_data.amount_paid,
        change=change,
        requires_invoice=sale_data.requires_invoice,
        customer_email=sale_data.customer_email
    )
    sale_dict = sale.model_dump()
    sale_dict['created_at'] = sale_dict['created_at'].isoformat()
    await database.sales.insert_one(sale_dict)
    
    # Send invoice if requested
    if sale_data.requires_invoice and sale_data.customer_email:
        try:
            html_content = generate_invoice_html(sale_dict, [item.model_dump() for item in sale_data.items])
            await send_email_async(
                sale_data.customer_email,
                f"Factura Electrónica #{sale_dict['id'][:8].upper()}",
                html_content
            )
        except Exception as e:
            print(f"Failed to send invoice email: {str(e)}")
    
    return sale

# ==================== EMPLOYEES ====================

@api_router.get("/payroll", response_model=List[PayrollLiquidation])
async def get_payroll(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"company_id": current_user["company_id"]}
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" not in query: query["created_at"] = {}
        query["created_at"]["$lte"] = end_date + "T23:59:59"
        
    database = get_db()
    liquidations = await database.payroll.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    result = []
    for l in liquidations:
        if isinstance(l['created_at'], str):
            l['created_at'] = datetime.fromisoformat(l['created_at'])
        
        # Handle legacy data by providing defaults for missing fields
        legacy_defaults = {
            'extra_hours': 0,
            'extra_hours_pay': 0.0,
            'health_deduction': 0.0,
            'pension_deduction': 0.0,
            'arl_deduction': 0.0,
            'total_deductions': 0.0,
            'net_salary': l.get('total', l.get('base_salary', 0)),
            'employer_health': 0.0,
            'employer_pension': 0.0,
            'employer_arl': 0.0,
            'employer_total_cost': l.get('total', l.get('base_salary', 0))
        }
        for key, default_value in legacy_defaults.items():
            if key not in l:
                l[key] = default_value
        result.append(l)
    return result

@api_router.post("/payroll/liquidate", response_model=PayrollLiquidation)
async def liquidate_payroll(liquidation_data: PayrollLiquidationCreate, current_user: dict = Depends(get_current_user)):
    database = get_db()
    # Get employee
    employee = await database.employees.find_one(
        {"id": liquidation_data.employee_id, "company_id": current_user["company_id"]},
        {"_id": 0}
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Calculate base salary
    base_salary = liquidation_data.days_worked * employee['daily_rate']
    
    # Calculate extra hours (1.25x for regular extra hours)
    hour_rate = employee['daily_rate'] / 8  # Assuming 8 hour workday
    extra_hours_pay = liquidation_data.extra_hours * hour_rate * 1.25
    
    # Transport subsidy - Colombia 2026: $249,095 COP
    # Only applies if monthly base salary is <= 3,501,810 COP (2x minimum wage)
    monthly_base_salary = employee.get('base_salary', employee['daily_rate'] * 30)
    TRANSPORT_SUBSIDY_THRESHOLD = 3501810.0
    TRANSPORT_SUBSIDY_AMOUNT = 249095.0
    transport_subsidy = TRANSPORT_SUBSIDY_AMOUNT if monthly_base_salary <= TRANSPORT_SUBSIDY_THRESHOLD else 0.0
    
    # Calculate employee deductions (on base + extra hours)
    total_salary_base = base_salary + extra_hours_pay
    health_deduction = total_salary_base * 0.04 if employee.get('deduct_health', True) else 0
    pension_deduction = total_salary_base * 0.04 if employee.get('deduct_pension', True) else 0
    arl_deduction = total_salary_base * 0.00522 if employee.get('deduct_arl', True) else 0
    total_deductions = health_deduction + pension_deduction + arl_deduction
    
    # Net salary
    net_salary = total_salary_base + transport_subsidy - total_deductions + liquidation_data.novedades_adicionales
    
    # Calculate employer contributions (for admin view) - Colombia 2026
    employer_health = total_salary_base * 0.085  # 8.5% employer health
    employer_pension = total_salary_base * 0.12  # 12% employer pension
    employer_arl = total_salary_base * 0.00522  # 0.522% employer ARL (Risk I)
    
    # Parafiscales (9%)
    parafiscales = total_salary_base * 0.09 # Caja 4% + ICBF 3% + SENA 2%
    
    # Prestaciones (approx 21.83%)
    # Prima 8.33%, Cesantias 8.33%, Intereses 1%, Vacaciones 4.17%
    prestaciones = total_salary_base * 0.2183
    
    employer_total_cost = total_salary_base + transport_subsidy + employer_health + employer_pension + employer_arl + parafiscales + prestaciones
    
    liquidation = PayrollLiquidation(
        company_id=current_user["company_id"],
        employee_id=employee['id'],
        employee_name=employee['name'],
        days_worked=liquidation_data.days_worked,
        extra_hours=liquidation_data.extra_hours,
        daily_rate=employee['daily_rate'],
        base_salary=base_salary,
        extra_hours_pay=extra_hours_pay,
        transport_subsidy=transport_subsidy,
        health_deduction=health_deduction,
        pension_deduction=pension_deduction,
        arl_deduction=arl_deduction,
        total_deductions=total_deductions,
        net_salary=net_salary,
        employer_health=employer_health,
        employer_pension=employer_pension,
        employer_arl=employer_arl,
        employer_total_cost=employer_total_cost,
        novedades_adicionales=liquidation_data.novedades_adicionales,
        observaciones_novedades=liquidation_data.observaciones_novedades
    )
    liquidation_dict = liquidation.model_dump()
    liquidation_dict['created_at'] = liquidation_dict['created_at'].isoformat()
    await database.payroll.insert_one(liquidation_dict)
    
    # Send email if employee has email
    if employee.get('email'):
        try:
            html_content = generate_payroll_html(liquidation_dict, employee)
            await send_email_async(
                employee['email'],
                f"Comprobante de Nómina - {employee['name']}",
                html_content
            )
        except Exception as e:
            print(f"Failed to send payroll email: {str(e)}")
    
    return liquidation

# ==================== TRANSACTIONS ====================

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(current_user: dict = Depends(get_current_user)):
    database = get_db()
    transactions = await database.transactions.find({"company_id": current_user["company_id"]}, {"_id": 0}).to_list(1000)
    for t in transactions:
        if isinstance(t['created_at'], str):
            t['created_at'] = datetime.fromisoformat(t['created_at'])
    return transactions

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction_data: TransactionCreate, current_user: dict = Depends(get_current_user)):
    transaction = Transaction(company_id=current_user["company_id"], **transaction_data.model_dump())
    transaction_dict = transaction.model_dump()
    transaction_dict['created_at'] = transaction_dict['created_at'].isoformat()
    database = get_db()
    await database.transactions.insert_one(transaction_dict)
    return transaction

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str, current_user: dict = Depends(get_current_user)):
    database = get_db()
    result = await database.transactions.delete_one({"id": transaction_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted"}

# ==================== CUSTOMERS ====================

@api_router.get("/customers", response_model=List[Customer])
async def get_customers(current_user: dict = Depends(get_current_user)):
    database = get_db()
    customers = await database.customers.find({"company_id": current_user["company_id"]}, {"_id": 0}).to_list(1000)
    for c in customers:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
    return customers

@api_router.post("/customers", response_model=Customer)
async def create_customer(customer_data: CustomerCreate, current_user: dict = Depends(get_current_user)):
    customer = Customer(company_id=current_user["company_id"], **customer_data.model_dump())
    customer_dict = customer.model_dump()
    customer_dict['created_at'] = customer_dict['created_at'].isoformat()
    database = get_db()
    await database.customers.insert_one(customer_dict)
    return customer

@api_router.put("/customers/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, customer_data: CustomerUpdate, current_user: dict = Depends(get_current_user)):
    update_fields = {k: v for k, v in customer_data.model_dump().items() if v is not None}
    database = get_db()
    if update_fields:
        await database.customers.update_one(
            {"id": customer_id, "company_id": current_user["company_id"]},
            {"$set": update_fields}
        )
    customer_dict = await database.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer_dict:
        raise HTTPException(status_code=404, detail="Customer not found")
    if isinstance(customer_dict.get('created_at'), str):
        customer_dict['created_at'] = datetime.fromisoformat(customer_dict['created_at'])
    return Customer(**customer_dict)

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    database = get_db()
    result = await database.customers.delete_one({"id": customer_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted"}

@api_router.get("/employees", response_model=List[Employee])
async def get_employees(current_user: dict = Depends(get_current_user)):
    database = get_db()
    employees = await database.employees.find({"company_id": current_user["company_id"]}, {"_id": 0}).to_list(1000)
    for e in employees:
        if isinstance(e['created_at'], str):
            e['created_at'] = datetime.fromisoformat(e['created_at'])
    return employees

@api_router.post("/employees", response_model=Employee)
async def create_employee(employee_data: EmployeeCreate, current_user: dict = Depends(get_current_user)):
    database = get_db()
    employee = Employee(
        company_id=current_user["company_id"],
        daily_rate=employee_data.base_salary / 30,  # Calculate daily rate
        **employee_data.model_dump()
    )
    employee_dict = employee.model_dump()
    employee_dict['created_at'] = employee_dict['created_at'].isoformat()
    await database.employees.insert_one(employee_dict)
    return employee

@api_router.put("/employees/{employee_id}", response_model=Employee)
async def update_employee(employee_id: str, employee_data: EmployeeCreate, current_user: dict = Depends(get_current_user)):
    database = get_db()
    update_data = employee_data.model_dump()
    update_data['daily_rate'] = update_data['base_salary'] / 30
    
    await database.employees.update_one(
        {"id": employee_id, "company_id": current_user["company_id"]},
        {"$set": update_data}
    )
    
    employee_dict = await database.employees.find_one({"id": employee_id}, {"_id": 0})
    if not employee_dict:
        raise HTTPException(status_code=404, detail="Employee not found")
    if isinstance(employee_dict['created_at'], str):
        employee_dict['created_at'] = datetime.fromisoformat(employee_dict['created_at'])
    return Employee(**employee_dict)

@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    database = get_db()
    result = await database.employees.delete_one({"id": employee_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"message": "Employee deleted"}


# ==================== ADDITIONAL FILE UPLOADS ====================

@api_router.post("/upload/recipe-image/{recipe_id}")
async def upload_recipe_image(recipe_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"recipe_{recipe_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = UPLOADS_DIR / filename
    
    async with aiofiles.open(filepath, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    database = get_db()
    image_url = f"/uploads/{filename}"
    await database.recipes.update_one(
        {"id": recipe_id, "company_id": current_user["company_id"]},
        {"$set": {"image_url": image_url}}
    )
    return {"image_url": image_url, "filename": filename}

@api_router.post("/upload/material-image/{material_id}")
async def upload_material_image(material_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"material_{material_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = UPLOADS_DIR / filename
    
    async with aiofiles.open(filepath, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    database = get_db()
    image_url = f"/uploads/{filename}"
    await database.raw_materials.update_one(
        {"id": material_id, "company_id": current_user["company_id"]},
        {"$set": {"image_url": image_url}}
    )
    return {"image_url": image_url, "filename": filename}

# ==================== FINANCE AGGREGATE ENDPOINTS ====================

@api_router.get("/finance/caja-mayor")
async def get_caja_mayor(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    company_id = current_user["company_id"]
    query = {"company_id": company_id}
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = end_date + "T23:59:59"
        else:
            query["created_at"] = {"$lte": end_date + "T23:59:59"}

    database = get_db()
    # Get all sales totals
    sales = await database.sales.find(query, {"_id": 0}).to_list(10000)
    total_ingresos = sum(s.get('total', 0) for s in sales)

    # Get all transactions
    transactions = await database.transactions.find(query, {"_id": 0}).to_list(10000)
    total_caja_menor = sum(t['amount'] for t in transactions if t.get('type') == 'caja_menor')
    total_gastos = sum(t['amount'] for t in transactions if t.get('type') in ['pago', 'gasto'])
    gastos_fijos = sum(t['amount'] for t in transactions if t.get('category') == 'fijo')
    gastos_variables = sum(t['amount'] for t in transactions if t.get('category') == 'variable')

    return {
        "total_ingresos": total_ingresos,
        "total_caja_menor": total_caja_menor,
        "total_gastos": total_gastos,
        "gastos_fijos": gastos_fijos,
        "gastos_variables": gastos_variables,
        "balance": total_ingresos + total_caja_menor - total_gastos,
        "num_ventas": len(sales),
        "num_transacciones": len(transactions)
    }

@api_router.get("/finance/balance")
async def get_balance_general(current_user: dict = Depends(get_current_user)):
    company_id = current_user["company_id"]

    database = get_db()
    # Assets: inventory value + cash
    products = await database.products.find({"company_id": company_id}, {"_id": 0}).to_list(10000)
    inventory_value = sum(p.get('cost_buy', 0) * p.get('stock_current', 0) for p in products)

    # Sales total (income)
    sales = await database.sales.find({"company_id": company_id}, {"_id": 0}).to_list(10000)
    total_ventas = sum(s.get('total', 0) for s in sales)

    # Expenses
    transactions = await database.transactions.find({"company_id": company_id}, {"_id": 0}).to_list(10000)
    total_gastos = sum(t['amount'] for t in transactions if t.get('type') in ['pago', 'gasto'])
    total_caja_menor = sum(t['amount'] for t in transactions if t.get('type') == 'caja_menor')

    # Payroll costs
    payroll = await database.payroll.find({"company_id": company_id}, {"_id": 0}).to_list(10000)
    total_nomina = sum(p.get('net_salary', p.get('total', 0)) for p in payroll)

    return {
        "activos": {
            "inventario": inventory_value,
            "caja": total_ventas + total_caja_menor - total_gastos - total_nomina
        },
        "ingresos": total_ventas,
        "egresos": {
            "gastos": total_gastos,
            "nomina": total_nomina,
            "total": total_gastos + total_nomina
        },
        "balance_neto": total_ventas + total_caja_menor - total_gastos - total_nomina
    }

# ==================== EMAILS ====================

@api_router.post("/payroll/send-email")
async def send_payroll_email_endpoint(req: PayrollEmailRequest, current_user: dict = Depends(get_current_user)):
    html_content = generate_payroll_html(req.liquidation, req.employee)
    success = await send_email_async(req.email, f"Comprobante de Nómina - {req.employee.get('name', '')}", html_content)
    if success:
        return {"message": "Email sent successfully"}
    else:
        raise HTTPException(status_code=500, detail="Error enviando email. Verifique configuración de Brevo en el servidor.")

@api_router.post("/sales/send-email")
async def send_invoice_email_endpoint(req: InvoiceEmailRequest, current_user: dict = Depends(get_current_user)):
    html_content = generate_invoice_html(req.sale, req.items)
    # Using a safe fallback for ID
    sale_id = req.sale.get('id', 'N/A')
    success = await send_email_async(req.email, f"Factura Electrónica #{sale_id[:8].upper()}", html_content)
    if success:
        return {"message": "Email sent successfully"}
    else:
        raise HTTPException(status_code=500, detail="Error enviando email. Verifique configuración de Brevo en el servidor.")

# ==================== NOTIFICATIONS ====================

@api_router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = []
    
    database = get_db()
    # Low stock alerts
    low_stock_products = await database.products.find({
        "company_id": current_user["company_id"],
        "$expr": { "$lt": ["$stock_current", "$stock_min"] }
    }, {"_id": 0}).to_list(100)
    
    for product in low_stock_products:
        notifications.append({
            "id": f"low_stock_{product['id']}",
            "type": "low_stock",
            "message": f"{product['name']} tiene stock bajo ({product['stock_current']} unidades)",
            "product_id": product['id'],
            "product_name": product['name'],
            "severity": "warning",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Expiring soon alerts (< 30 days)
    today = datetime.now()
    products_with_expiry = await database.products.find({
        "company_id": current_user["company_id"],
        "expiry_date": {"$ne": None}
    }, {"_id": 0}).to_list(100)
    
    for product in products_with_expiry:
        if product.get('expiry_date'):
            expiry_date = datetime.strptime(product['expiry_date'], "%Y-%m-%d")
            days_until_expiry = (expiry_date - today).days
            if 0 <= days_until_expiry <= 30:
                severity = "critical" if days_until_expiry <= 7 else "warning"
                notifications.append({
                    "id": f"expiring_{product['id']}",
                    "type": "expiring_soon",
                    "message": f"{product['name']} vence en {days_until_expiry} días",
                    "product_id": product['id'],
                    "product_name": product['name'],
                    "severity": severity,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
    
    return notifications

# ==================== USER MANAGEMENT (ADMIN ONLY) ====================

async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    database = get_db()
    # Get user from DB to verify role
    user_dict = await database.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not user_dict or user_dict.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@api_router.get("/users/company", response_model=List[User])
async def get_company_users(admin_user: dict = Depends(require_admin)):
    database = get_db()
    users = await database.users.find({"company_id": admin_user["company_id"]}, {"_id": 0, "password": 0}).to_list(100)
    for u in users:
        if isinstance(u['created_at'], str):
            u['created_at'] = datetime.fromisoformat(u['created_at'])
        if 'permissions' not in u:
            u['permissions'] = ["dashboard", "sales", "inventory", "production", "payroll", "finance", "settings"]
    return users

@api_router.post("/users/company", response_model=User)
async def create_company_user(user_data: UserCreateByAdmin, admin_user: dict = Depends(require_admin)):
    database = get_db()
    # Check if user exists
    existing = await database.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pwd = hash_password(user_data.password)
    new_user = User(
        email=user_data.email,
        name=user_data.name,
        company_id=admin_user["company_id"],
        role=user_data.role,
        permissions=user_data.permissions
    )
    user_dict = new_user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    user_dict['password'] = hashed_pwd
    database = get_db()
    await database.users.insert_one(user_dict)
    
    return new_user


@api_router.put("/users/company/{user_id}", response_model=User)
async def update_company_user(user_id: str, update_data: UserUpdateByAdmin, admin_user: dict = Depends(require_admin)):
    update_fields = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    # Hash password if provided
    if 'password' in update_fields:
        update_fields['password'] = hash_password(update_fields['password'])
    
    database = get_db()
    if update_fields:
        await database.users.update_one(
            {"id": user_id, "company_id": admin_user["company_id"]},
            {"$set": update_fields}
        )
    
    user_dict = await database.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user_dict:
        raise HTTPException(status_code=404, detail="User not found")
    if isinstance(user_dict['created_at'], str):
        user_dict['created_at'] = datetime.fromisoformat(user_dict['created_at'])
    return User(**user_dict)

@api_router.delete("/users/company/{user_id}")
async def delete_company_user(user_id: str, admin_user: dict = Depends(require_admin)):
    # Prevent deleting yourself
    if user_id == admin_user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    database = get_db()
    result = await database.users.delete_one({"id": user_id, "company_id": admin_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

# ==================== CASH REGISTER SUMMARY ====================

@api_router.post("/cash-shifts/{shift_id}/close-with-summary")
async def close_cash_shift_with_summary(shift_id: str, current_user: dict = Depends(get_current_user)):
    database = get_db()
    # Get shift
    shift = await database.cash_shifts.find_one(
        {"id": shift_id, "company_id": current_user["company_id"]},
        {"_id": 0}
    )
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Get all sales from this shift
    sales = await database.sales.find(
        {"shift_id": shift_id, "company_id": current_user["company_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    # Calculate summary
    total_sales = sum(s['total'] for s in sales)
    total_cash = sum(s['total'] for s in sales if s.get('payment_method') == 'efectivo')
    total_card = sum(s['total'] for s in sales if s.get('payment_method') == 'tarjeta')
    total_transfer = sum(s['total'] for s in sales if s.get('payment_method') == 'transferencia')
    
    summary = {
        "shift_id": shift_id,
        "initial_amount": shift.get('initial_amount', 0),
        "total_sales": total_sales,
        "num_transactions": len(sales),
        "total_cash": total_cash,
        "total_card": total_card,
        "total_transfer": total_transfer,
        "expected_cash_in_register": shift.get('initial_amount', 0) + total_cash,
        "opened_at": shift.get('opened_at'),
        "closed_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Update shift with summary
    await database.cash_shifts.update_one(
        {"id": shift_id, "company_id": current_user["company_id"]},
        {"$set": {
            "status": "closed",
            "closed_at": summary["closed_at"],
            "summary": summary
        }}
    )
    
    return summary

@api_router.get("/cash-shifts/history")
async def get_cash_shifts_history(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"company_id": current_user["company_id"]}
    
    if start_date:
        query["opened_at"] = {"$gte": start_date}
    if end_date:
        if "opened_at" in query:
            query["opened_at"]["$lte"] = end_date + "T23:59:59"
        else:
            query["opened_at"] = {"$lte": end_date + "T23:59:59"}
    
    database = get_db()
    shifts = await database.cash_shifts.find(query, {"_id": 0}).sort("opened_at", -1).to_list(100)
    
    # Enrich each shift with sales summary
    for shift in shifts:
        if shift.get("status") == "closed" and not shift.get("summary"):
            sales = await database.sales.find(
                {"shift_id": shift["id"], "company_id": current_user["company_id"]},
                {"_id": 0}
            ).to_list(1000)
            shift["summary"] = {
                "total_sales": sum(s['total'] for s in sales),
                "num_transactions": len(sales)
            }
    
    return shifts

@api_router.get("/sales/today-summary")
async def get_today_sales_summary(current_user: dict = Depends(get_current_user)):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_str = today_start.isoformat()
    
    database = get_db()
    # Get today's sales
    sales = await database.sales.find(
        {
            "company_id": current_user["company_id"],
            "created_at": {"$gte": today_str}
        },
        {"_id": 0}
    ).to_list(1000)
    
    # Get current shift
    database = get_db()
    current_shift = await database.cash_shifts.find_one(
        {"company_id": current_user["company_id"], "status": "open"},
        {"_id": 0}
    )
    
    # Calculate by payment method
    total_cash = sum(s['total'] for s in sales if s.get('payment_method') == 'efectivo')
    total_card = sum(s['total'] for s in sales if s.get('payment_method') == 'tarjeta')
    total_transfer = sum(s['total'] for s in sales if s.get('payment_method') == 'transferencia')
    
    # Get best selling products today
    product_sales = {}
    for sale in sales:
        sale_items = await database.sale_items.find(
            {"company_id": current_user["company_id"]},
            {"_id": 0}
        ).to_list(1000)
        for item in sale_items:
            pid = item.get('product_id', 'unknown')
            if pid not in product_sales:
                product_sales[pid] = {"name": item.get('product_name', 'Unknown'), "quantity": 0, "total": 0}
            product_sales[pid]["quantity"] += item.get('quantity', 0)
            product_sales[pid]["total"] += item.get('subtotal', 0)
    
    top_products = sorted(product_sales.values(), key=lambda x: x['total'], reverse=True)[:5]
    
    return {
        "date": today_start.strftime("%Y-%m-%d"),
        "total_sales": sum(s['total'] for s in sales),
        "num_transactions": len(sales),
        "average_ticket": sum(s['total'] for s in sales) / len(sales) if sales else 0,
        "by_payment_method": {
            "efectivo": total_cash,
            "tarjeta": total_card,
            "transferencia": total_transfer
        },
        "top_products": top_products,
        "current_shift": {
            "id": current_shift["id"] if current_shift else None,
            "initial_amount": current_shift.get("initial_amount", 0) if current_shift else 0,
            "opened_at": current_shift.get("opened_at") if current_shift else None
        } if current_shift else None
    }

@api_router.get("/sales/by-date/{date}")
async def get_sales_by_date(date: str, current_user: dict = Depends(get_current_user)):
    # date format: YYYY-MM-DD
    start = f"{date}T00:00:00"
    end = f"{date}T23:59:59"
    
    database = get_db()
    sales = await database.sales.find(
        {
            "company_id": current_user["company_id"],
            "created_at": {"$gte": start, "$lte": end}
        },
        {"_id": 0}
    ).to_list(1000)
    
    for s in sales:
        if isinstance(s.get('created_at'), str):
            s['created_at'] = datetime.fromisoformat(s['created_at'])
    
    return sales

# ==================== FILE UPLOADS ====================

@api_router.post("/upload/product-image/{product_id}")
async def upload_product_image(product_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"product_{product_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = UPLOADS_DIR / filename
    
    # Save file
    async with aiofiles.open(filepath, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Update product with image URL
    database = get_db()
    image_url = f"/uploads/{filename}"
    await database.products.update_one(
        {"id": product_id, "company_id": current_user["company_id"]},
        {"$set": {"image_url": image_url}}
    )
    
    return {"image_url": image_url, "filename": filename}

@api_router.post("/upload/profile-image")
async def upload_profile_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"profile_{current_user['user_id']}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = UPLOADS_DIR / filename
    
    # Save file
    async with aiofiles.open(filepath, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Update user with image URL
    database = get_db()
    image_url = f"/uploads/{filename}"
    await database.users.update_one(
        {"id": current_user["user_id"]},
        {"$set": {"profile_image": image_url}}
    )
    
    return {"image_url": image_url, "filename": filename}

# Include router
app.include_router(api_router)

# Mount uploads directory for serving static files - move to /uploads to avoid /api conflict
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    if db is not None:
        client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
