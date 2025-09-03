from pydantic import BaseModel, EmailStr, HttpUrl, validator
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from uuid import UUID

# User Schemas
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: UUID
    tier: str
    is_active: bool
    is_verified: bool
    usage_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    tier: Optional[str] = None
    is_active: Optional[bool] = None

# Token Schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: User

class TokenData(BaseModel):
    user_id: Optional[UUID] = None
    email: Optional[str] = None

# Conversion Schemas
class ConversionOptions(BaseModel):
    include_images: bool = True
    remove_navigation: bool = True
    custom_selector: Optional[str] = None

class ConversionRequest(BaseModel):
    url: HttpUrl
    options: Optional[ConversionOptions] = None

class ConversionBase(BaseModel):
    source_url: str
    title: Optional[str] = None
    content: str
    meta_description: Optional[str] = None
    word_count: Optional[int] = None
    reading_time: Optional[int] = None
    token_count: Optional[int] = None
    topics: Optional[List[str]] = None
    is_public: bool = True

class ConversionCreate(ConversionBase):
    pass

class ConversionCreateFromClient(BaseModel):
    source_url: str
    title: str
    content: str
    meta_description: Optional[str] = None
    options: Optional[ConversionOptions] = None

class Conversion(ConversionBase):
    id: UUID
    slug: str
    user_id: Optional[UUID] = None
    domain: Optional[str] = None
    view_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class ConversionSave(BaseModel):
    make_public: bool = True
    tags: Optional[List[str]] = None

class ConversionResponse(BaseModel):
    slug: str
    permanent_url: str
    seo_optimized: bool

class ConversionList(BaseModel):
    items: List[Conversion]
    total: int
    limit: int
    offset: int

# Context Stack Schemas
class ContextBlockBase(BaseModel):
    id: str
    type: Literal["url", "text"]
    order: int

class UrlContextBlock(ContextBlockBase):
    type: Literal["url"] = "url"
    url: str
    title: Optional[str] = None
    content: str

class TextContextBlock(ContextBlockBase):
    type: Literal["text"] = "text"
    content: str

# Union type for context blocks
ContextBlock = UrlContextBlock | TextContextBlock

class ContextStackBase(BaseModel):
    name: str
    description: Optional[str] = None
    blocks: List[Dict[str, Any]]  # Will validate as ContextBlock
    is_template: bool = False
    is_public: bool = False

class ContextStackCreate(ContextStackBase):
    pass

class ContextStack(ContextStackBase):
    id: UUID
    user_id: UUID
    use_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class ContextStackExport(BaseModel):
    format: Literal["xml", "markdown", "json"] = "xml"
    include_sources: bool = True
    custom_wrapper: Optional[str] = None

# SEO Page Schemas
class SEOPageData(BaseModel):
    title: str
    description: str
    url: str
    slug: str
    content: str
    word_count: int
    reading_time: int
    token_count: int
    topics: List[str]
    created_at: datetime
    view_count: int

# MCP Schemas
class MCPConvertRequest(BaseModel):
    url: HttpUrl
    format: Literal["markdown", "xml"] = "markdown"
    include_images: bool = True

class MCPSearchRequest(BaseModel):
    query: str
    limit: int = 10

class MCPContextStackRequest(BaseModel):
    urls: List[HttpUrl]
    format: Literal["xml", "markdown", "json"] = "xml"
    custom_context: Optional[str] = None

class MCPSearchResult(BaseModel):
    title: str
    url: str
    slug: str
    excerpt: str
    created_at: datetime

# API Key Schemas
class ApiKeyCreate(BaseModel):
    name: str
    scopes: List[str] = ["convert", "library", "context"]
    expires_in_days: Optional[int] = None

class ApiKey(BaseModel):
    id: UUID
    name: str
    prefix: str
    scopes: List[str]
    is_active: bool
    created_at: datetime
    last_used_at: Optional[datetime] = None
    usage_count: int
    
    class Config:
        from_attributes = True

class ApiKeyResponse(BaseModel):
    key: str  # Full key returned only on creation
    api_key_info: ApiKey

# Error Schemas
class ErrorResponse(BaseModel):
    detail: str
    code: str
    type: str = "error"

class ValidationErrorResponse(BaseModel):
    detail: List[Dict[str, Any]]
    code: str = "validation_error"
    type: str = "validation_error"

# Usage and Analytics Schemas
class UsageStats(BaseModel):
    daily_conversions: int
    monthly_conversions: int
    total_conversions: int
    quota_remaining: Optional[int] = None
    reset_at: Optional[datetime] = None

class AnalyticsData(BaseModel):
    conversions_by_day: List[Dict[str, Any]]
    popular_domains: List[Dict[str, Any]]
    top_content: List[Dict[str, Any]]
    user_tier_distribution: Dict[str, int]