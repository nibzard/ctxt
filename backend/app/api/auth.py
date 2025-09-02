from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.db.database import get_db
from app.models import User
from app.schemas import (
    UserCreate, 
    UserLogin, 
    User as UserSchema,
    Token,
    UsageStats,
    ApiKeyCreate,
    ApiKeyResponse
)
from app.core.auth import (
    verify_password, 
    get_password_hash, 
    create_tokens_for_user,
    verify_token,
    get_current_active_user,
    generate_api_key
)
from app.core.config import get_daily_limit
from app.core.exceptions import (
    AuthenticationError,
    ValidationError,
    DatabaseError
)
from app.core.validators import (
    EmailValidator,
    PasswordValidator,
    APIKeyValidator
)
import logging
from datetime import datetime, timedelta
import uuid

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()

@router.post("/register", response_model=Token)
async def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """Register a new user"""
    try:
        # Validate email and password
        validated_email = EmailValidator.validate_email(user_data.email)
        validated_password = PasswordValidator.validate_password(user_data.password)
        
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == validated_email).first()
        if existing_user:
            raise ValidationError("Email already registered", "email", validated_email)
        
        # Create new user
        hashed_password = get_password_hash(validated_password)
        user = User(
            id=uuid.uuid4(),
            email=validated_email,
            hashed_password=hashed_password,
            tier="free",
            is_active=True,
            is_verified=False,
            usage_count=0
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create tokens
        tokens = create_tokens_for_user(user)
        
        logger.info(f"New user registered: {user.email}")
        
        return Token(**tokens, user=user)
        
    except IntegrityError:
        db.rollback()
        raise ValidationError("Email already registered", "email", validated_email)
    except (ValidationError, AuthenticationError) as e:
        # Re-raise custom exceptions
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"Registration error: {str(e)}")
        raise DatabaseError("User registration failed", "create_user")

@router.post("/login", response_model=Token)
async def login_user(
    user_data: UserLogin,
    db: Session = Depends(get_db)
):
    """Login user"""
    user = db.query(User).filter(User.email == user_data.email).first()
    
    # Validate email format
    validated_email = EmailValidator.validate_email(user_data.email)
    
    if not user:
        raise AuthenticationError("Invalid email or password")
    
    if not verify_password(user_data.password, user.hashed_password):
        raise AuthenticationError("Invalid email or password")
    
    if not user.is_active:
        raise AuthenticationError("Account is inactive")
    
    # Update last login
    user.last_login_at = datetime.utcnow()
    db.commit()
    
    # Create tokens
    tokens = create_tokens_for_user(user)
    
    logger.info(f"User logged in: {user.email}")
    
    return Token(**tokens, user=user)

@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token"""
    try:
        token_data = verify_token(refresh_token, token_type="refresh")
        user = db.query(User).filter(User.id == token_data.user_id).first()
        
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        # Create new tokens
        tokens = create_tokens_for_user(user)
        
        return Token(**tokens, user=user)
        
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

@router.get("/me", response_model=UserSchema)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user information"""
    return current_user

@router.get("/usage", response_model=UsageStats)
async def get_usage_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's usage statistics"""
    # Calculate daily usage (last 24 hours)
    yesterday = datetime.utcnow() - timedelta(days=1)
    from app.models import Conversion
    daily_conversions = db.query(Conversion).filter(
        Conversion.user_id == current_user.id,
        Conversion.created_at >= yesterday
    ).count()
    
    # Calculate monthly usage (last 30 days)
    month_ago = datetime.utcnow() - timedelta(days=30)
    monthly_conversions = db.query(Conversion).filter(
        Conversion.user_id == current_user.id,
        Conversion.created_at >= month_ago
    ).count()
    
    # Get daily limit for user's tier
    daily_limit = get_daily_limit(current_user.tier)
    quota_remaining = None
    reset_at = None
    
    if daily_limit:
        quota_remaining = max(0, daily_limit - daily_conversions)
        # Reset at midnight UTC
        tomorrow = datetime.utcnow().replace(
            hour=0, minute=0, second=0, microsecond=0
        ) + timedelta(days=1)
        reset_at = tomorrow
    
    return UsageStats(
        daily_conversions=daily_conversions,
        monthly_conversions=monthly_conversions,
        total_conversions=current_user.usage_count,
        quota_remaining=quota_remaining,
        reset_at=reset_at
    )

@router.post("/api-keys", response_model=ApiKeyResponse)
async def create_api_key(
    key_data: ApiKeyCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create new API key for user"""
    from app.models import ApiKey
    
    # Generate API key
    full_key, prefix, key_hash = generate_api_key()
    
    # Calculate expiration
    expires_at = None
    if key_data.expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=key_data.expires_in_days)
    
    # Create API key record
    api_key = ApiKey(
        id=uuid.uuid4(),
        user_id=current_user.id,
        name=key_data.name,
        prefix=prefix,
        key_hash=key_hash,
        scopes=key_data.scopes,
        is_active=True,
        expires_at=expires_at,
        usage_count=0
    )
    
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    
    logger.info(f"API key created for user {current_user.email}: {prefix}")
    
    return ApiKeyResponse(
        key=full_key,
        api_key_info=api_key
    )

@router.delete("/logout")
async def logout_user(
    current_user: User = Depends(get_current_active_user)
):
    """Logout user (client should discard tokens)"""
    logger.info(f"User logged out: {current_user.email}")
    return {"message": "Successfully logged out"}