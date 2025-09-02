#!/usr/bin/env python3
"""
Database initialization script for ctxt.help
"""

import asyncio
import sys
import os

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.db.database import create_database, engine
from app.models import Base
from app.core.config import settings

def init_database():
    """Initialize the database with tables"""
    print("🗄️  Initializing ctxt.help database...")
    print(f"Database URL: {settings.database_url}")
    
    try:
        # Import all models to ensure they're registered
        from app.models import User, Conversion, ContextStack, ApiKey
        
        print("📋 Creating database tables...")
        Base.metadata.create_all(bind=engine)
        
        print("✅ Database initialization completed successfully!")
        print("\nCreated tables:")
        print("- users")
        print("- conversions") 
        print("- context_stacks")
        print("- api_keys")
        
        return True
        
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        return False

def check_database():
    """Check database connection"""
    print("🔍 Checking database connection...")
    
    try:
        # Test connection
        with engine.connect() as connection:
            result = connection.execute("SELECT 1")
            print("✅ Database connection successful!")
            return True
            
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("\n💡 Make sure PostgreSQL is running and the database exists:")
        print("   docker-compose up -d postgresql")
        return False

if __name__ == "__main__":
    print("🚀 ctxt.help Database Setup")
    print("=" * 40)
    
    # Check connection first
    if not check_database():
        sys.exit(1)
    
    # Initialize tables
    if init_database():
        print("\n🎉 Database setup complete!")
        print("\nNext steps:")
        print("1. Start the backend: uvicorn app.main:app --reload")
        print("2. Visit: http://localhost:8000/docs")
    else:
        sys.exit(1)