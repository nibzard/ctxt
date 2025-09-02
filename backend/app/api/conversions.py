from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import List, Optional
from app.db.database import get_db
from app.models import Conversion, User
from app.schemas import (
    ConversionRequest, 
    Conversion as ConversionSchema,
    ConversionList,
    ConversionSave,
    ConversionResponse,
    ConversionCreateFromClient
)
from app.services.conversion import conversion_service
from app.services.rate_limiter import rate_limiter
from app.core.auth import get_current_active_user, get_current_user_optional
from app.core.exceptions import (
    ConversionError, 
    RateLimitError, 
    ValidationError,
    ResourceNotFoundError
)
from app.core.validators import URLValidator, validate_pagination
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/test")
async def test_endpoint():
    """Simple test endpoint"""
    return {"message": "Test endpoint works"}

@router.post("/convert")
async def convert_url(
    request: ConversionRequest
):
    """Convert a URL to markdown format"""
    try:
        # Temporarily disable database operations for testing
        rate_info = {
            "allowed": True,
            "tier": "free",
            "daily_limit": 5,
            "remaining": 4,
            "reset_time": None,
            "current_usage": 1
        }
        
        if not rate_info["allowed"]:
            # Add rate limit headers
            headers = rate_limiter.get_rate_limit_headers(rate_info)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. You've used {rate_info['current_usage']}/{rate_info['daily_limit']} conversions today. Limit resets at {rate_info['reset_time']}",
                headers=headers
            )
        
        # Convert URL using service
        conversion_data = await conversion_service.convert_url(
            str(request.url), 
            request.options
        )
        
        # Generate slug - temporarily just use a simple slug
        import uuid
        slug = f"test-{str(uuid.uuid4())[:8]}"
        
        # Return a mock conversion for testing
        from app.schemas import Conversion as ConversionSchema
        conversion = {
            "id": str(uuid.uuid4()),
            "slug": slug,
            "user_id": None,
            "source_url": conversion_data["source_url"],
            "title": conversion_data["title"],
            "domain": conversion_data["domain"],
            "content": conversion_data["content"],
            "meta_description": conversion_data["meta_description"],
            "word_count": conversion_data["word_count"],
            "reading_time": conversion_data["reading_time"],
            "view_count": 0,
            "created_at": "2025-09-02T16:00:00Z"
        }
        
        logger.info(f"Converted URL successfully: {request.url} -> {slug}")
        
        # Add rate limit headers to response
        # Note: In FastAPI, headers need to be added via Response object
        # For now, we'll include rate info in response metadata
        conversion["_rate_limit"] = rate_info
        
        return conversion
        
    except Exception as e:
        logger.error(f"Error converting URL {request.url}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Conversion failed: {str(e)}"
        )

@router.post("/conversions", response_model=ConversionSchema)
async def create_conversion(
    request: ConversionCreateFromClient,
    db: Session = Depends(get_db)
):
    """Create a new conversion from client-side processed data"""
    try:
        # Generate slug
        import uuid
        import re
        from urllib.parse import urlparse
        from datetime import datetime
        
        # Use the conversion service to generate proper slug
        slug_base = conversion_service.generate_slug(request.source_url, request.title)
        slug = conversion_service.ensure_unique_slug(db, slug_base)
        
        # Calculate word count and reading time
        word_count = len(request.content.split()) if request.content else 0
        reading_time = max(1, round(word_count / 200))  # 200 words per minute
        
        # Extract domain
        domain = urlparse(request.source_url).netloc.replace('www.', '')
        
        # Create conversion object and save to database
        conversion = Conversion(
            id=uuid.uuid4(),
            slug=slug,
            source_url=request.source_url,
            title=request.title,
            domain=domain,
            content=request.content,
            meta_description=request.meta_description,
            word_count=word_count,
            reading_time=reading_time,
            is_public=True,
            view_count=0
        )
        
        db.add(conversion)
        db.commit()
        db.refresh(conversion)
        
        logger.info(f"Created conversion successfully: {request.source_url} -> {slug}")
        
        return conversion
        
    except Exception as e:
        logger.error(f"Error creating conversion: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create conversion: {str(e)}"
        )

@router.post("/conversions/{conversion_id}/save", response_model=ConversionResponse)
async def save_conversion(
    conversion_id: str,
    save_data: ConversionSave,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Save a conversion to user's library"""
    conversion = db.query(Conversion).filter(Conversion.id == conversion_id).first()
    
    if not conversion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversion not found"
        )
    
    # Update conversion with user info
    conversion.user_id = current_user.id
    conversion.is_public = save_data.make_public
    
    # Process tags if provided
    if save_data.tags:
        # Convert tags to topics array for storage
        conversion.topics = save_data.tags
    
    db.commit()
    
    return ConversionResponse(
        slug=conversion.slug,
        permanent_url=f"https://ctxt.help/read/{conversion.slug}",
        seo_optimized=True
    )

@router.get("/conversions", response_model=ConversionList)
async def list_conversions(
    search: Optional[str] = None,
    limit: int = 10,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List user's saved conversions"""
    query = db.query(Conversion).filter(Conversion.user_id == current_user.id)
    
    if search:
        # Use parameterized query to prevent SQL injection
        search_pattern = f"%{search}%"
        query = query.filter(
            Conversion.title.ilike(search_pattern) |
            Conversion.content.ilike(search_pattern)
        )
    
    total = query.count()
    conversions = query.order_by(Conversion.created_at.desc()).offset(offset).limit(limit).all()
    
    return ConversionList(
        items=conversions,
        total=total,
        limit=limit,
        offset=offset
    )

@router.get("/conversions/{conversion_id}", response_model=ConversionSchema)
async def get_conversion(
    conversion_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific conversion"""
    query = db.query(Conversion).filter(
        Conversion.id == conversion_id,
        Conversion.is_public == True
    )
    
    conversion = query.first()
    
    if not conversion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversion not found"
        )
    
    # Increment view count
    conversion.view_count += 1
    db.commit()
    
    return conversion

@router.delete("/conversions/{conversion_id}")
async def delete_conversion(
    conversion_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a conversion"""
    conversion = db.query(Conversion).filter(
        Conversion.id == conversion_id,
        Conversion.user_id == current_user.id
    ).first()
    
    if not conversion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversion not found"
        )
    
    db.delete(conversion)
    db.commit()
    
    return {"message": "Conversion deleted successfully"}

@router.get("/conversions/slug/{slug}", response_model=ConversionSchema)
async def get_conversion_by_slug(
    slug: str,
    db: Session = Depends(get_db)
):
    """Get a conversion by slug for SSR/frontend data fetching"""
    conversion = db.query(Conversion).filter(
        Conversion.slug == slug,
        Conversion.is_public == True
    ).first()
    
    if not conversion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversion with slug '{slug}' not found"
        )
    
    return conversion

@router.post("/conversions/slug/{slug}/view")
async def increment_view_count(
    slug: str,
    db: Session = Depends(get_db)
):
    """Increment view count for a conversion"""
    conversion = db.query(Conversion).filter(
        Conversion.slug == slug,
        Conversion.is_public == True
    ).first()
    
    if not conversion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversion with slug '{slug}' not found"
        )
    
    # Increment view count
    conversion.view_count += 1
    conversion.last_viewed_at = func.now()
    db.commit()
    
    return {"message": "View count updated", "view_count": conversion.view_count}