from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text, ARRAY, UUID, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base
import uuid

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    tier = Column(String(20), default="free", nullable=False)  # free, power, pro, enterprise
    api_key = Column(String(64), unique=True, nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Usage tracking
    usage_count = Column(Integer, default=0)
    last_reset_at = Column(DateTime(timezone=True), default=func.now())
    
    # Subscription info
    subscription_ends_at = Column(DateTime(timezone=True), nullable=True)
    polar_customer_id = Column(String, nullable=True)
    polar_subscription_id = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

    # Relationships
    conversions = relationship("Conversion", back_populates="user")
    context_stacks = relationship("ContextStack", back_populates="user")

class Conversion(Base):
    __tablename__ = "conversions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    
    # Source information
    source_url = Column(Text, nullable=False)
    title = Column(String(300), nullable=True)
    domain = Column(String(255), nullable=True, index=True)
    
    # Content
    content = Column(Text, nullable=False)
    
    # SEO and metadata
    meta_description = Column(String(200), nullable=True)
    word_count = Column(Integer, nullable=True)
    reading_time = Column(Integer, nullable=True)  # in minutes
    topics = Column(ARRAY(String), nullable=True)
    
    # Settings
    is_public = Column(Boolean, default=True)
    is_indexed = Column(Boolean, default=True)  # For SEO indexing
    
    # Analytics
    view_count = Column(Integer, default=0)
    last_viewed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="conversions")

class ContextStack(Base):
    __tablename__ = "context_stacks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Basic info
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Content structure stored as JSONB
    blocks = Column(JSONB, nullable=False)
    
    # Template settings
    is_template = Column(Boolean, default=False)
    is_public = Column(Boolean, default=False)
    
    # Usage tracking
    use_count = Column(Integer, default=0)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="context_stacks")

class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Key information
    key_hash = Column(String, nullable=False, unique=True, index=True)
    name = Column(String(100), nullable=False)  # User-friendly name
    prefix = Column(String(10), nullable=False)  # First few chars for identification
    
    # Permissions and limits
    scopes = Column(ARRAY(String), nullable=False, default=lambda: [])  # ['convert', 'library', 'context']
    rate_limit_per_hour = Column(Integer, default=100)
    
    # Status
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    usage_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)

# Performance indexes
Index('idx_conversions_created_at', Conversion.created_at.desc())
Index('idx_conversions_view_count', Conversion.view_count.desc())
Index('idx_conversions_user_created', Conversion.user_id, Conversion.created_at.desc())
Index('idx_users_tier_created', User.tier, User.created_at.desc())
Index('idx_context_stacks_user_created', ContextStack.user_id, ContextStack.created_at.desc())