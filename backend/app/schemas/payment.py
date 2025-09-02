from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# Request schemas
class CreateCheckoutRequest(BaseModel):
    product_ids: List[str] = Field(..., description="Product IDs from Polar")
    tier: str = Field(..., description="Target tier (power, pro, enterprise)")

# Response schemas
class CheckoutResponse(BaseModel):
    checkout_id: str
    checkout_url: str

class SubscriptionResponse(BaseModel):
    has_subscription: bool
    subscription_id: Optional[str] = None
    tier: str
    status: Optional[str] = None
    subscription_ends_at: Optional[datetime] = None
    cancel_at_period_end: bool = False

class ProductFeature(BaseModel):
    name: str
    description: Optional[str] = None
    included: bool = True

class Product(BaseModel):
    id: str
    name: str
    description: str
    price: int
    currency: str
    interval: str
    tier: str
    features: List[str]

class ProductsResponse(BaseModel):
    products: List[Product]