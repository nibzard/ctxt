"""Tests for authentication endpoints and functionality."""

import pytest
from fastapi.testclient import TestClient
from app.models import User

class TestUserRegistration:
    """Test user registration functionality."""
    
    def test_register_user_success(self, client: TestClient):
        """Test successful user registration."""
        response = client.post("/api/auth/register", json={
            "email": "newuser@example.com",
            "password": "securepassword123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "newuser@example.com"
        assert data["user"]["tier"] == "free"
        assert data["user"]["is_active"] == True
    
    def test_register_duplicate_email(self, client: TestClient, test_user: User):
        """Test registration with duplicate email fails."""
        response = client.post("/api/auth/register", json={
            "email": test_user.email,
            "password": "securepassword123"
        })
        
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]
    
    def test_register_invalid_email(self, client: TestClient):
        """Test registration with invalid email fails."""
        response = client.post("/api/auth/register", json={
            "email": "invalid-email",
            "password": "securepassword123"
        })
        
        assert response.status_code == 422

class TestUserLogin:
    """Test user login functionality."""
    
    def test_login_success(self, client: TestClient, test_user: User):
        """Test successful login."""
        response = client.post("/api/auth/login", json={
            "email": test_user.email,
            "password": "testpassword123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["email"] == test_user.email
    
    def test_login_wrong_password(self, client: TestClient, test_user: User):
        """Test login with wrong password fails."""
        response = client.post("/api/auth/login", json={
            "email": test_user.email,
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        assert "Invalid email or password" in response.json()["detail"]
    
    def test_login_nonexistent_user(self, client: TestClient):
        """Test login with nonexistent user fails."""
        response = client.post("/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "password123"
        })
        
        assert response.status_code == 401

class TestAuthenticatedEndpoints:
    """Test authenticated endpoints."""
    
    def test_get_current_user(self, client: TestClient, auth_headers: dict):
        """Test getting current user info."""
        response = client.get("/api/auth/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["tier"] == "free"
    
    def test_get_usage_stats(self, client: TestClient, auth_headers: dict):
        """Test getting usage statistics."""
        response = client.get("/api/auth/usage", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "daily_conversions" in data
        assert "monthly_conversions" in data
        assert "total_conversions" in data
        assert data["quota_remaining"] == 5  # Free tier daily limit
    
    def test_unauthorized_access(self, client: TestClient):
        """Test accessing protected endpoint without auth fails."""
        response = client.get("/api/auth/me")
        
        assert response.status_code == 403

class TestAPIKeys:
    """Test API key functionality."""
    
    def test_create_api_key(self, client: TestClient, auth_headers: dict):
        """Test creating API key."""
        response = client.post("/api/auth/api-keys", 
            headers=auth_headers,
            json={
                "name": "Test API Key",
                "scopes": ["convert", "library"],
                "expires_in_days": 30
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["key"].startswith("ctxt_")
        assert data["api_key_info"]["name"] == "Test API Key"
        assert data["api_key_info"]["scopes"] == ["convert", "library"]
    
    def test_create_api_key_invalid_data(self, client: TestClient, auth_headers: dict):
        """Test creating API key with invalid data fails."""
        response = client.post("/api/auth/api-keys",
            headers=auth_headers,
            json={
                "name": "",  # Empty name
                "scopes": []
            }
        )
        
        assert response.status_code == 422