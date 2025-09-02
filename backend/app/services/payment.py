from typing import Optional, Dict, Any, List
import asyncio
from datetime import datetime, timedelta
import logging
from sqlalchemy.orm import Session
from polar_sdk import Polar
from polar_sdk.models import (
    CheckoutCreate,
    CheckoutPublic,
    Customer,
    Subscription
)

from app.core.config import settings
from app.models import User
from app.db.database import get_db

logger = logging.getLogger(__name__)

class PolarService:
    """Service for handling Polar.sh payment operations"""
    
    def __init__(self):
        if not settings.polar_access_token:
            raise ValueError("Polar access token not configured")
        
        self.client = Polar(access_token=settings.polar_access_token)
        self.organization_id = settings.polar_organization_id
    
    async def get_or_create_customer(self, user: User) -> Optional[Customer]:
        """Get existing customer or create new one for user"""
        try:
            # First try to find existing customer by email
            customers_response = self.client.customers.list(
                organization_id=self.organization_id,
                email=user.email
            )
            
            if customers_response.result and len(customers_response.result) > 0:
                customer = customers_response.result[0]
                # Update user with customer ID if not set
                if not user.polar_customer_id:
                    user.polar_customer_id = customer.id
                return customer
            
            # Create new customer
            customer_data = {
                "email": user.email,
                "name": user.email,  # Use email as name if no name provided
                "organization_id": self.organization_id
            }
            
            customer = self.client.customers.create(**customer_data)
            
            # Update user with new customer ID
            user.polar_customer_id = customer.id
            
            return customer
            
        except Exception as e:
            logger.error(f"Failed to get/create customer: {e}")
            return None
    
    async def create_checkout_session(
        self,
        product_ids: List[str],
        user: User,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[CheckoutPublic]:
        """Create a checkout session for products"""
        try:
            customer = await asyncio.to_thread(self.get_or_create_customer, user)
            if not customer:
                raise ValueError("Failed to create customer")
            
            # Use the new Polar SDK pattern
            checkout_data = CheckoutCreate(
                products=product_ids,
                success_url=settings.polar_success_url or "http://localhost:3000/success?checkout_id={CHECKOUT_ID}",
                customer_id=customer.id,
                metadata=metadata or {}
            )
            
            checkout = self.client.checkouts.create(checkout_data)
            
            return checkout
            
        except Exception as e:
            logger.error(f"Failed to create checkout session: {e}")
            return None
    
    async def get_subscription(self, subscription_id: str) -> Optional[Subscription]:
        """Get subscription details"""
        try:
            subscription = self.client.subscriptions.get(id=subscription_id)
            return subscription
        except Exception as e:
            logger.error(f"Failed to get subscription {subscription_id}: {e}")
            return None
    
    async def cancel_subscription(self, subscription_id: str) -> bool:
        """Cancel a subscription"""
        try:
            self.client.subscriptions.cancel(id=subscription_id)
            return True
        except Exception as e:
            logger.error(f"Failed to cancel subscription {subscription_id}: {e}")
            return False
    
    async def handle_webhook_event(self, event_type: str, data: Dict[str, Any]) -> bool:
        """Handle incoming webhook events from Polar"""
        try:
            if event_type == "subscription.created":
                return await self._handle_subscription_created(data)
            elif event_type == "subscription.updated":
                return await self._handle_subscription_updated(data)
            elif event_type == "subscription.canceled":
                return await self._handle_subscription_canceled(data)
            elif event_type == "order.created":
                return await self._handle_order_created(data)
            else:
                logger.warning(f"Unhandled webhook event type: {event_type}")
                return True
                
        except Exception as e:
            logger.error(f"Failed to handle webhook event {event_type}: {e}")
            return False
    
    async def _handle_subscription_created(self, data: Dict[str, Any]) -> bool:
        """Handle subscription created webhook"""
        try:
            subscription_id = data.get("id")
            customer_id = data.get("customer_id")
            
            # Find user by customer ID
            db = next(get_db())
            user = db.query(User).filter(User.polar_customer_id == customer_id).first()
            
            if user:
                user.polar_subscription_id = subscription_id
                user.tier = self._get_tier_from_product(data.get("product"))
                user.subscription_ends_at = self._parse_subscription_end_date(data)
                db.commit()
                
                logger.info(f"Updated user {user.id} with subscription {subscription_id}")
                return True
            else:
                logger.warning(f"User not found for customer {customer_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error handling subscription created: {e}")
            return False
    
    async def _handle_subscription_updated(self, data: Dict[str, Any]) -> bool:
        """Handle subscription updated webhook"""
        try:
            subscription_id = data.get("id")
            
            # Find user by subscription ID
            db = next(get_db())
            user = db.query(User).filter(User.polar_subscription_id == subscription_id).first()
            
            if user:
                # Update subscription end date and status
                user.subscription_ends_at = self._parse_subscription_end_date(data)
                
                # Update tier if product changed
                new_tier = self._get_tier_from_product(data.get("product"))
                if new_tier:
                    user.tier = new_tier
                
                db.commit()
                
                logger.info(f"Updated subscription {subscription_id} for user {user.id}")
                return True
            else:
                logger.warning(f"User not found for subscription {subscription_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error handling subscription updated: {e}")
            return False
    
    async def _handle_subscription_canceled(self, data: Dict[str, Any]) -> bool:
        """Handle subscription canceled webhook"""
        try:
            subscription_id = data.get("id")
            
            # Find user by subscription ID
            db = next(get_db())
            user = db.query(User).filter(User.polar_subscription_id == subscription_id).first()
            
            if user:
                # Keep subscription end date but mark as canceled
                # User keeps access until the end of their billing period
                user.polar_subscription_id = None
                db.commit()
                
                logger.info(f"Canceled subscription {subscription_id} for user {user.id}")
                return True
            else:
                logger.warning(f"User not found for subscription {subscription_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error handling subscription canceled: {e}")
            return False
    
    async def _handle_order_created(self, data: Dict[str, Any]) -> bool:
        """Handle one-time order created webhook"""
        try:
            customer_id = data.get("customer_id")
            
            # Find user by customer ID
            db = next(get_db())
            user = db.query(User).filter(User.polar_customer_id == customer_id).first()
            
            if user:
                # Handle one-time purchase (could be tier upgrade, etc.)
                tier = self._get_tier_from_product(data.get("product"))
                if tier:
                    user.tier = tier
                    # For one-time purchases, set end date based on product
                    if tier == "power":
                        user.subscription_ends_at = datetime.utcnow() + timedelta(days=365)
                    
                db.commit()
                
                logger.info(f"Processed order for user {user.id}")
                return True
            else:
                logger.warning(f"User not found for customer {customer_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error handling order created: {e}")
            return False
    
    def _get_tier_from_product(self, product_data: Dict[str, Any]) -> Optional[str]:
        """Extract tier from product data"""
        if not product_data:
            return None
        
        product_name = product_data.get("name", "").lower()
        
        if "power" in product_name:
            return "power"
        elif "pro" in product_name:
            return "pro"
        elif "enterprise" in product_name:
            return "enterprise"
        
        return None
    
    def _parse_subscription_end_date(self, data: Dict[str, Any]) -> Optional[datetime]:
        """Parse subscription end date from webhook data"""
        try:
            # Look for current period end or next billing date
            end_date_str = data.get("current_period_end") or data.get("ends_at")
            
            if end_date_str:
                return datetime.fromisoformat(end_date_str.replace("Z", "+00:00"))
            
            return None
        except Exception as e:
            logger.error(f"Failed to parse subscription end date: {e}")
            return None

# Global service instance - will be None if not properly configured
polar_service = None

def get_polar_service() -> Optional[PolarService]:
    """Get configured Polar service instance"""
    global polar_service
    if polar_service is None:
        try:
            polar_service = PolarService()
        except ValueError as e:
            logger.warning(f"Polar service not configured: {e}")
            return None
    return polar_service