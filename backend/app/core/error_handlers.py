"""Global error handlers for ctxt.help API."""

import traceback
from typing import Union
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from pydantic import ValidationError as PydanticValidationError
import logging

from app.core.exceptions import CtxtException
from app.core.config import settings

logger = logging.getLogger(__name__)


async def ctxt_exception_handler(request: Request, exc: CtxtException) -> JSONResponse:
    """Handle custom ctxt.help exceptions."""
    logger.warning(f"CtxtException: {exc.error_code} - {exc.detail}", extra={
        "error_code": exc.error_code,
        "context": exc.context,
        "path": request.url.path,
        "method": request.method
    })
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "error_code": exc.error_code,
            "context": exc.context,
            "path": str(request.url.path)
        }
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle FastAPI HTTP exceptions."""
    logger.warning(f"HTTPException: {exc.status_code} - {exc.detail}", extra={
        "status_code": exc.status_code,
        "path": request.url.path,
        "method": request.method
    })
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "error_code": "HTTP_ERROR",
            "path": str(request.url.path)
        }
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle request validation errors."""
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"])
        errors.append({
            "field": field,
            "message": error["msg"],
            "type": error["type"],
            "input": error.get("input")
        })
    
    logger.warning(f"Validation error on {request.url.path}: {errors}")
    
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Input validation failed",
            "error_code": "VALIDATION_ERROR",
            "errors": errors,
            "path": str(request.url.path)
        }
    )


async def database_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """Handle database errors."""
    error_msg = "Database operation failed"
    
    if isinstance(exc, IntegrityError):
        error_msg = "Data integrity violation"
        if "unique constraint" in str(exc).lower():
            error_msg = "Resource already exists"
        elif "foreign key constraint" in str(exc).lower():
            error_msg = "Referenced resource not found"
    
    logger.error(f"Database error on {request.url.path}: {str(exc)}", extra={
        "exception_type": type(exc).__name__,
        "path": request.url.path,
        "method": request.method
    })
    
    # Don't expose sensitive database details in production
    if settings.environment == "production":
        detail = error_msg
    else:
        detail = f"{error_msg}: {str(exc)}"
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": detail,
            "error_code": "DATABASE_ERROR",
            "path": str(request.url.path)
        }
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions."""
    error_id = f"err_{int(request.receive.__hash__())}"  # Simple error ID
    
    logger.error(f"Unhandled exception [{error_id}] on {request.url.path}: {str(exc)}", extra={
        "error_id": error_id,
        "exception_type": type(exc).__name__,
        "path": request.url.path,
        "method": request.method,
        "traceback": traceback.format_exc() if settings.debug else None
    })
    
    # Different responses for different environments
    if settings.environment == "production":
        return JSONResponse(
            status_code=500,
            content={
                "detail": "An unexpected error occurred",
                "error_code": "INTERNAL_ERROR", 
                "error_id": error_id,
                "path": str(request.url.path)
            }
        )
    else:
        return JSONResponse(
            status_code=500,
            content={
                "detail": str(exc),
                "error_code": "INTERNAL_ERROR",
                "error_id": error_id,
                "exception_type": type(exc).__name__,
                "traceback": traceback.format_exc(),
                "path": str(request.url.path)
            }
        )


def setup_error_handlers(app):
    """Register all error handlers with the FastAPI app."""
    app.add_exception_handler(CtxtException, ctxt_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(SQLAlchemyError, database_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)