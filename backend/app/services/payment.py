"""Payment processing service using Polar.sh."""

from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.services.base import BaseService, ExternalService
from app.models import User
from app.core.config import settings
from app.core.exceptions import PaymentError, ConfigurationError
import logging

try:
    from polar_sdk import Polar
    from polar_sdk.models import CheckoutCreate, CheckoutPublic
except ImportError:
    Polar = None
    CheckoutCreate = None
    CheckoutPublic = None

logger = logging.getLogger(__name__)


class PolarClient(ExternalService):
    """Client for Polar.sh payment processing."""
    
    def __init__(self):
        super().__init__("Polar", "https://api.polar.sh")
        
        if not Polar:
            raise ConfigurationError("Polar SDK not installed", "polar_sdk")
        
        if not settings.polar_access_token:
            raise ConfigurationError("Polar access token not configured", "polar_access_token")
        
        self.client = Polar(access_token=settings.polar_access_token)
    
    async def create_checkout_session(
        self, 
        product_id: str, 
        success_url: str,
        customer_email: Optional[str] = None,
        metadata: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Create a checkout session."""
        try:
            checkout_data = CheckoutCreate(
                product_id=product_id,
                success_url=success_url,
                customer_email=customer_email,
                metadata=metadata or {}
            )
            
            checkout = self.client.checkouts.create(checkout_data)
            
            return {
                "checkout_id": checkout.id,
                "checkout_url": checkout.url,
                "expires_at": checkout.expires_at
            }
        except Exception as e:
            self._handle_external_error(e, "create_checkout_session")
    
    async def get_checkout_status(self, checkout_id: str) -> Dict[str, Any]:
        """Get checkout session status."""
        try:
            checkout = self.client.checkouts.get(checkout_id)
            
            return {
                "id": checkout.id,
                "status": checkout.status,
                "product_id": checkout.product_id,
                "customer_email": checkout.customer_email,
                "amount": checkout.amount,
                "currency": checkout.currency
            }
        except Exception as e:
            self._handle_external_error(e, "get_checkout_status")
    
    async def get_subscription_status(self, subscription_id: str) -> Dict[str, Any]:
        """Get subscription status."""
        try:
            subscription = self.client.subscriptions.get(subscription_id)
            
            return {
                "id": subscription.id,
                "status": subscription.status,
                "current_period_start": subscription.current_period_start,
                "current_period_end": subscription.current_period_end,
                "cancel_at_period_end": subscription.cancel_at_period_end
            }
        except Exception as e:
            self._handle_external_error(e, "get_subscription_status")


class PaymentService(BaseService):
    """Service for handling payment operations."""
    
    def __init__(self):
        super().__init__()
        try:
            self.polar_client = PolarClient()
        except ConfigurationError as e:
            self.logger.warning(f"Polar client not configured: {e.detail}")
            self.polar_client = None
    
    def get_available_products(self) -> List[Dict[str, Any]]:
        """Get available subscription products."""
        products = []
        
        # Power User tier
        if settings.polar_power_product_id:
            products.append({
                "id": settings.polar_power_product_id,
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
            })
        
        # Pro tier
        if settings.polar_pro_product_id:
            products.append({
                "id": settings.polar_pro_product_id,
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
            })
        
        # Enterprise tier
        if settings.polar_enterprise_product_id:
            products.append({
                "id": settings.polar_enterprise_product_id,
                "name": "Enterprise",
                "description": "Self-hosted, custom features, and dedicated support",
                "price": None,  # Custom pricing
                "currency": "USD",
                "interval": "custom",
                "tier": "enterprise",
                "features": [
                    "Self-hosted MCP server",
                    "Custom rate limits",
                    "SSO integration",
                    "Custom features",
                    "SLA guarantees",
                    "Dedicated support"
                ],
                "contact_required": True
            })
        
        # If no products configured, show warning
        if not products:
            self.logger.warning("No Polar product IDs configured")
            products.append({
                "id": "configuration_required",
                "name": "Configuration Required",
                "description": "Polar product IDs need to be configured",
                "price": 0,
                "currency": "USD",
                "interval": "month",
                "tier": "free",
                "features": ["Configuration required"],
                "disabled": True
            })
        
        return products
    
    async def create_checkout_session(
        self, 
        db: Session,
        user_id: str, 
        product_id: str
    ) -> Dict[str, Any]:
        """Create a payment checkout session."""
        if not self.polar_client:
            raise PaymentError("Payment system not configured")
        
        # Get user info
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise PaymentError("User not found")
        
        # Find product info
        products = self.get_available_products()
        product = next((p for p in products if p["id"] == product_id), None)
        if not product:
            raise PaymentError("Product not found")
        
        if product.get("disabled"):
            raise PaymentError("Product not available")
        
        # Create checkout session
        success_url = settings.polar_success_url or "http://localhost:5173/success?checkout_id={CHECKOUT_ID}"
        success_url = success_url.replace("{CHECKOUT_ID}", "{checkout_id}")
        
        try:
            checkout_data = await self.polar_client.create_checkout_session(
                product_id=product_id,
                success_url=success_url,
                customer_email=user.email,
                metadata={
                    "user_id": str(user_id),
                    "tier": product["tier"]
                }
            )
            
            self.logger.info(f"Checkout session created for user {user_id}: {checkout_data['checkout_id']}")
            
            return {
                "checkout_url": checkout_data["checkout_url"],
                "checkout_id": checkout_data["checkout_id"],
                "product": product
            }
        except Exception as e:
            self.logger.error(f"Failed to create checkout session: {str(e)}")
            raise PaymentError("Failed to create checkout session")
    
    async def handle_webhook_event(self, db: Session, event_type: str, event_data: Dict[str, Any]) -> None:
        """Handle Polar webhook events."""
        self.logger.info(f"Processing webhook event: {event_type}")
        
        try:
            if event_type == "checkout.completed":
                await self._handle_checkout_completed(db, event_data)
            elif event_type == "subscription.created":
                await self._handle_subscription_created(db, event_data)
            elif event_type == "subscription.cancelled":
                await self._handle_subscription_cancelled(db, event_data)
            elif event_type == "subscription.updated":
                await self._handle_subscription_updated(db, event_data)
            else:
                self.logger.warning(f"Unhandled webhook event type: {event_type}")
        except Exception as e:
            self.logger.error(f"Webhook processing failed: {str(e)}")
            raise PaymentError(f"Webhook processing failed: {str(e)}")
    
    async def _handle_checkout_completed(self, db: Session, event_data: Dict[str, Any]) -> None:
        """Handle completed checkout."""
        checkout_id = event_data.get("id")
        user_id = event_data.get("metadata", {}).get("user_id")
        tier = event_data.get("metadata", {}).get("tier")
        
        if not user_id or not tier:
            self.logger.error(f"Missing user_id or tier in checkout metadata: {checkout_id}")
            return
        
        # Update user tier
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.tier = tier
            user.polar_customer_id = event_data.get("customer_id")
            db.commit()
            
            self.logger.info(f"User {user_id} upgraded to {tier} tier")
    
    async def _handle_subscription_created(self, db: Session, event_data: Dict[str, Any]) -> None:
        """Handle subscription creation."""
        customer_id = event_data.get("customer_id")
        subscription_id = event_data.get("id")
        
        user = db.query(User).filter(User.polar_customer_id == customer_id).first()
        if user:
            user.polar_subscription_id = subscription_id
            user.subscription_ends_at = datetime.fromisoformat(
                event_data.get("current_period_end", "")
            )
            db.commit()
            
            self.logger.info(f"Subscription created for user {user.id}: {subscription_id}")
    
    async def _handle_subscription_cancelled(self, db: Session, event_data: Dict[str, Any]) -> None:
        """Handle subscription cancellation."""
        subscription_id = event_data.get("id")
        
        user = db.query(User).filter(User.polar_subscription_id == subscription_id).first()
        if user:
            # Downgrade to free tier at period end
            cancel_at = datetime.fromisoformat(event_data.get("cancel_at", ""))
            user.subscription_ends_at = cancel_at
            db.commit()
            
            self.logger.info(f"Subscription cancelled for user {user.id}: {subscription_id}")
    
    async def _handle_subscription_updated(self, db: Session, event_data: Dict[str, Any]) -> None:
        """Handle subscription updates."""
        subscription_id = event_data.get("id")
        
        user = db.query(User).filter(User.polar_subscription_id == subscription_id).first()
        if user:
            user.subscription_ends_at = datetime.fromisoformat(
                event_data.get("current_period_end", "")
            )
            db.commit()
            
            self.logger.info(f"Subscription updated for user {user.id}: {subscription_id}")