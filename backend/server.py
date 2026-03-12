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

class MockCollection:
    async def find_one(self, query, projection=None):
        email = query.get("email") or query.get("id")
        if email in ["admin@demo.com", "admin_id"]:
            return {
                "id": "admin_id",
                "email": "admin@demo.com",
                "name": "Admin Demo",
                "company_id": "company_123",
                "role": "admin",
                "password": pwd_context.hash("Demo2026!"),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "permissions": ["dashboard", "sales", "inventory", "production", "payroll", "finance", "settings"]
            }
        return None
    async def insert_one(self, doc): return None
    async def update_one(self, q, u): return None

class MockDB:
    def __init__(self):
        self.users = MockCollection()
        self.companies = MockCollection()
        self.products = MockCollection()
        self.production_orders = MockCollection()
        self.employees = MockCollection()
        self.cash_shifts = MockCollection()
        self.sales = MockCollection()
        self.sale_items = MockCollection()
        self.raw_materials = MockCollection()
        self.recipes = MockCollection()

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

class RecipeIngredient(BaseModel):
    raw_material_id: str
    raw_material_name: str
    quantity: float
    unit: str  # kg, g, L, ml, unidades

class Recipe(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    name: str
    description: Optional[str] = None
    output_product_id: str
    output_product_name: str
    expected_quantity: int
    ingredients: List[RecipeIngredient] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RecipeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    output_product_id: str
    output_product_name: str
    expected_quantity: int
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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RawMaterialCreate(BaseModel):
    name: str
    sku: str
    current_stock: float
    min_stock: float
    unit: str
    cost_per_unit: float
    supplier: Optional[str] = None

class RawMaterialUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    current_stock: Optional[float] = None
    min_stock: Optional[float] = None
    unit: Optional[str] = None
    cost_per_unit: Optional[float] = None
    supplier: Optional[str] = None

class ProductionOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    recipe_id: str
    recipe_name: str
    stage: str = "montada"  # montada, alistada, procesada, terminada
    created_by: str
    warehouse_person: Optional[str] = None
    operator_person: Optional[str] = None
    actual_output: Optional[int] = None
    observations: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductionOrderCreate(BaseModel):
    recipe_id: str
    recipe_name: str
    start_time: Optional[str] = None

class ProductionOrderUpdate(BaseModel):
    stage: str
    warehouse_person: Optional[str] = None
    operator_person: Optional[str] = None
    actual_output: Optional[int] = None
    observations: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None

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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PayrollLiquidationCreate(BaseModel):
    employee_id: str
    days_worked: int
    extra_hours: int = 0

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
    companies = await db.companies.find({}, {"_id": 0}).to_list(1000)
    for c in companies:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
    return companies

@api_router.get("/superadmin/users")
async def get_all_users(current_user: dict = Depends(get_superadmin_user)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    for u in users:
        if isinstance(u.get('created_at'), str):
            u['created_at'] = datetime.fromisoformat(u['created_at'])
    return users

# ==================== ROUTES ====================

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create company
    company_dict = Company(name=user_data.company_name).model_dump()
    company_dict['created_at'] = company_dict['created_at'].isoformat()
    await db.companies.insert_one(company_dict)
    
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
    await db.users.insert_one(user_dict)
    
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

# ==================== DASHBOARD ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    company_id = current_user["company_id"]
    
    # Total products in stock
    total_products = await db.products.count_documents({"company_id": company_id})
    
    # Production orders count
    production_orders = await db.production_orders.count_documents({"company_id": company_id})
    
    # Employees count
    employees = await db.employees.count_documents({"company_id": company_id, "status": "active"})
    
    # Current shift and total sales
    current_shift = await db.cash_shifts.find_one(
        {"company_id": company_id, "status": "open"},
        {"_id": 0}
    )
    
    total_sales = 0.0
    cash_box = 0.0
    
    if current_shift:
        sales_list = await db.sales.find(
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
    top_products = await db.sale_items.aggregate(pipeline).to_list(5)
    
    # Weekly sales (last 7 days)
    weekly_sales = []
    for i in range(6, -1, -1):
        date = datetime.now(timezone.utc) - timedelta(days=i)
        date_str = date.strftime("%Y-%m-%d")
        day_sales = await db.sales.find(
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
    products = await db.products.find({"company_id": current_user["company_id"]}, {"_id": 0}).to_list(1000)
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
    await db.products.insert_one(product_dict)
    return product

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_data: ProductUpdate, current_user: dict = Depends(get_current_user)):
    update_fields = {k: v for k, v in product_data.model_dump().items() if v is not None}
    
    # Recalculate profit if costs changed
    existing = await db.products.find_one({"id": product_id, "company_id": current_user["company_id"]}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    cost_buy = update_fields.get('cost_buy', existing['cost_buy'])
    cost_sell = update_fields.get('cost_sell', existing['cost_sell'])
    if cost_buy > 0:
        update_fields['profit_percentage'] = ((cost_sell - cost_buy) / cost_buy) * 100
    
    if update_fields:
        await db.products.update_one(
            {"id": product_id, "company_id": current_user["company_id"]},
            {"$set": update_fields}
        )
    
    product_dict = await db.products.find_one({"id": product_id}, {"_id": 0})
    if isinstance(product_dict['created_at'], str):
        product_dict['created_at'] = datetime.fromisoformat(product_dict['created_at'])
    return Product(**product_dict)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.products.delete_one({"id": product_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

# ==================== WAREHOUSES ====================

@api_router.get("/warehouses", response_model=List[Warehouse])
async def get_warehouses(current_user: dict = Depends(get_current_user)):
    warehouses = await db.warehouses.find({"company_id": current_user["company_id"]}, {"_id": 0}).to_list(1000)
    for w in warehouses:
        if isinstance(w['created_at'], str):
            w['created_at'] = datetime.fromisoformat(w['created_at'])
    return warehouses

@api_router.post("/warehouses", response_model=Warehouse)
async def create_warehouse(warehouse_data: WarehouseCreate, current_user: dict = Depends(get_current_user)):
    warehouse = Warehouse(company_id=current_user["company_id"], **warehouse_data.model_dump())
    warehouse_dict = warehouse.model_dump()
    warehouse_dict['created_at'] = warehouse_dict['created_at'].isoformat()
    await db.warehouses.insert_one(warehouse_dict)
    return warehouse

@api_router.get("/warehouses/{warehouse_id}/products")
async def get_warehouse_products(warehouse_id: str, current_user: dict = Depends(get_current_user)):
    products = await db.products.find(
        {"company_id": current_user["company_id"], "warehouse_id": warehouse_id},
        {"_id": 0}
    ).to_list(1000)
    for p in products:
        if isinstance(p.get('created_at'), str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])
    return products

@api_router.delete("/warehouses/{warehouse_id}")
async def delete_warehouse(warehouse_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.warehouses.delete_one({"id": warehouse_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return {"message": "Warehouse deleted"}

# ==================== RAW MATERIALS ====================

@api_router.get("/raw-materials", response_model=List[RawMaterial])
async def get_raw_materials(current_user: dict = Depends(get_current_user)):
    raw_materials = await db.raw_materials.find({"company_id": current_user["company_id"]}, {"_id": 0}).to_list(1000)
    for rm in raw_materials:
        if isinstance(rm['created_at'], str):
            rm['created_at'] = datetime.fromisoformat(rm['created_at'])
    return raw_materials

@api_router.post("/raw-materials", response_model=RawMaterial)
async def create_raw_material(material_data: RawMaterialCreate, current_user: dict = Depends(get_current_user)):
    material = RawMaterial(company_id=current_user["company_id"], **material_data.model_dump())
    material_dict = material.model_dump()
    material_dict['created_at'] = material_dict['created_at'].isoformat()
    await db.raw_materials.insert_one(material_dict)
    return material

@api_router.put("/raw-materials/{material_id}", response_model=RawMaterial)
async def update_raw_material(material_id: str, material_data: RawMaterialUpdate, current_user: dict = Depends(get_current_user)):
    update_fields = {k: v for k, v in material_data.model_dump().items() if v is not None}
    
    if update_fields:
        await db.raw_materials.update_one(
            {"id": material_id, "company_id": current_user["company_id"]},
            {"$set": update_fields}
        )
    
    material_dict = await db.raw_materials.find_one({"id": material_id}, {"_id": 0})
    if not material_dict:
        raise HTTPException(status_code=404, detail="Raw material not found")
    if isinstance(material_dict['created_at'], str):
        material_dict['created_at'] = datetime.fromisoformat(material_dict['created_at'])
    return RawMaterial(**material_dict)

@api_router.delete("/raw-materials/{material_id}")
async def delete_raw_material(material_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.raw_materials.delete_one({"id": material_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Raw material not found")
    return {"message": "Raw material deleted"}

# ==================== RECIPES ====================

@api_router.get("/recipes", response_model=List[Recipe])
async def get_recipes(current_user: dict = Depends(get_current_user)):
    recipes = await db.recipes.find({"company_id": current_user["company_id"]}, {"_id": 0}).to_list(1000)
    for r in recipes:
        if isinstance(r['created_at'], str):
            r['created_at'] = datetime.fromisoformat(r['created_at'])
        if 'ingredients' not in r:
            r['ingredients'] = []
        if 'output_product_name' not in r:
            # Get product name if missing
            product = await db.products.find_one({"id": r.get('output_product_id')}, {"_id": 0})
            r['output_product_name'] = product['name'] if product else "Unknown"
    return recipes

@api_router.post("/recipes", response_model=Recipe)
async def create_recipe(recipe_data: RecipeCreate, current_user: dict = Depends(get_current_user)):
    recipe = Recipe(company_id=current_user["company_id"], **recipe_data.model_dump())
    recipe_dict = recipe.model_dump()
    recipe_dict['created_at'] = recipe_dict['created_at'].isoformat()
    # Convert ingredients to dict
    recipe_dict['ingredients'] = [ing.model_dump() if hasattr(ing, 'model_dump') else ing for ing in recipe_dict['ingredients']]
    await db.recipes.insert_one(recipe_dict)
    return recipe

@api_router.put("/recipes/{recipe_id}", response_model=Recipe)
async def update_recipe(recipe_id: str, recipe_data: RecipeCreate, current_user: dict = Depends(get_current_user)):
    update_data = recipe_data.model_dump()
    update_data['ingredients'] = [ing.model_dump() if hasattr(ing, 'model_dump') else ing for ing in update_data['ingredients']]
    
    await db.recipes.update_one(
        {"id": recipe_id, "company_id": current_user["company_id"]},
        {"$set": update_data}
    )
    
    recipe_dict = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not recipe_dict:
        raise HTTPException(status_code=404, detail="Recipe not found")
    if isinstance(recipe_dict['created_at'], str):
        recipe_dict['created_at'] = datetime.fromisoformat(recipe_dict['created_at'])
    return Recipe(**recipe_dict)

@api_router.delete("/recipes/{recipe_id}")
async def delete_recipe(recipe_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.recipes.delete_one({"id": recipe_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return {"message": "Recipe deleted"}

# ==================== PRODUCTION ORDERS ====================

@api_router.get("/production-orders", response_model=List[ProductionOrder])
async def get_production_orders(current_user: dict = Depends(get_current_user)):
    orders = await db.production_orders.find({"company_id": current_user["company_id"]}, {"_id": 0}).to_list(1000)
    for o in orders:
        if isinstance(o['created_at'], str):
            o['created_at'] = datetime.fromisoformat(o['created_at'])
        if isinstance(o['updated_at'], str):
            o['updated_at'] = datetime.fromisoformat(o['updated_at'])
    return orders

@api_router.post("/production-orders", response_model=ProductionOrder)
async def create_production_order(order_data: ProductionOrderCreate, current_user: dict = Depends(get_current_user)):
    order = ProductionOrder(
        company_id=current_user["company_id"],
        created_by=current_user["email"],
        **order_data.model_dump()
    )
    order_dict = order.model_dump()
    order_dict['created_at'] = order_dict['created_at'].isoformat()
    order_dict['updated_at'] = order_dict['updated_at'].isoformat()
    await db.production_orders.insert_one(order_dict)
    return order

@api_router.put("/production-orders/{order_id}", response_model=ProductionOrder)
async def update_production_order(order_id: str, order_data: ProductionOrderUpdate, current_user: dict = Depends(get_current_user)):
    update_fields = {k: v for k, v in order_data.model_dump().items() if v is not None}
    update_fields['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.production_orders.update_one(
        {"id": order_id, "company_id": current_user["company_id"]},
        {"$set": update_fields}
    )
    
    order_dict = await db.production_orders.find_one({"id": order_id}, {"_id": 0})
    if not order_dict:
        raise HTTPException(status_code=404, detail="Production order not found")
    
    if isinstance(order_dict['created_at'], str):
        order_dict['created_at'] = datetime.fromisoformat(order_dict['created_at'])
    if isinstance(order_dict['updated_at'], str):
        order_dict['updated_at'] = datetime.fromisoformat(order_dict['updated_at'])
    return ProductionOrder(**order_dict)

# ==================== CASH SHIFTS ====================

@api_router.get("/cash-shifts/current")
async def get_current_shift(current_user: dict = Depends(get_current_user)):
    shift = await db.cash_shifts.find_one(
        {"company_id": current_user["company_id"], "status": "open"},
        {"_id": 0}
    )
    if shift and isinstance(shift['opened_at'], str):
        shift['opened_at'] = datetime.fromisoformat(shift['opened_at'])
    return shift

@api_router.post("/cash-shifts", response_model=CashShift)
async def open_cash_shift(shift_data: CashShiftCreate, current_user: dict = Depends(get_current_user)):
    # Check if there's already an open shift
    existing = await db.cash_shifts.find_one(
        {"company_id": current_user["company_id"], "status": "open"},
        {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=400, detail="There's already an open cash shift")
    
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    shift = CashShift(
        company_id=current_user["company_id"],
        user_id=current_user["user_id"],
        user_name=user['name'],
        initial_amount=shift_data.initial_amount
    )
    shift_dict = shift.model_dump()
    shift_dict['opened_at'] = shift_dict['opened_at'].isoformat()
    await db.cash_shifts.insert_one(shift_dict)
    return shift

@api_router.post("/cash-shifts/{shift_id}/close")
async def close_cash_shift(shift_id: str, current_user: dict = Depends(get_current_user)):
    await db.cash_shifts.update_one(
        {"id": shift_id, "company_id": current_user["company_id"]},
        {"$set": {"status": "closed", "closed_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Cash shift closed"}

# ==================== SALES ====================

@api_router.get("/sales", response_model=List[Sale])
async def get_sales(current_user: dict = Depends(get_current_user)):
    sales = await db.sales.find({"company_id": current_user["company_id"]}, {"_id": 0}).to_list(1000)
    for s in sales:
        if isinstance(s['created_at'], str):
            s['created_at'] = datetime.fromisoformat(s['created_at'])
    return sales

@api_router.post("/sales", response_model=Sale)
async def create_sale(sale_data: SaleCreate, current_user: dict = Depends(get_current_user)):
    # Verify open shift
    current_shift = await db.cash_shifts.find_one(
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
        await db.products.update_one(
            {"id": item.product_id, "company_id": current_user["company_id"]},
            {"$inc": {"stock_current": -item.quantity}}
        )
        
        # Save sale item
        item_dict = item.model_dump()
        item_dict['company_id'] = current_user["company_id"]
        await db.sale_items.insert_one(item_dict)
    
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
    await db.sales.insert_one(sale_dict)
    
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

@api_router.get("/employees", response_model=List[Employee])
async def get_employees(current_user: dict = Depends(get_current_user)):
    employees = await db.employees.find({"company_id": current_user["company_id"]}, {"_id": 0}).to_list(1000)
    for e in employees:
        if isinstance(e['created_at'], str):
            e['created_at'] = datetime.fromisoformat(e['created_at'])
    return employees

@api_router.post("/employees", response_model=Employee)
async def create_employee(employee_data: EmployeeCreate, current_user: dict = Depends(get_current_user)):
    # Calculate daily_rate from base_salary (assuming 30 days per month)
    daily_rate = employee_data.base_salary / 30
    
    employee = Employee(
        company_id=current_user["company_id"], 
        daily_rate=daily_rate,
        **employee_data.model_dump()
    )
    employee_dict = employee.model_dump()
    employee_dict['created_at'] = employee_dict['created_at'].isoformat()
    await db.employees.insert_one(employee_dict)
    return employee

@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.employees.delete_one({"id": employee_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"message": "Employee deleted"}

# ==================== PAYROLL ====================

@api_router.get("/payroll")
async def get_payroll(current_user: dict = Depends(get_current_user)):
    liquidations = await db.payroll.find({"company_id": current_user["company_id"]}, {"_id": 0}).to_list(1000)
    result = []
    for l in liquidations:
        if isinstance(l.get('created_at'), str):
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
    # Get employee
    employee = await db.employees.find_one(
        {"id": liquidation_data.employee_id, "company_id": current_user["company_id"]},
        {"_id": 0}
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Calculate base salary
    base_salary = liquidation_data.days_worked * employee['daily_rate']
    
    # Calculate extra hours (1.25x for regular extra hours, or 1.75x for night/holiday - using 1.25x)
    hour_rate = employee['daily_rate'] / 8  # Assuming 8 hour workday
    extra_hours_pay = liquidation_data.extra_hours * hour_rate * 1.25
    
    # Transport subsidy - Colombia 2026: $200,000 COP
    # Only applies if monthly base salary is <= 3,501,810 COP (2x minimum wage)
    monthly_base_salary = employee.get('base_salary', employee['daily_rate'] * 30)
    TRANSPORT_SUBSIDY_THRESHOLD = 3501810.0
    TRANSPORT_SUBSIDY_AMOUNT = 200000.0
    transport_subsidy = TRANSPORT_SUBSIDY_AMOUNT if monthly_base_salary <= TRANSPORT_SUBSIDY_THRESHOLD else 0.0
    
    # Calculate employee deductions (on base + extra hours)
    total_salary_base = base_salary + extra_hours_pay
    health_deduction = total_salary_base * 0.04 if employee.get('deduct_health', True) else 0
    pension_deduction = total_salary_base * 0.04 if employee.get('deduct_pension', True) else 0
    arl_deduction = total_salary_base * 0.00522 if employee.get('deduct_arl', True) else 0
    total_deductions = health_deduction + pension_deduction + arl_deduction
    
    # Net salary
    net_salary = total_salary_base + transport_subsidy - total_deductions
    
    # Calculate employer contributions (for admin view)
    employer_health = total_salary_base * 0.085  # 8.5% employer health
    employer_pension = total_salary_base * 0.12  # 12% employer pension
    employer_arl = total_salary_base * 0.00522  # 0.522% employer ARL
    employer_total_cost = total_salary_base + transport_subsidy + employer_health + employer_pension + employer_arl
    
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
        employer_total_cost=employer_total_cost
    )
    liquidation_dict = liquidation.model_dump()
    liquidation_dict['created_at'] = liquidation_dict['created_at'].isoformat()
    await db.payroll.insert_one(liquidation_dict)
    
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
    transactions = await db.transactions.find({"company_id": current_user["company_id"]}, {"_id": 0}).to_list(1000)
    for t in transactions:
        if isinstance(t['created_at'], str):
            t['created_at'] = datetime.fromisoformat(t['created_at'])
    return transactions

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction_data: TransactionCreate, current_user: dict = Depends(get_current_user)):
    transaction = Transaction(company_id=current_user["company_id"], **transaction_data.model_dump())
    transaction_dict = transaction.model_dump()
    transaction_dict['created_at'] = transaction_dict['created_at'].isoformat()
    await db.transactions.insert_one(transaction_dict)
    return transaction

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.transactions.delete_one({"id": transaction_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted"}

# ==================== CUSTOMERS ====================

@api_router.get("/customers", response_model=List[Customer])
async def get_customers(current_user: dict = Depends(get_current_user)):
    customers = await db.customers.find({"company_id": current_user["company_id"]}, {"_id": 0}).to_list(1000)
    for c in customers:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
    return customers

@api_router.post("/customers", response_model=Customer)
async def create_customer(customer_data: CustomerCreate, current_user: dict = Depends(get_current_user)):
    customer = Customer(company_id=current_user["company_id"], **customer_data.model_dump())
    customer_dict = customer.model_dump()
    customer_dict['created_at'] = customer_dict['created_at'].isoformat()
    await db.customers.insert_one(customer_dict)
    return customer

@api_router.put("/customers/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, customer_data: CustomerUpdate, current_user: dict = Depends(get_current_user)):
    update_fields = {k: v for k, v in customer_data.model_dump().items() if v is not None}
    if update_fields:
        await db.customers.update_one(
            {"id": customer_id, "company_id": current_user["company_id"]},
            {"$set": update_fields}
        )
    customer_dict = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer_dict:
        raise HTTPException(status_code=404, detail="Customer not found")
    if isinstance(customer_dict.get('created_at'), str):
        customer_dict['created_at'] = datetime.fromisoformat(customer_dict['created_at'])
    return Customer(**customer_dict)

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.customers.delete_one({"id": customer_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted"}

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

    # Get all sales totals
    sales = await db.sales.find(query, {"_id": 0}).to_list(10000)
    total_ingresos = sum(s.get('total', 0) for s in sales)

    # Get all transactions
    transactions = await db.transactions.find(query, {"_id": 0}).to_list(10000)
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

    # Assets: inventory value + cash
    products = await db.products.find({"company_id": company_id}, {"_id": 0}).to_list(10000)
    inventory_value = sum(p.get('cost_buy', 0) * p.get('stock_current', 0) for p in products)

    # Sales total (income)
    sales = await db.sales.find({"company_id": company_id}, {"_id": 0}).to_list(10000)
    total_ventas = sum(s.get('total', 0) for s in sales)

    # Expenses
    transactions = await db.transactions.find({"company_id": company_id}, {"_id": 0}).to_list(10000)
    total_gastos = sum(t['amount'] for t in transactions if t.get('type') in ['pago', 'gasto'])
    total_caja_menor = sum(t['amount'] for t in transactions if t.get('type') == 'caja_menor')

    # Payroll costs
    payroll = await db.payroll.find({"company_id": company_id}, {"_id": 0}).to_list(10000)
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
    
    # Low stock alerts
    low_stock_products = await db.products.find({
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
    products_with_expiry = await db.products.find({
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
    # Get user from DB to verify role
    user_dict = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not user_dict or user_dict.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@api_router.get("/users/company", response_model=List[User])
async def get_company_users(admin_user: dict = Depends(require_admin)):
    users = await db.users.find({"company_id": admin_user["company_id"]}, {"_id": 0, "password": 0}).to_list(100)
    for u in users:
        if isinstance(u['created_at'], str):
            u['created_at'] = datetime.fromisoformat(u['created_at'])
        if 'permissions' not in u:
            u['permissions'] = ["dashboard", "sales", "inventory", "production", "payroll", "finance", "settings"]
    return users

@api_router.post("/users/company", response_model=User)
async def create_company_user(user_data: UserCreateByAdmin, admin_user: dict = Depends(require_admin)):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
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
    await db.users.insert_one(user_dict)
    
    return new_user

@api_router.put("/users/company/{user_id}", response_model=User)
async def update_company_user(user_id: str, update_data: UserUpdateByAdmin, admin_user: dict = Depends(require_admin)):
    update_fields = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    # Hash password if provided
    if 'password' in update_fields:
        update_fields['password'] = hash_password(update_fields['password'])
    
    if update_fields:
        await db.users.update_one(
            {"id": user_id, "company_id": admin_user["company_id"]},
            {"$set": update_fields}
        )
    
    user_dict = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
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
    
    result = await db.users.delete_one({"id": user_id, "company_id": admin_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

# ==================== CASH REGISTER SUMMARY ====================

@api_router.post("/cash-shifts/{shift_id}/close-with-summary")
async def close_cash_shift_with_summary(shift_id: str, current_user: dict = Depends(get_current_user)):
    # Get shift
    shift = await db.cash_shifts.find_one(
        {"id": shift_id, "company_id": current_user["company_id"]},
        {"_id": 0}
    )
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Get all sales from this shift
    sales = await db.sales.find(
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
    await db.cash_shifts.update_one(
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
    
    shifts = await db.cash_shifts.find(query, {"_id": 0}).sort("opened_at", -1).to_list(100)
    
    # Enrich each shift with sales summary
    for shift in shifts:
        if shift.get("status") == "closed" and not shift.get("summary"):
            sales = await db.sales.find(
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
    
    # Get today's sales
    sales = await db.sales.find(
        {
            "company_id": current_user["company_id"],
            "created_at": {"$gte": today_str}
        },
        {"_id": 0}
    ).to_list(1000)
    
    # Get current shift
    current_shift = await db.cash_shifts.find_one(
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
        sale_items = await db.sale_items.find(
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
    
    sales = await db.sales.find(
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
    image_url = f"/api/uploads/{filename}"
    await db.products.update_one(
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
    image_url = f"/api/uploads/{filename}"
    await db.users.update_one(
        {"id": current_user["user_id"]},
        {"$set": {"profile_image": image_url}}
    )
    
    return {"image_url": image_url, "filename": filename}

# Include router
app.include_router(api_router)

# Mount uploads directory for serving static files
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

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
    client.close()
