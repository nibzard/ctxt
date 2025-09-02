"""Tests for error handling and exceptions."""

import pytest
from fastapi.testclient import TestClient
from app.core.exceptions import (
    CtxtException,
    ValidationError,
    AuthenticationError,
    RateLimitError,
    ConversionError
)


class TestCustomExceptions:
    """Test custom exception classes."""
    
    def test_validation_error(self):
        """Test ValidationError exception."""
        error = ValidationError("Invalid input", "field_name", "bad_value")
        
        assert error.status_code == 422
        assert error.error_code == "VALIDATION_ERROR"
        assert error.context["field"] == "field_name"
        assert error.context["value"] == "bad_value"
    
    def test_authentication_error(self):
        """Test AuthenticationError exception."""
        error = AuthenticationError("Login failed")
        
        assert error.status_code == 401
        assert error.error_code == "AUTHENTICATION_ERROR"
        assert error.detail == "Login failed"
    
    def test_rate_limit_error(self):
        """Test RateLimitError exception."""
        error = RateLimitError(
            "Too many requests", 
            retry_after=3600, 
            current_usage=10, 
            limit=5
        )
        
        assert error.status_code == 429
        assert error.error_code == "RATE_LIMIT_EXCEEDED"
        assert error.context["retry_after"] == 3600
        assert error.context["current_usage"] == 10
        assert error.context["limit"] == 5
    
    def test_conversion_error(self):
        """Test ConversionError exception."""
        error = ConversionError(
            "Failed to convert URL", 
            url="https://example.com", 
            reason="Network timeout"
        )
        
        assert error.status_code == 400
        assert error.error_code == "CONVERSION_ERROR"
        assert error.context["url"] == "https://example.com"
        assert error.context["reason"] == "Network timeout"


class TestErrorHandlers:
    """Test error handler middleware."""
    
    def test_validation_error_response(self, client: TestClient):
        """Test validation error response format."""
        # Test with invalid URL
        response = client.post("/api/convert", json={"url": "not-a-url"})
        
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
        assert "error_code" in data
        assert "errors" in data
        assert "path" in data
    
    def test_authentication_error_response(self, client: TestClient):
        """Test authentication error response format."""
        # Test accessing protected endpoint without auth
        response = client.get("/api/auth/me")
        
        assert response.status_code == 403
    
    def test_not_found_error_response(self, client: TestClient):
        """Test 404 error response."""
        response = client.get("/api/conversions/nonexistent-id")
        
        assert response.status_code == 404


class TestSecurityHeaders:
    """Test security headers middleware."""
    
    def test_security_headers_present(self, client: TestClient):
        """Test that security headers are added to responses."""
        response = client.get("/")
        
        assert response.status_code == 200
        
        # Check security headers
        assert "X-Content-Type-Options" in response.headers
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        
        assert "X-Frame-Options" in response.headers
        assert response.headers["X-Frame-Options"] == "DENY"
        
        assert "X-XSS-Protection" in response.headers
        assert "Content-Security-Policy" in response.headers
        assert "Referrer-Policy" in response.headers


class TestRequestLogging:
    """Test request logging middleware."""
    
    def test_request_id_header(self, client: TestClient):
        """Test that request ID is added to response headers."""
        response = client.get("/")
        
        assert "X-Request-ID" in response.headers
        assert len(response.headers["X-Request-ID"]) == 8  # Short UUID
    
    def test_process_time_header(self, client: TestClient):
        """Test that process time is added to response headers."""
        response = client.get("/")
        
        assert "X-Process-Time" in response.headers
        process_time = float(response.headers["X-Process-Time"])
        assert process_time > 0