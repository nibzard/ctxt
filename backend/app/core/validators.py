"""Input validation utilities for ctxt.help API."""

import re
import urllib.parse
from typing import List, Optional, Any
from urllib.parse import urlparse
from pydantic import BaseModel, field_validator, Field
from app.core.exceptions import ValidationError


class URLValidator:
    """URL validation utilities."""
    
    # Allowed schemes for URL conversion
    ALLOWED_SCHEMES = {"http", "https"}
    
    # Blocked domains (can be extended)
    BLOCKED_DOMAINS = {
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "10.0.0.0/8",  # Private network
        "172.16.0.0/12",  # Private network
        "192.168.0.0/16",  # Private network
    }
    
    @staticmethod
    def validate_url(url: str) -> str:
        """Validate and normalize URL."""
        if not url or not isinstance(url, str):
            raise ValidationError("URL is required and must be a string", "url", url)
        
        url = url.strip()
        
        try:
            parsed = urlparse(url)
        except Exception:
            raise ValidationError("Invalid URL format", "url", url)
        
        # Check scheme
        if parsed.scheme.lower() not in URLValidator.ALLOWED_SCHEMES:
            raise ValidationError(
                f"URL scheme must be one of: {', '.join(URLValidator.ALLOWED_SCHEMES)}", 
                "url", 
                url
            )
        
        # Check if hostname exists
        if not parsed.netloc:
            raise ValidationError("URL must have a valid hostname", "url", url)
        
        # Check for blocked domains (basic security)
        hostname = parsed.hostname
        if hostname and hostname.lower() in URLValidator.BLOCKED_DOMAINS:
            raise ValidationError("URL domain is not allowed", "url", url)
        
        # Normalize URL
        normalized = urllib.parse.urlunparse(parsed)
        return normalized


class TextValidator:
    """Text content validation utilities."""
    
    @staticmethod
    def validate_text_length(text: str, min_length: int = 1, max_length: int = 100000, field_name: str = "text") -> str:
        """Validate text length."""
        if not text:
            if min_length > 0:
                raise ValidationError(f"{field_name} cannot be empty", field_name, text)
            return text
        
        text_length = len(text.strip())
        
        if text_length < min_length:
            raise ValidationError(
                f"{field_name} must be at least {min_length} characters long", 
                field_name, 
                text
            )
        
        if text_length > max_length:
            raise ValidationError(
                f"{field_name} must be no more than {max_length} characters long", 
                field_name, 
                text
            )
        
        return text.strip()
    
    @staticmethod
    def validate_slug(slug: str) -> str:
        """Validate URL slug format."""
        if not slug:
            raise ValidationError("Slug cannot be empty", "slug", slug)
        
        slug = slug.strip().lower()
        
        # Check length
        if len(slug) < 3:
            raise ValidationError("Slug must be at least 3 characters long", "slug", slug)
        
        if len(slug) > 100:
            raise ValidationError("Slug must be no more than 100 characters long", "slug", slug)
        
        # Check format (alphanumeric, hyphens, underscores only)
        if not re.match(r'^[a-z0-9\-_]+$', slug):
            raise ValidationError(
                "Slug can only contain lowercase letters, numbers, hyphens, and underscores",
                "slug", 
                slug
            )
        
        # Cannot start or end with hyphen/underscore
        if slug.startswith(('-', '_')) or slug.endswith(('-', '_')):
            raise ValidationError("Slug cannot start or end with hyphen or underscore", "slug", slug)
        
        return slug


class EmailValidator:
    """Email validation utilities."""
    
    @staticmethod
    def validate_email(email: str) -> str:
        """Validate email format."""
        if not email:
            raise ValidationError("Email is required", "email", email)
        
        email = email.strip().lower()
        
        # Basic email regex
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            raise ValidationError("Invalid email format", "email", email)
        
        # Check length
        if len(email) > 254:  # RFC 5321 limit
            raise ValidationError("Email address is too long", "email", email)
        
        return email


class APIKeyValidator:
    """API key validation utilities."""
    
    @staticmethod
    def validate_api_key_name(name: str) -> str:
        """Validate API key name."""
        name = TextValidator.validate_text_length(name, 1, 100, "API key name")
        
        # Check for valid characters
        if not re.match(r'^[a-zA-Z0-9\s\-_\.]+$', name):
            raise ValidationError(
                "API key name can only contain letters, numbers, spaces, hyphens, underscores, and dots",
                "name", 
                name
            )
        
        return name.strip()
    
    @staticmethod
    def validate_scopes(scopes: List[str]) -> List[str]:
        """Validate API key scopes."""
        allowed_scopes = {"convert", "library", "context", "analytics"}
        
        if not scopes:
            raise ValidationError("At least one scope is required", "scopes", scopes)
        
        invalid_scopes = set(scopes) - allowed_scopes
        if invalid_scopes:
            raise ValidationError(
                f"Invalid scopes: {', '.join(invalid_scopes)}. Allowed: {', '.join(allowed_scopes)}",
                "scopes",
                scopes
            )
        
        return list(set(scopes))  # Remove duplicates


class PasswordValidator:
    """Password validation utilities."""
    
    @staticmethod
    def validate_password(password: str) -> str:
        """Validate password strength."""
        if not password:
            raise ValidationError("Password is required", "password")
        
        if len(password) < 8:
            raise ValidationError("Password must be at least 8 characters long", "password")
        
        if len(password) > 128:
            raise ValidationError("Password must be no more than 128 characters long", "password")
        
        # Check for at least one letter and one number
        has_letter = re.search(r'[a-zA-Z]', password)
        has_number = re.search(r'\d', password)
        
        if not has_letter:
            raise ValidationError("Password must contain at least one letter", "password")
        
        if not has_number:
            raise ValidationError("Password must contain at least one number", "password")
        
        return password


# Pydantic validators for common use cases
class ValidatedURL(BaseModel):
    """URL field with validation."""
    url: str = Field(..., min_length=1, max_length=2000)
    
    @field_validator('url')
    @classmethod
    def validate_url_field(cls, v):
        return URLValidator.validate_url(v)


class ValidatedEmail(BaseModel):
    """Email field with validation."""
    email: str = Field(..., min_length=1, max_length=254)
    
    @field_validator('email')
    @classmethod
    def validate_email_field(cls, v):
        return EmailValidator.validate_email(v)


class ValidatedPassword(BaseModel):
    """Password field with validation."""
    password: str = Field(..., min_length=8, max_length=128)
    
    @field_validator('password')
    @classmethod
    def validate_password_field(cls, v):
        return PasswordValidator.validate_password(v)


def validate_pagination(limit: int = 10, offset: int = 0) -> tuple[int, int]:
    """Validate pagination parameters."""
    if limit < 1:
        raise ValidationError("Limit must be at least 1", "limit", limit)
    
    if limit > 100:
        raise ValidationError("Limit cannot exceed 100", "limit", limit)
    
    if offset < 0:
        raise ValidationError("Offset cannot be negative", "offset", offset)
    
    return limit, offset


def validate_tier(tier: str) -> str:
    """Validate user tier."""
    allowed_tiers = {"free", "power", "pro", "enterprise"}
    
    if tier not in allowed_tiers:
        raise ValidationError(
            f"Invalid tier. Must be one of: {', '.join(allowed_tiers)}",
            "tier",
            tier
        )
    
    return tier