"""Custom exceptions and error handling for ctxt.help API."""

from typing import Any, Dict, Optional
from fastapi import HTTPException, status


class CtxtException(HTTPException):
    """Base exception class for ctxt.help application."""
    
    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: str,
        context: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code
        self.context = context or {}


class ValidationError(CtxtException):
    """Raised when input validation fails."""
    
    def __init__(self, detail: str, field: Optional[str] = None, value: Optional[Any] = None):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            error_code="VALIDATION_ERROR",
            context={"field": field, "value": value}
        )


class AuthenticationError(CtxtException):
    """Raised when authentication fails."""
    
    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            error_code="AUTHENTICATION_ERROR"
        )


class AuthorizationError(CtxtException):
    """Raised when authorization fails."""
    
    def __init__(self, detail: str = "Insufficient permissions"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code="AUTHORIZATION_ERROR"
        )


class RateLimitError(CtxtException):
    """Raised when rate limit is exceeded."""
    
    def __init__(
        self, 
        detail: str, 
        retry_after: Optional[int] = None,
        current_usage: Optional[int] = None,
        limit: Optional[int] = None
    ):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
            error_code="RATE_LIMIT_EXCEEDED",
            context={
                "retry_after": retry_after,
                "current_usage": current_usage, 
                "limit": limit
            }
        )


class ConversionError(CtxtException):
    """Raised when URL conversion fails."""
    
    def __init__(self, detail: str, url: Optional[str] = None, reason: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="CONVERSION_ERROR",
            context={"url": url, "reason": reason}
        )


class ResourceNotFoundError(CtxtException):
    """Raised when a requested resource is not found."""
    
    def __init__(self, resource_type: str, identifier: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource_type} not found",
            error_code="RESOURCE_NOT_FOUND",
            context={"resource_type": resource_type, "identifier": identifier}
        )


class PaymentError(CtxtException):
    """Raised when payment processing fails."""
    
    def __init__(self, detail: str, payment_id: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=detail,
            error_code="PAYMENT_ERROR",
            context={"payment_id": payment_id}
        )


class ExternalServiceError(CtxtException):
    """Raised when external service fails."""
    
    def __init__(self, service_name: str, detail: str, status_code: Optional[int] = None):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"{service_name} service error: {detail}",
            error_code="EXTERNAL_SERVICE_ERROR",
            context={"service_name": service_name, "upstream_status": status_code}
        )


class ConfigurationError(CtxtException):
    """Raised when application configuration is invalid."""
    
    def __init__(self, detail: str, config_key: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Configuration error: {detail}",
            error_code="CONFIGURATION_ERROR",
            context={"config_key": config_key}
        )


class DatabaseError(CtxtException):
    """Raised when database operation fails."""
    
    def __init__(self, detail: str, operation: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {detail}",
            error_code="DATABASE_ERROR",
            context={"operation": operation}
        )


# Error response schemas for OpenAPI documentation
ERROR_RESPONSES = {
    400: {
        "description": "Bad Request",
        "content": {
            "application/json": {
                "schema": {
                    "type": "object",
                    "properties": {
                        "detail": {"type": "string"},
                        "error_code": {"type": "string"},
                        "context": {"type": "object"}
                    }
                }
            }
        }
    },
    401: {
        "description": "Authentication Error",
        "content": {
            "application/json": {
                "schema": {
                    "type": "object", 
                    "properties": {
                        "detail": {"type": "string"},
                        "error_code": {"type": "string"}
                    }
                }
            }
        }
    },
    403: {
        "description": "Authorization Error",
        "content": {
            "application/json": {
                "schema": {
                    "type": "object",
                    "properties": {
                        "detail": {"type": "string"},
                        "error_code": {"type": "string"}
                    }
                }
            }
        }
    },
    404: {
        "description": "Resource Not Found",
        "content": {
            "application/json": {
                "schema": {
                    "type": "object",
                    "properties": {
                        "detail": {"type": "string"},
                        "error_code": {"type": "string"},
                        "context": {"type": "object"}
                    }
                }
            }
        }
    },
    422: {
        "description": "Validation Error",
        "content": {
            "application/json": {
                "schema": {
                    "type": "object",
                    "properties": {
                        "detail": {"type": "string"},
                        "error_code": {"type": "string"},
                        "context": {"type": "object"}
                    }
                }
            }
        }
    },
    429: {
        "description": "Rate Limit Exceeded",
        "content": {
            "application/json": {
                "schema": {
                    "type": "object",
                    "properties": {
                        "detail": {"type": "string"},
                        "error_code": {"type": "string"},
                        "context": {"type": "object"}
                    }
                }
            }
        }
    },
    500: {
        "description": "Internal Server Error",
        "content": {
            "application/json": {
                "schema": {
                    "type": "object",
                    "properties": {
                        "detail": {"type": "string"},
                        "error_code": {"type": "string"}
                    }
                }
            }
        }
    }
}