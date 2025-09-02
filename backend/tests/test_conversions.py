"""Tests for conversion endpoints and functionality."""

import pytest
from unittest.mock import patch, Mock
from fastapi.testclient import TestClient
from app.models import User, Conversion

class TestConversionEndpoints:
    """Test conversion API endpoints."""
    
    @patch('app.services.conversion.conversion_service.convert_url')
    def test_convert_url_success(self, mock_convert, client: TestClient, auth_headers: dict):
        """Test successful URL conversion."""
        mock_convert.return_value = {
            "source_url": "https://example.com/test",
            "title": "Test Article",
            "domain": "example.com",
            "content": "This is test content",
            "meta_description": "Test description",
            "word_count": 100,
            "reading_time": 1
        }
        
        response = client.post("/api/convert",
            headers=auth_headers,
            json={"url": "https://example.com/test"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Test Article"
        assert data["source_url"] == "https://example.com/test"
        assert data["domain"] == "example.com"
    
    def test_convert_url_without_auth(self, client: TestClient):
        """Test URL conversion without authentication (should work for anonymous users)."""
        with patch('app.services.conversion.conversion_service.convert_url') as mock_convert:
            mock_convert.return_value = {
                "source_url": "https://example.com/test",
                "title": "Test Article",
                "domain": "example.com", 
                "content": "This is test content",
                "meta_description": "Test description",
                "word_count": 100,
                "reading_time": 1
            }
            
            response = client.post("/api/convert",
                json={"url": "https://example.com/test"}
            )
            
            assert response.status_code == 200
    
    def test_convert_invalid_url(self, client: TestClient, auth_headers: dict):
        """Test conversion with invalid URL."""
        response = client.post("/api/convert",
            headers=auth_headers,
            json={"url": "not-a-valid-url"}
        )
        
        assert response.status_code == 422
    
    def test_rate_limiting_free_tier(self, client: TestClient, auth_headers: dict):
        """Test rate limiting for free tier users."""
        # Mock successful conversions
        with patch('app.services.conversion.conversion_service.convert_url') as mock_convert:
            mock_convert.return_value = {
                "source_url": "https://example.com/test",
                "title": "Test Article",
                "domain": "example.com",
                "content": "Content",
                "meta_description": "Description",
                "word_count": 100,
                "reading_time": 1
            }
            
            # Make 5 conversions (free tier limit)
            for i in range(5):
                response = client.post("/api/convert",
                    headers=auth_headers,
                    json={"url": f"https://example.com/test{i}"}
                )
                assert response.status_code == 200
            
            # 6th conversion should be rate limited
            response = client.post("/api/convert",
                headers=auth_headers,
                json={"url": "https://example.com/test6"}
            )
            assert response.status_code == 429
            assert "Rate limit exceeded" in response.json()["detail"]

class TestConversionLibrary:
    """Test conversion library functionality."""
    
    def test_list_conversions(self, client: TestClient, auth_headers: dict, sample_conversion: Conversion):
        """Test listing user's conversions."""
        response = client.get("/api/conversions", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["title"] == sample_conversion.title
    
    def test_get_conversion_by_id(self, client: TestClient, sample_conversion: Conversion):
        """Test getting conversion by ID."""
        response = client.get(f"/api/conversions/{sample_conversion.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == sample_conversion.title
        assert data["view_count"] == 1  # Should increment view count
    
    def test_search_conversions(self, client: TestClient, auth_headers: dict, sample_conversion: Conversion):
        """Test searching conversions."""
        response = client.get("/api/conversions?search=Test", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == sample_conversion.title
    
    def test_save_conversion(self, client: TestClient, auth_headers: dict, sample_conversion: Conversion):
        """Test saving a conversion."""
        response = client.post(f"/api/conversions/{sample_conversion.id}/save",
            headers=auth_headers,
            json={
                "make_public": True,
                "tags": ["test", "article"]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "permanent_url" in data
        assert data["seo_optimized"] == True
    
    def test_delete_conversion(self, client: TestClient, auth_headers: dict, sample_conversion: Conversion):
        """Test deleting a conversion."""
        response = client.delete(f"/api/conversions/{sample_conversion.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert response.json()["message"] == "Conversion deleted successfully"
        
        # Verify it's deleted
        response = client.get(f"/api/conversions/{sample_conversion.id}")
        assert response.status_code == 404

class TestConversionPermissions:
    """Test conversion permissions and access control."""
    
    def test_user_can_only_see_own_conversions(self, client: TestClient, auth_headers: dict, test_user: User, power_user: User, db_session):
        """Test users can only see their own conversions in library."""
        # Create conversion for power user
        power_conversion = Conversion(
            id="power-conversion-id",
            slug="power-conversion",
            user_id=power_user.id,
            source_url="https://example.com/power",
            title="Power User Article", 
            domain="example.com",
            content="Power user content",
            is_public=False
        )
        db_session.add(power_conversion)
        db_session.commit()
        
        # Test user shouldn't see power user's conversion
        response = client.get("/api/conversions", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        
        # Verify power user can see their own
        power_tokens = client.post("/api/auth/login", json={
            "email": power_user.email,
            "password": "testpassword123"
        }).json()
        power_headers = {"Authorization": f"Bearer {power_tokens['access_token']}"}
        
        response = client.get("/api/conversions", headers=power_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
    
    def test_public_conversions_accessible(self, client: TestClient, sample_conversion: Conversion):
        """Test public conversions are accessible without auth."""
        response = client.get(f"/api/conversions/{sample_conversion.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == sample_conversion.title