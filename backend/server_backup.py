from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import uuid

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

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

class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    expiry_date: Optional[str] = None
    cost_buy: Optional[float] = None
    cost_sell: Optional[float] = None
    stock_min: Optional[int] = None
    stock_current: Optional[int] = None
    image_url: Optional[str] = None

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

class Recipe(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    name: str
    description: Optional[str] = None
    output_product_id: str
    expected_quantity: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RecipeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    output_product_id: str
    expected_quantity: int

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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductionOrderCreate(BaseModel):
    recipe_id: str
    recipe_name: str

class ProductionOrderUpdate(BaseModel):
    stage: str
    warehouse_person: Optional[str] = None
    operator_person: Optional[str] = None
    actual_output: Optional[int] = None
    observations: Optional[str] = None

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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SaleItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    price: float
    subtotal: float

class SaleCreate(BaseModel):
    items: List[SaleItem]

class Employee(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    document: str
    name: str
    daily_rate: float
    start_date: str
    eps: str
    arl: str
    pension: str
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmployeeCreate(BaseModel):
    document: str
    name: str
    daily_rate: float
    start_date: str
    eps: str
    arl: str
    pension: str

class PayrollLiquidation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    employee_id: str
    employee_name: str
    days_worked: int
    daily_rate: float
    base_salary: float
    transport_subsidy: float
    total: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PayrollLiquidationCreate(BaseModel):
    employee_id: str
    days_worked: int

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    type: str  # caja_menor, pago, gasto
    payment_method: str  # efectivo, tarjeta
    card_detail: Optional[str] = None
    amount: float
    description: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransactionCreate(BaseModel):
    type: str
    payment_method: str
    card_detail: Optional[str] = None
    amount: float
    description: str

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
        if user_id is None or company_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"user_id": user_id, "company_id": company_id, "email": payload.get("email")}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

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
        "email": user.email
    })
    
    return Token(access_token=token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user_dict = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_dict or not verify_password(credentials.password, user_dict['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_dict.pop('password')
    if isinstance(user_dict['created_at'], str):
        user_dict['created_at'] = datetime.fromisoformat(user_dict['created_at'])
    user = User(**user_dict)
    
    token = create_access_token({
        "user_id": user.id,
        "company_id": user.company_id,
        "email": user.email
    })
    
    return Token(access_token=token, token_type="bearer", user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    user_dict = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "password": 0})
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

@api_router.delete("/warehouses/{warehouse_id}")
async def delete_warehouse(warehouse_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.warehouses.delete_one({"id": warehouse_id, "company_id": current_user["company_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return {"message": "Warehouse deleted"}

# ==================== RECIPES ====================

@api_router.get("/recipes", response_model=List[Recipe])
async def get_recipes(current_user: dict = Depends(get_current_user)):
    recipes = await db.recipes.find({"company_id": current_user["company_id"]}, {"_id": 0}).to_list(1000)
    for r in recipes:
        if isinstance(r['created_at'], str):
            r['created_at'] = datetime.fromisoformat(r['created_at'])
    return recipes

@api_router.post("/recipes", response_model=Recipe)
async def create_recipe(recipe_data: RecipeCreate, current_user: dict = Depends(get_current_user)):
    recipe = Recipe(company_id=current_user["company_id"], **recipe_data.model_dump())
    recipe_dict = recipe.model_dump()
    recipe_dict['created_at'] = recipe_dict['created_at'].isoformat()
    await db.recipes.insert_one(recipe_dict)
    return recipe

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
    
    # Create sale
    sale = Sale(
        company_id=current_user["company_id"],
        shift_id=current_shift['id'],
        user_id=current_user["user_id"],
        total=total
    )
    sale_dict = sale.model_dump()
    sale_dict['created_at'] = sale_dict['created_at'].isoformat()
    await db.sales.insert_one(sale_dict)
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
    employee = Employee(company_id=current_user["company_id"], **employee_data.model_dump())
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

@api_router.get("/payroll", response_model=List[PayrollLiquidation])
async def get_payroll(current_user: dict = Depends(get_current_user)):
    liquidations = await db.payroll.find({"company_id": current_user["company_id"]}, {"_id": 0}).to_list(1000)
    for l in liquidations:
        if isinstance(l['created_at'], str):
            l['created_at'] = datetime.fromisoformat(l['created_at'])
    return liquidations

@api_router.post("/payroll/liquidate", response_model=PayrollLiquidation)
async def liquidate_payroll(liquidation_data: PayrollLiquidationCreate, current_user: dict = Depends(get_current_user)):
    # Get employee
    employee = await db.employees.find_one(
        {"id": liquidation_data.employee_id, "company_id": current_user["company_id"]},
        {"_id": 0}
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Calculate
    base_salary = liquidation_data.days_worked * employee['daily_rate']
    transport_subsidy = 162000.0  # Colombia 2026 subsidy
    total = base_salary + transport_subsidy
    
    liquidation = PayrollLiquidation(
        company_id=current_user["company_id"],
        employee_id=employee['id'],
        employee_name=employee['name'],
        days_worked=liquidation_data.days_worked,
        daily_rate=employee['daily_rate'],
        base_salary=base_salary,
        transport_subsidy=transport_subsidy,
        total=total
    )
    liquidation_dict = liquidation.model_dump()
    liquidation_dict['created_at'] = liquidation_dict['created_at'].isoformat()
    await db.payroll.insert_one(liquidation_dict)
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

# Include router
app.include_router(api_router)

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
