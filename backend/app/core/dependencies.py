"""Dependency injection container and providers."""

from typing import Optional
from functools import lru_cache
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.conversion import ConversionService
from app.services.rate_limiter import RateLimiter
from app.services.auth import AuthService
from app.services.payment import PaymentService
from app.services.context_stack import ContextStackService
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class ServiceContainer:
    """Dependency injection container for services."""
    
    def __init__(self):
        self._conversion_service: Optional[ConversionService] = None
        self._rate_limiter: Optional[RateLimiter] = None
        self._auth_service: Optional[AuthService] = None
        self._payment_service: Optional[PaymentService] = None
        self._context_stack_service: Optional[ContextStackService] = None
    
    def get_conversion_service(self) -> ConversionService:
        """Get conversion service instance."""
        if self._conversion_service is None:
            self._conversion_service = ConversionService()
        return self._conversion_service
    
    def get_rate_limiter(self) -> RateLimiter:
        """Get rate limiter instance."""
        if self._rate_limiter is None:
            self._rate_limiter = RateLimiter()
        return self._rate_limiter
    
    def get_auth_service(self) -> AuthService:
        """Get auth service instance."""
        if self._auth_service is None:
            self._auth_service = AuthService()
        return self._auth_service
    
    def get_payment_service(self) -> PaymentService:
        """Get payment service instance."""
        if self._payment_service is None:
            self._payment_service = PaymentService()
        return self._payment_service
    
    def get_context_stack_service(self) -> ContextStackService:
        """Get context stack service instance."""
        if self._context_stack_service is None:
            self._context_stack_service = ContextStackService()
        return self._context_stack_service


# Global service container instance
@lru_cache()
def get_service_container() -> ServiceContainer:
    """Get singleton service container."""
    return ServiceContainer()


# Dependency providers for FastAPI
def get_conversion_service() -> ConversionService:
    """Dependency provider for conversion service."""
    return get_service_container().get_conversion_service()


def get_rate_limiter() -> RateLimiter:
    """Dependency provider for rate limiter."""
    return get_service_container().get_rate_limiter()


def get_auth_service() -> AuthService:
    """Dependency provider for auth service."""
    return get_service_container().get_auth_service()


def get_payment_service() -> PaymentService:
    """Dependency provider for payment service."""
    return get_service_container().get_payment_service()


def get_context_stack_service() -> ContextStackService:
    """Dependency provider for context stack service."""
    return get_service_container().get_context_stack_service()