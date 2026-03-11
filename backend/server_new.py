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
from utils import generate_invoice_html, generate_payroll_html, send_email_async

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

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    company_id: str
    role: str = "user"
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
    stage: str = "montada"
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
    status: str = "open"
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
    daily_rate: float
    base_salary: float
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

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    type: str
    payment_method: str
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

