from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.models import Conversion, User
from app.schemas import (
    ConversionRequest, 
    Conversion as ConversionSchema,
    ConversionList,
    ConversionSave,
    ConversionResponse
)
from app.services.conversion import conversion_service
from app.services.rate_limiter import rate_limiter
from app.core.auth import get_current_active_user
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

@router.post("/convert")
async def convert_url(
    request: ConversionRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_active_user)
):
    """Convert a URL to markdown format"""
    try:
        # Check rate limiting based on user tier
        rate_info = rate_limiter.check_rate_limit(db, current_user)
        
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
        
        # Generate slug
        slug = conversion_service.generate_slug(
            conversion_data["source_url"], 
            conversion_data["title"]
        )
        slug = conversion_service.ensure_unique_slug(db, slug)
        
        # Create conversion record
        conversion = Conversion(
            slug=slug,
            user_id=current_user.id if current_user else None,
            source_url=conversion_data["source_url"],
            title=conversion_data["title"],
            domain=conversion_data["domain"],
            content=conversion_data["content"],
            meta_description=conversion_data["meta_description"],
            word_count=conversion_data["word_count"],
            reading_time=conversion_data["reading_time"]
        )
        
        db.add(conversion)
        db.commit()
        db.refresh(conversion)
        
        logger.info(f"Converted URL successfully: {request.url} -> {slug}")
        
        # Add rate limit headers to response
        # Note: In FastAPI, headers need to be added via Response object
        # For now, we'll include rate info in response metadata
        response_data = {
            **conversion.__dict__,
            "_rate_limit": rate_info
        }
        
        return conversion
        
    except Exception as e:
        logger.error(f"Error converting URL {request.url}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Conversion failed: {str(e)}"
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
    db: Session = Depends(get_db),
    current_user: Optional[User] = None
):
    """Get a specific conversion"""
    query = db.query(Conversion).filter(Conversion.id == conversion_id)
    
    # If not authenticated, only show public conversions
    if not current_user:
        query = query.filter(Conversion.is_public == True)
    else:
        # Show user's own conversions or public ones
        query = query.filter(
            (Conversion.user_id == current_user.id) | 
            (Conversion.is_public == True)
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