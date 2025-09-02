from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import hmac
import hashlib
import json
import logging

from app.core.config import settings
from app.core.auth import get_current_user
from app.db.database import get_db
from app.models import User
from app.services.payment import get_polar_service
from app.schemas.payment import (
    CreateCheckoutRequest,
    CheckoutResponse,
    SubscriptionResponse
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payment", tags=["payment"])
security = HTTPBearer()

@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    request: CreateCheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a checkout session for subscription or one-time purchase"""
    try:
        polar_service = get_polar_service()
        if not polar_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Payment service not configured"
            )
        
        # Create checkout session with Polar
        checkout = await polar_service.create_checkout_session(
            product_ids=request.product_ids,
            user=current_user,
            metadata={
                "user_id": str(current_user.id),
                "user_email": current_user.email,
                "tier": request.tier
            }
        )
        
        if not checkout:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create checkout session"
            )
        
        return CheckoutResponse(
            checkout_id=checkout.id,
            checkout_url=checkout.url
        )
        
    except Exception as e:
        logger.error(f"Failed to create checkout session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create checkout session"
        )

@router.get("/subscription", response_model=SubscriptionResponse)
async def get_user_subscription(
    current_user: User = Depends(get_current_user)
):
    """Get current user's subscription information"""
    try:
        polar_service = get_polar_service()
        if not polar_service:
            # Return basic info without Polar integration
            return SubscriptionResponse(
                has_subscription=False,
                tier=current_user.tier,
                subscription_ends_at=current_user.subscription_ends_at
            )
        
        if not current_user.polar_subscription_id:
            return SubscriptionResponse(
                has_subscription=False,
                tier=current_user.tier,
                subscription_ends_at=current_user.subscription_ends_at
            )
        
        # Get subscription details from Polar
        subscription = await polar_service.get_subscription(
            current_user.polar_subscription_id
        )
        
        if not subscription:
            return SubscriptionResponse(
                has_subscription=False,
                tier=current_user.tier,
                subscription_ends_at=current_user.subscription_ends_at
            )
        
        return SubscriptionResponse(
            has_subscription=True,
            subscription_id=subscription.id,
            tier=current_user.tier,
            status=subscription.status,
            subscription_ends_at=current_user.subscription_ends_at,
            cancel_at_period_end=subscription.cancel_at_period_end if hasattr(subscription, 'cancel_at_period_end') else False
        )
        
    except Exception as e:
        logger.error(f"Failed to get subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve subscription information"
        )

@router.post("/subscription/cancel")
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel user's current subscription"""
    try:
        if not current_user.polar_subscription_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active subscription found"
            )
        
        polar_service = get_polar_service()
        if not polar_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Payment service not configured"
            )
        
        # Cancel subscription with Polar
        success = await polar_service.cancel_subscription(
            current_user.polar_subscription_id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to cancel subscription"
            )
        
        return {"message": "Subscription canceled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel subscription"
        )

@router.post("/webhook")
async def handle_polar_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """Handle Polar webhook events"""
    try:
        # Get the raw body
        body = await request.body()
        
        # Verify webhook signature
        signature = request.headers.get("polar-webhook-signature")
        if not signature or not settings.polar_webhook_secret:
            logger.warning("Missing webhook signature or secret")
            raise HTTPException(status_code=400, detail="Invalid signature")
        
        # Verify the signature
        expected_signature = hmac.new(
            settings.polar_webhook_secret.encode(),
            body,
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(signature, expected_signature):
            logger.warning("Invalid webhook signature")
            raise HTTPException(status_code=400, detail="Invalid signature")
        
        # Parse the event
        try:
            event = json.loads(body.decode())
        except json.JSONDecodeError:
            logger.error("Failed to parse webhook JSON")
            raise HTTPException(status_code=400, detail="Invalid JSON")
        
        event_type = event.get("type")
        event_data = event.get("data", {})
        
        if not event_type:
            logger.error("Missing event type in webhook")
            raise HTTPException(status_code=400, detail="Missing event type")
        
        # Handle the event
        polar_service = get_polar_service()
        if not polar_service:
            logger.error("Polar service not configured for webhook processing")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Payment service not configured"
            )
        
        success = await polar_service.handle_webhook_event(event_type, event_data)
        
        if success:
            return {"message": "Webhook processed successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to process webhook"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/products")
async def list_products():
    """List available products and pricing"""
    try:
        # Return static product configuration with real product IDs
        products = [
            {
                "id": "d8f00ab0-5727-43b8-8799-c9679750d7fe",  # Example Power User product ID
                "name": "Power User",
                "description": "Unlimited conversions, library, exports, and browser extension",
                "price": 5,
                "currency": "USD",
                "interval": "month",
                "tier": "power",
                "features": [
                    "Unlimited conversions",
                    "Conversion library",
                    "Advanced export (PDF, DOCX)",
                    "Context templates",
                    "Browser extension",
                    "Priority conversion"
                ]
            },
            {
                "id": "pro_monthly_product_id",  # Replace with actual Pro product ID from Polar
                "name": "Pro",
                "description": "AI integration, API access, and team features",
                "price": 15,
                "currency": "USD",
                "interval": "month",
                "tier": "pro",
                "features": [
                    "Everything in Power User",
                    "MCP Server access",
                    "API access",
                    "Advanced context tools",
                    "Team sharing",
                    "Analytics dashboard",
                    "Priority support"
                ]
            }
        ]
        
        return {"products": products}
        
    except Exception as e:
        logger.error(f"Failed to list products: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve products"
        )