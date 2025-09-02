from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.error_handlers import setup_error_handlers
from app.middleware.logging import LoggingMiddleware, SecurityHeadersMiddleware, RateLimitLogMiddleware
from app.db.database import get_db, create_database
from app.models import User, Conversion, ContextStack
import os
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO if not settings.debug else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="The LLM Context Builder API - Turn any webpage into perfect LLM input",
    version=settings.version,
    docs_url="/docs",
    redoc_url="/redoc",
    debug=settings.debug
)

# Add middleware in correct order (last added is executed first)
# Security headers
app.add_middleware(SecurityHeadersMiddleware)

# Rate limit logging
app.add_middleware(RateLimitLogMiddleware)

# Request logging
app.add_middleware(LoggingMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup error handlers
setup_error_handlers(app)

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    if settings.environment == "development":
        try:
            # Create tables in development
            create_database()
            print("✅ Database tables created/verified")
        except Exception as e:
            print(f"⚠️  Database initialization failed: {e}")
            print("⚠️  Continue without database for testing purposes")

@app.get("/")
async def root():
    """Root endpoint returning API information"""
    return {
        "message": f"{settings.app_name}",
        "version": settings.version,
        "status": "running",
        "environment": settings.environment,
        "docs": "/docs",
        "endpoints": {
            "health": "/health",
            "auth": "/api/auth",
            "conversions": "/api/conversions",
            "mcp": "/api/mcp",
            "seo": "/read/{slug}"
        }
    }

@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint with database connectivity"""
    try:
        # Test database connection
        db.execute("SELECT 1")
        db_status = "healthy"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "version": settings.version,
        "environment": settings.environment,
        "database": db_status,
        "features": {
            "mcp_server": settings.mcp_server_enabled,
            "seo_pages": settings.seo_pages_enabled,
            "analytics": settings.analytics_enabled
        }
    }

@app.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    """Public statistics endpoint"""
    try:
        user_count = db.query(User).count()
        conversion_count = db.query(Conversion).count()
        public_conversions = db.query(Conversion).filter(Conversion.is_public == True).count()
        context_stacks = db.query(ContextStack).count()
        
        return {
            "users": user_count,
            "total_conversions": conversion_count,
            "public_conversions": public_conversions,
            "context_stacks": context_stacks
        }
    except Exception:
        return {
            "users": 0,
            "total_conversions": 0,
            "public_conversions": 0,
            "context_stacks": 0
        }

# API Routes
try:
    from app.api import conversions
    app.include_router(conversions.router, prefix="/api", tags=["conversions"])
    print("✅ Conversions API routes loaded")
except ImportError as e:
    print(f"⚠️  Could not load conversions routes: {e}")

try:
    from app.api import auth
    app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
    print("✅ Auth API routes loaded")
except ImportError as e:
    print(f"⚠️  Could not load auth routes: {e}")

try:
    from app.api import context_stacks
    app.include_router(context_stacks.router, prefix="/api/context-stacks", tags=["context-stacks"])
    print("✅ Context Stacks API routes loaded")
except ImportError as e:
    print(f"⚠️  Could not load context stacks routes: {e}")

# Payment routes temporarily disabled due to missing service
# try:
#     from app.api import payment
#     app.include_router(payment.router, prefix="/api", tags=["payment"])
#     print("✅ Payment API routes loaded")
# except ImportError as e:
#     print(f"⚠️  Could not load payment routes: {e}")
print("⚠️  Payment routes disabled (missing polar service implementation)")

# SEO Routes
try:
    from app.api import seo
    app.include_router(seo.router, prefix="", tags=["seo"])
    print("✅ SEO routes loaded")
except ImportError as e:
    print(f"⚠️  Could not load SEO routes: {e}")

# Additional routes will be added here
# TODO: Implement MCP and user management routes
# from app.api import users, mcp
# app.include_router(users.router, prefix="/api/users", tags=["users"])
# app.include_router(mcp.router, prefix="/api/mcp", tags=["mcp"])

# Exception handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=404,
        content={"detail": "The requested resource was not found"}
    )

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level="debug" if settings.debug else "info"
    )