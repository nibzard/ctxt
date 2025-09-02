from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.models import User, Conversion
from app.core.config import get_daily_limit
import logging

logger = logging.getLogger(__name__)

class RateLimiter:
    """Rate limiting service for conversions based on user tier"""
    
    @staticmethod
    def check_rate_limit(db: Session, user: Optional[User] = None) -> dict:
        """
        Check if user has exceeded their daily rate limit
        Returns: dict with allowed, remaining, reset_time info
        """
        if not user:
            # For anonymous users, use free tier limits
            tier = "free"
            daily_limit = get_daily_limit(tier)
        else:
            tier = user.tier
            daily_limit = get_daily_limit(tier)
        
        # Unlimited tiers
        if daily_limit is None:
            return {
                "allowed": True,
                "tier": tier,
                "daily_limit": None,
                "remaining": None,
                "reset_time": None,
                "current_usage": 0
            }
        
        # Calculate usage in last 24 hours
        yesterday = datetime.utcnow() - timedelta(days=1)
        
        if user:
            current_usage = db.query(Conversion).filter(
                Conversion.user_id == user.id,
                Conversion.created_at >= yesterday
            ).count()
        else:
            # For anonymous users, we can't track usage precisely
            # Could implement IP-based tracking here if needed
            current_usage = 0
        
        remaining = max(0, daily_limit - current_usage)
        allowed = current_usage < daily_limit
        
        # Reset time is midnight UTC
        reset_time = datetime.utcnow().replace(
            hour=0, minute=0, second=0, microsecond=0
        ) + timedelta(days=1)
        
        result = {
            "allowed": allowed,
            "tier": tier,
            "daily_limit": daily_limit,
            "remaining": remaining,
            "reset_time": reset_time.isoformat(),
            "current_usage": current_usage
        }
        
        if not allowed:
            logger.warning(f"Rate limit exceeded for user {user.id if user else 'anonymous'} (tier: {tier})")
        
        return result
    
    @staticmethod
    def get_rate_limit_headers(rate_info: dict) -> dict:
        """
        Generate standard rate limiting headers
        """
        headers = {
            "X-RateLimit-Tier": rate_info["tier"],
            "X-RateLimit-Used": str(rate_info["current_usage"])
        }
        
        if rate_info["daily_limit"] is not None:
            headers.update({
                "X-RateLimit-Limit": str(rate_info["daily_limit"]),
                "X-RateLimit-Remaining": str(rate_info["remaining"]),
                "X-RateLimit-Reset": rate_info["reset_time"]
            })
        else:
            headers.update({
                "X-RateLimit-Limit": "unlimited",
                "X-RateLimit-Remaining": "unlimited"
            })
        
        return headers

# Singleton instance
rate_limiter = RateLimiter()