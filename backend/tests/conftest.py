"""Test configuration and fixtures."""

import pytest
import asyncio
from typing import AsyncGenerator, Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.types import TypeDecorator, String

from app.main import app
from app.db.database import Base, get_db
from app.core.config import settings
from app.models import User, Conversion, ContextStack, ApiKey
from app.core.auth import get_password_hash, create_tokens_for_user
import uuid

# Test database URL - use in-memory SQLite for tests
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

# Handle UUID for SQLite in tests
class SqliteUUID(TypeDecorator):
    """SQLite-compatible UUID type"""
    impl = String
    cache_ok = True
    
    def load_dialect_impl(self, dialect):
        return dialect.type_descriptor(String(36))
    
    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif isinstance(value, uuid.UUID):
            return str(value)
        else:
            return str(value)
    
    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            return uuid.UUID(value)

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Add UUID support to SQLite for testing
from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler

def visit_UUID(self, type_, **kw):
    return "VARCHAR(36)"

SQLiteTypeCompiler.visit_UUID = visit_UUID

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with a test database session."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def test_user(db_session) -> User:
    """Create a test user."""
    user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        hashed_password=get_password_hash("testpassword123"),
        tier="free",
        is_active=True,
        is_verified=True,
        usage_count=0
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def power_user(db_session) -> User:
    """Create a power tier test user."""
    user = User(
        id=uuid.uuid4(),
        email="power@example.com",
        hashed_password=get_password_hash("testpassword123"),
        tier="power",
        is_active=True,
        is_verified=True,
        usage_count=0
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def pro_user(db_session) -> User:
    """Create a pro tier test user."""
    user = User(
        id=uuid.uuid4(),
        email="pro@example.com",
        hashed_password=get_password_hash("testpassword123"),
        tier="pro",
        is_active=True,
        is_verified=True,
        usage_count=0
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def auth_headers(test_user: User):
    """Generate auth headers for test user."""
    tokens = create_tokens_for_user(test_user)
    return {"Authorization": f"Bearer {tokens['access_token']}"}

@pytest.fixture
def power_auth_headers(power_user: User):
    """Generate auth headers for power user."""
    tokens = create_tokens_for_user(power_user)
    return {"Authorization": f"Bearer {tokens['access_token']}"}

@pytest.fixture
def pro_auth_headers(pro_user: User):
    """Generate auth headers for pro user."""
    tokens = create_tokens_for_user(pro_user)
    return {"Authorization": f"Bearer {tokens['access_token']}"}

@pytest.fixture
def sample_conversion(db_session, test_user: User) -> Conversion:
    """Create a sample conversion."""
    conversion = Conversion(
        id=uuid.uuid4(),
        slug="test-conversion",
        user_id=test_user.id,
        source_url="https://example.com/test",
        title="Test Article",
        domain="example.com",
        content="This is test content for the article.",
        meta_description="A test article",
        word_count=100,
        reading_time=1,
        is_public=True,
        view_count=0
    )
    db_session.add(conversion)
    db_session.commit()
    db_session.refresh(conversion)
    return conversion

@pytest.fixture
def sample_context_stack(db_session, test_user: User) -> ContextStack:
    """Create a sample context stack."""
    context_stack = ContextStack(
        id=uuid.uuid4(),
        user_id=test_user.id,
        name="Test Context Stack",
        description="A test context stack",
        blocks=[
            {
                "id": "block-1",
                "type": "url",
                "url": "https://example.com/1",
                "title": "Example 1",
                "content": "Content 1",
                "order": 0
            },
            {
                "id": "block-2",
                "type": "text",
                "content": "Some text content",
                "order": 1
            }
        ],
        is_template=False,
        is_public=False,
        use_count=0
    )
    db_session.add(context_stack)
    db_session.commit()
    db_session.refresh(context_stack)
    return context_stack

@pytest.fixture
def mock_jina_response():
    """Mock response from Jina Reader API."""
    return {
        "code": 200,
        "status": "success",
        "data": {
            "title": "Test Article",
            "description": "A test article description",
            "url": "https://example.com/test",
            "content": "This is the converted markdown content of the article.",
            "usage": {
                "tokens": 150
            }
        }
    }

# Test environment overrides
@pytest.fixture(autouse=True)
def override_settings():
    """Override settings for testing."""
    original_jwt_secret = settings.jwt_secret_key
    original_database_url = settings.database_url
    
    # Use test values
    settings.jwt_secret_key = "test-jwt-secret-key-for-testing-only"
    settings.database_url = SQLALCHEMY_TEST_DATABASE_URL
    settings.environment = "testing"
    
    yield
    
    # Restore original values
    settings.jwt_secret_key = original_jwt_secret
    settings.database_url = original_database_url