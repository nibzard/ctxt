"""Authentication and authorization service."""

from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.services.base import CRUDService
from app.models import User, ApiKey
from app.core.auth import (
    verify_password, 
    get_password_hash, 
    create_tokens_for_user,
    generate_api_key
)
from app.core.exceptions import AuthenticationError, ValidationError
from app.core.validators import EmailValidator, PasswordValidator
import logging
import uuid

logger = logging.getLogger(__name__)


class AuthService(CRUDService[User]):
    """Service for authentication and user management."""
    
    def __init__(self):
        super().__init__(User)
    
    async def register_user(self, db: Session, email: str, password: str) -> Dict[str, Any]:
        """Register a new user."""
        # Validate input
        validated_email = EmailValidator.validate_email(email)
        validated_password = PasswordValidator.validate_password(password)
        
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == validated_email).first()
        if existing_user:
            raise ValidationError("Email already registered", "email", validated_email)
        
        # Create new user
        user_data = {
            "id": uuid.uuid4(),
            "email": validated_email,
            "hashed_password": get_password_hash(validated_password),
            "tier": "free",
            "is_active": True,
            "is_verified": False,
            "usage_count": 0
        }
        
        user = self.create(db, user_data)
        tokens = create_tokens_for_user(user)
        
        self.logger.info(f"User registered successfully: {validated_email}")
        
        return {
            "user": user,
            "tokens": tokens
        }
    
    async def authenticate_user(self, db: Session, email: str, password: str) -> Dict[str, Any]:
        """Authenticate user with email and password."""
        validated_email = EmailValidator.validate_email(email)
        
        user = db.query(User).filter(User.email == validated_email).first()
        
        if not user:
            raise AuthenticationError("Invalid email or password")
        
        if not verify_password(password, user.hashed_password):
            raise AuthenticationError("Invalid email or password")
        
        if not user.is_active:
            raise AuthenticationError("Account is inactive")
        
        # Update last login
        user.last_login_at = datetime.utcnow()
        db.commit()
        
        tokens = create_tokens_for_user(user)
        
        self.logger.info(f"User authenticated successfully: {validated_email}")
        
        return {
            "user": user,
            "tokens": tokens
        }
    
    def create_api_key(
        self, 
        db: Session, 
        user_id: str, 
        name: str, 
        scopes: list[str],
        expires_in_days: Optional[int] = None
    ) -> Dict[str, Any]:
        """Create a new API key for user."""
        # Generate API key
        full_key, prefix, key_hash = generate_api_key()
        
        # Calculate expiration
        expires_at = None
        if expires_in_days:
            expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
        
        # Create API key record
        api_key_data = {
            "id": uuid.uuid4(),
            "user_id": user_id,
            "name": name,
            "prefix": prefix,
            "key_hash": key_hash,
            "scopes": scopes,
            "is_active": True,
            "expires_at": expires_at,
            "usage_count": 0
        }
        
        api_key = ApiKey(**api_key_data)
        db.add(api_key)
        db.commit()
        db.refresh(api_key)
        
        self.logger.info(f"API key created for user {user_id}: {prefix}")
        
        return {
            "key": full_key,  # Only returned once
            "api_key_info": api_key
        }
    
    def get_user_api_keys(self, db: Session, user_id: str) -> list[ApiKey]:
        """Get all API keys for a user."""
        return db.query(ApiKey).filter(
            ApiKey.user_id == user_id,
            ApiKey.is_active == True
        ).order_by(ApiKey.created_at.desc()).all()
    
    def deactivate_api_key(self, db: Session, user_id: str, key_id: str) -> bool:
        """Deactivate an API key."""
        api_key = db.query(ApiKey).filter(
            ApiKey.id == key_id,
            ApiKey.user_id == user_id
        ).first()
        
        if not api_key:
            return False
        
        api_key.is_active = False
        db.commit()
        
        self.logger.info(f"API key deactivated: {api_key.prefix}")
        return True
    
    def update_user_tier(self, db: Session, user_id: str, new_tier: str) -> Optional[User]:
        """Update user subscription tier."""
        user = self.get_by_id(db, user_id)
        if not user:
            return None
        
        user.tier = new_tier
        db.commit()
        db.refresh(user)
        
        self.logger.info(f"User tier updated: {user.email} -> {new_tier}")
        return user
    
    def increment_usage(self, db: Session, user_id: str) -> None:
        """Increment user's usage count."""
        user = self.get_by_id(db, user_id)
        if user:
            user.usage_count += 1
            db.commit()
    
    def get_usage_stats(self, db: Session, user_id: str) -> Dict[str, Any]:
        """Get user's usage statistics."""
        user = self.get_by_id(db, user_id)
        if not user:
            return {}
        
        # Calculate daily usage (last 24 hours)
        yesterday = datetime.utcnow() - timedelta(days=1)
        from app.models import Conversion
        daily_conversions = db.query(Conversion).filter(
            Conversion.user_id == user_id,
            Conversion.created_at >= yesterday
        ).count()
        
        # Calculate monthly usage (last 30 days)
        month_ago = datetime.utcnow() - timedelta(days=30)
        monthly_conversions = db.query(Conversion).filter(
            Conversion.user_id == user_id,
            Conversion.created_at >= month_ago
        ).count()
        
        # Get daily limit for user's tier
        from app.core.config import get_daily_limit
        daily_limit = get_daily_limit(user.tier)
        quota_remaining = None
        reset_at = None
        
        if daily_limit:
            quota_remaining = max(0, daily_limit - daily_conversions)
            # Reset at midnight UTC
            tomorrow = datetime.utcnow().replace(
                hour=0, minute=0, second=0, microsecond=0
            ) + timedelta(days=1)
            reset_at = tomorrow
        
        return {
            "daily_conversions": daily_conversions,
            "monthly_conversions": monthly_conversions,
            "total_conversions": user.usage_count,
            "quota_remaining": quota_remaining,
            "reset_at": reset_at
        }