"""Tests for input validation utilities."""

import pytest
from app.core.validators import (
    URLValidator, 
    TextValidator, 
    EmailValidator, 
    PasswordValidator,
    APIKeyValidator,
    validate_pagination,
    validate_tier
)
from app.core.exceptions import ValidationError


class TestURLValidator:
    """Test URL validation."""
    
    def test_valid_urls(self):
        """Test valid URL validation."""
        valid_urls = [
            "https://example.com",
            "http://example.com/path",
            "https://subdomain.example.com/path?query=1",
            "https://example.com:8080/path"
        ]
        
        for url in valid_urls:
            result = URLValidator.validate_url(url)
            assert result.startswith(("http://", "https://"))
    
    def test_invalid_urls(self):
        """Test invalid URL validation."""
        invalid_urls = [
            "",
            None,
            "not-a-url",
            "ftp://example.com",  # Invalid scheme
            "https://",  # No domain
            "https://localhost",  # Blocked domain
            "https://127.0.0.1"  # Blocked domain
        ]
        
        for url in invalid_urls:
            with pytest.raises(ValidationError):
                URLValidator.validate_url(url)
    
    def test_url_normalization(self):
        """Test URL normalization."""
        result = URLValidator.validate_url("  https://EXAMPLE.com/PATH  ")
        assert result == "https://EXAMPLE.com/PATH"


class TestEmailValidator:
    """Test email validation."""
    
    def test_valid_emails(self):
        """Test valid email validation."""
        valid_emails = [
            "test@example.com",
            "user.name@domain.co.uk",
            "user+tag@example.org"
        ]
        
        for email in valid_emails:
            result = EmailValidator.validate_email(email)
            assert "@" in result
            assert result.islower()
    
    def test_invalid_emails(self):
        """Test invalid email validation."""
        invalid_emails = [
            "",
            "not-an-email",
            "@example.com",
            "test@",
            "test..test@example.com",
            "a" * 250 + "@example.com"  # Too long
        ]
        
        for email in invalid_emails:
            with pytest.raises(ValidationError):
                EmailValidator.validate_email(email)


class TestPasswordValidator:
    """Test password validation."""
    
    def test_valid_passwords(self):
        """Test valid password validation."""
        valid_passwords = [
            "password123",
            "myPassword1",
            "Complex123!"
        ]
        
        for password in valid_passwords:
            result = PasswordValidator.validate_password(password)
            assert len(result) >= 8
    
    def test_invalid_passwords(self):
        """Test invalid password validation."""
        invalid_passwords = [
            "",
            "short",  # Too short
            "password",  # No numbers
            "12345678",  # No letters
            "a" * 200  # Too long
        ]
        
        for password in invalid_passwords:
            with pytest.raises(ValidationError):
                PasswordValidator.validate_password(password)


class TestTextValidator:
    """Test text validation."""
    
    def test_valid_text_length(self):
        """Test valid text length validation."""
        result = TextValidator.validate_text_length("  hello world  ", 1, 20)
        assert result == "hello world"
    
    def test_invalid_text_length(self):
        """Test invalid text length validation."""
        with pytest.raises(ValidationError):
            TextValidator.validate_text_length("", 1, 20)  # Too short
        
        with pytest.raises(ValidationError):
            TextValidator.validate_text_length("a" * 100, 1, 20)  # Too long
    
    def test_slug_validation(self):
        """Test slug validation."""
        valid_slugs = ["hello-world", "test_slug", "article123"]
        invalid_slugs = ["", "ab", "Hello World", "-start", "end-", "special@chars"]
        
        for slug in valid_slugs:
            result = TextValidator.validate_slug(slug)
            assert result == slug.lower()
        
        for slug in invalid_slugs:
            with pytest.raises(ValidationError):
                TextValidator.validate_slug(slug)


class TestAPIKeyValidator:
    """Test API key validation."""
    
    def test_valid_api_key_name(self):
        """Test valid API key name validation."""
        result = APIKeyValidator.validate_api_key_name("  My API Key  ")
        assert result == "My API Key"
    
    def test_invalid_api_key_name(self):
        """Test invalid API key name validation."""
        with pytest.raises(ValidationError):
            APIKeyValidator.validate_api_key_name("")
        
        with pytest.raises(ValidationError):
            APIKeyValidator.validate_api_key_name("Invalid@Name")
    
    def test_valid_scopes(self):
        """Test valid scope validation."""
        result = APIKeyValidator.validate_scopes(["convert", "library", "convert"])
        assert "convert" in result
        assert "library" in result
        assert len(result) == 2  # Duplicates removed
    
    def test_invalid_scopes(self):
        """Test invalid scope validation."""
        with pytest.raises(ValidationError):
            APIKeyValidator.validate_scopes([])  # Empty
        
        with pytest.raises(ValidationError):
            APIKeyValidator.validate_scopes(["invalid_scope"])


class TestUtilityValidators:
    """Test utility validation functions."""
    
    def test_pagination_validation(self):
        """Test pagination parameter validation."""
        limit, offset = validate_pagination(20, 10)
        assert limit == 20
        assert offset == 10
        
        # Test defaults
        limit, offset = validate_pagination()
        assert limit == 10
        assert offset == 0
        
        # Test invalid values
        with pytest.raises(ValidationError):
            validate_pagination(0, 0)  # Limit too small
        
        with pytest.raises(ValidationError):
            validate_pagination(200, 0)  # Limit too large
        
        with pytest.raises(ValidationError):
            validate_pagination(10, -1)  # Negative offset
    
    def test_tier_validation(self):
        """Test tier validation."""
        valid_tiers = ["free", "power", "pro", "enterprise"]
        
        for tier in valid_tiers:
            result = validate_tier(tier)
            assert result == tier
        
        with pytest.raises(ValidationError):
            validate_tier("invalid_tier")