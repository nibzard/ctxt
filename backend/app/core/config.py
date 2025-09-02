from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Optional, Union
import os

class Settings(BaseSettings):
    # Application
    app_name: str = "ctxt.help API"
    version: str = "1.0.0"
    debug: bool = False
    environment: str = "development"
    
    # Database
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./ctxt_help.db")
    sql_debug: bool = False
    
    # Redis
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # Authentication
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "")
    
    @field_validator('jwt_secret_key')
    @classmethod
    def validate_jwt_secret(cls, v):
        if not v or v == "your-super-secret-jwt-key-change-this-in-production":
            raise ValueError("JWT_SECRET_KEY must be set to a secure random string")
        if len(v) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters long")
        return v
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7
    
    # CORS
    allowed_origins: Union[str, List[str]] = ["http://localhost:5173", "http://localhost:3000"]
    
    @field_validator('allowed_origins', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [item.strip() for item in v.split(',')]
        return v
    
    # Rate Limiting
    rate_limit_free_daily: int = 5
    rate_limit_power_daily: str = "unlimited"
    rate_limit_pro_daily: str = "unlimited"
    
    # External APIs
    jina_reader_base_url: str = "https://r.jina.ai"
    jina_fallback_enabled: bool = True
    
    # Features
    mcp_server_enabled: bool = True
    seo_pages_enabled: bool = True
    analytics_enabled: bool = True
    
    # Email (for notifications)
    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    from_email: str = "noreply@ctxt.help"
    
    # Payment (Polar.sh)
    polar_access_token: Optional[str] = None
    polar_webhook_secret: Optional[str] = None
    polar_organization_id: Optional[str] = None
    polar_success_url: Optional[str] = None
    
    # Polar Product IDs (replace with actual product IDs from Polar dashboard)
    polar_power_product_id: Optional[str] = os.getenv("POLAR_POWER_PRODUCT_ID")
    polar_pro_product_id: Optional[str] = os.getenv("POLAR_PRO_PRODUCT_ID")
    polar_enterprise_product_id: Optional[str] = os.getenv("POLAR_ENTERPRISE_PRODUCT_ID")
    
    # Monitoring
    sentry_dsn: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Create global settings instance
settings = Settings()

# Tier configurations
TIER_CONFIGS = {
    "free": {
        "name": "Free",
        "daily_limit": settings.rate_limit_free_daily,
        "features": [
            "client_side_conversion",
            "copy_to_clipboard", 
            "chatgpt_export",
            "claude_export",
            "seo_pages_access"
        ],
        "price_monthly": 0
    },
    "power": {
        "name": "Power User",
        "daily_limit": None,  # Unlimited
        "features": [
            "unlimited_conversions",
            "conversion_library",
            "advanced_export",
            "context_templates",
            "browser_extension",
            "priority_conversion"
        ],
        "price_monthly": 5
    },
    "pro": {
        "name": "Pro",
        "daily_limit": None,  # Unlimited
        "features": [
            "mcp_server_access",
            "api_access",
            "advanced_context_tools",
            "team_sharing",
            "analytics_dashboard",
            "priority_support"
        ],
        "price_monthly": 15
    },
    "enterprise": {
        "name": "Enterprise",
        "daily_limit": None,  # Unlimited
        "features": [
            "self_hosted_mcp",
            "custom_rate_limits",
            "sso_integration",
            "custom_features",
            "sla_guarantees",
            "dedicated_support"
        ],
        "price_monthly": None  # Custom pricing
    }
}

def get_tier_config(tier: str) -> dict:
    """Get configuration for a specific tier"""
    return TIER_CONFIGS.get(tier, TIER_CONFIGS["free"])

def can_access_feature(tier: str, feature: str) -> bool:
    """Check if a tier has access to a specific feature"""
    tier_config = get_tier_config(tier)
    return feature in tier_config["features"]

def get_daily_limit(tier: str) -> Optional[int]:
    """Get daily conversion limit for a tier"""
    tier_config = get_tier_config(tier)
    return tier_config["daily_limit"]