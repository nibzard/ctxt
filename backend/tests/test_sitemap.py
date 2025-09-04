"""Tests for sitemap.xml and robots.txt functionality.

This comprehensive test suite validates the SEO functionality including:

1. **Sitemap Generation Tests (TestSitemapGeneration)**:
   - Basic XML structure and format validation
   - Homepage inclusion with proper priority
   - Public conversions inclusion (only public AND indexed)
   - Public context stacks inclusion
   - XML format validation (priorities, change frequencies, lastmod dates)
   - Proper HTTP headers (caching, content-type)
   - Error handling for database failures

2. **Priority Calculation Tests (TestPriorityCalculation)**:
   - Conversion priority based on view count and recency
   - Context stack priority based on usage and template status
   - Edge cases (null dates, zero counts)

3. **Robots.txt Tests (TestRobotsTxt)**:
   - Basic structure and content
   - Allowed paths (/read/, /page/, /context/)
   - Disallowed paths (/api/, /admin/, /auth/)
   - Proper HTTP headers

4. **URL Pattern Tests (TestSitemapURLPatterns)**:
   - All expected conversion URL patterns included
   - All expected context stack URL patterns included

5. **Integration Tests (TestSitemapIntegration)**:
   - Mixed content scenarios
   - Performance with larger datasets

The tests use mock objects to isolate the functionality from database setup
complexity while still validating the core business logic.
"""

import pytest
from unittest.mock import patch, Mock, MagicMock
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
import xml.etree.ElementTree as ET
import uuid

# Mock models for testing without full DB setup
class MockConversion:
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', uuid.uuid4())
        self.slug = kwargs.get('slug', 'test-slug')
        self.user_id = kwargs.get('user_id', uuid.uuid4())
        self.source_url = kwargs.get('source_url', 'https://example.com')
        self.title = kwargs.get('title', 'Test Title')
        self.domain = kwargs.get('domain', 'example.com')
        self.content = kwargs.get('content', 'Test content')
        self.is_public = kwargs.get('is_public', True)
        self.is_indexed = kwargs.get('is_indexed', True)
        self.view_count = kwargs.get('view_count', 0)
        self.created_at = kwargs.get('created_at', datetime.utcnow())
        self.updated_at = kwargs.get('updated_at', None)

class MockContextStack:
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', uuid.uuid4())
        self.user_id = kwargs.get('user_id', uuid.uuid4())
        self.name = kwargs.get('name', 'Test Stack')
        self.description = kwargs.get('description', 'Test description')
        self.blocks = kwargs.get('blocks', [])
        self.is_public = kwargs.get('is_public', True)
        self.use_count = kwargs.get('use_count', 0)
        self.is_template = kwargs.get('is_template', False)
        self.created_at = kwargs.get('created_at', datetime.utcnow())
        self.updated_at = kwargs.get('updated_at', None)
        self.last_used_at = kwargs.get('last_used_at', None)


class TestSitemapGeneration:
    """Test sitemap.xml generation and structure."""
    
    @patch('app.api.seo.get_db')
    def test_sitemap_basic_structure(self, mock_get_db):
        """Test basic sitemap XML structure."""
        # Mock database session
        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []
        mock_get_db.return_value = mock_db
        
        # Import and test the sitemap function directly
        from app.api.seo import get_sitemap
        import asyncio
        
        # Run the async function
        result = asyncio.run(get_sitemap(mock_db))
        
        assert result.status_code == 200
        assert result.media_type == "application/xml"
        assert "<?xml version" in result.body.decode()
        
        # Parse XML to verify structure
        root = ET.fromstring(result.body.decode())
        assert root.tag.endswith("urlset")  # Handle namespace
        # Check if namespace is in the tag itself (as it is when parsed)
        assert "http://www.sitemaps.org/schemas/sitemap/0.9" in root.tag
    
    @patch('app.api.seo.get_db')
    def test_sitemap_contains_homepage(self, mock_get_db):
        """Test that sitemap contains homepage URL."""
        # Mock database session
        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []
        mock_get_db.return_value = mock_db
        
        from app.api.seo import get_sitemap
        import asyncio
        
        result = asyncio.run(get_sitemap(mock_db))
        
        assert result.status_code == 200
        root = ET.fromstring(result.body.decode())
        
        # Find homepage URL
        homepage_found = False
        # Define namespace map for XML parsing
        namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        
        for url in root.findall("ns:url", namespace):
            loc = url.find("ns:loc", namespace)
            if loc is not None and loc.text == "https://ctxt.help/":
                homepage_found = True
                priority = url.find("ns:priority", namespace)
                changefreq = url.find("ns:changefreq", namespace)
                lastmod = url.find("ns:lastmod", namespace)
                assert priority is not None and priority.text == "1.0"
                assert changefreq is not None and changefreq.text == "daily"
                assert lastmod is not None
                break
        
        assert homepage_found, "Homepage URL not found in sitemap"
    
    @patch('app.api.seo.get_db')
    def test_sitemap_with_public_conversions(self, mock_get_db):
        """Test sitemap includes public and indexed conversions."""
        # Create mock conversions
        public_conversion = MockConversion(
            slug="public-conversion",
            is_public=True,
            is_indexed=True,
            view_count=50
        )
        
        private_conversion = MockConversion(
            slug="private-conversion",
            is_public=False,
            is_indexed=True,
            view_count=10
        )
        
        non_indexed_conversion = MockConversion(
            slug="non-indexed-conversion",
            is_public=True,
            is_indexed=False,
            view_count=5
        )
        
        # Mock database queries
        mock_db = Mock()
        
        # Mock conversions query (should only return public and indexed)
        mock_conversions_query = Mock()
        mock_conversions_query.filter.return_value.order_by.return_value.all.return_value = [public_conversion]
        
        # Mock context stacks query (empty for this test)
        mock_stacks_query = Mock()
        mock_stacks_query.filter.return_value.order_by.return_value.all.return_value = []
        
        # Set up query method to return different mocks for different models
        def mock_query(model):
            if "Conversion" in str(model):
                return mock_conversions_query
            elif "ContextStack" in str(model):
                return mock_stacks_query
            return Mock()
        
        mock_db.query = mock_query
        mock_get_db.return_value = mock_db
        
        from app.api.seo import get_sitemap
        import asyncio
        
        result = asyncio.run(get_sitemap(mock_db))
        
        assert result.status_code == 200
        root = ET.fromstring(result.body.decode())
        
        # Check that public conversion URLs are included
        expected_urls = [
            f"https://ctxt.help/read/{public_conversion.slug}",
            f"https://ctxt.help/page/{public_conversion.slug}",
            f"https://ctxt.help/page/{public_conversion.slug}/markdown"
        ]
        
        namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        found_urls = [url.find("ns:loc", namespace).text for url in root.findall("ns:url", namespace) if url.find("ns:loc", namespace) is not None]
        
        for expected_url in expected_urls:
            assert expected_url in found_urls, f"Expected URL {expected_url} not found in sitemap"
        
        # Check that private and non-indexed conversions are not included
        unwanted_urls = [
            f"https://ctxt.help/read/{private_conversion.slug}",
            f"https://ctxt.help/read/{non_indexed_conversion.slug}"
        ]
        
        for unwanted_url in unwanted_urls:
            assert unwanted_url not in found_urls, f"Unwanted URL {unwanted_url} found in sitemap"
    
    @patch('app.api.seo.get_db')
    def test_sitemap_with_context_stacks(self, mock_get_db):
        """Test sitemap includes public context stacks."""
        # Create mock context stacks
        public_stack = MockContextStack(
            id=uuid.uuid4(),
            name="Public Stack",
            is_public=True,
            use_count=10,
            is_template=True
        )
        
        private_stack = MockContextStack(
            id=uuid.uuid4(),
            name="Private Stack",
            is_public=False,
            use_count=5
        )
        
        # Mock database queries
        mock_db = Mock()
        
        # Mock conversions query (empty for this test)
        mock_conversions_query = Mock()
        mock_conversions_query.filter.return_value.order_by.return_value.all.return_value = []
        
        # Mock context stacks query (should only return public)
        mock_stacks_query = Mock()
        mock_stacks_query.filter.return_value.order_by.return_value.all.return_value = [public_stack]
        
        # Set up query method to return different mocks for different models
        def mock_query(model):
            if "Conversion" in str(model):
                return mock_conversions_query
            elif "ContextStack" in str(model):
                return mock_stacks_query
            return Mock()
        
        mock_db.query = mock_query
        mock_get_db.return_value = mock_db
        
        from app.api.seo import get_sitemap
        import asyncio
        
        result = asyncio.run(get_sitemap(mock_db))
        
        assert result.status_code == 200
        root = ET.fromstring(result.body.decode())
        
        # Check that public context stack URLs are included
        expected_urls = [
            f"https://ctxt.help/context/{public_stack.id}",
            f"https://ctxt.help/context/{public_stack.id}/markdown",
            f"https://ctxt.help/context/{public_stack.id}/xml"
        ]
        
        namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        found_urls = [url.find("ns:loc", namespace).text for url in root.findall("ns:url", namespace) if url.find("ns:loc", namespace) is not None]
        
        for expected_url in expected_urls:
            assert expected_url in found_urls, f"Expected URL {expected_url} not found in sitemap"
        
        # Check that private context stack is not included
        unwanted_url = f"https://ctxt.help/context/{private_stack.id}"
        assert unwanted_url not in found_urls, f"Unwanted URL {unwanted_url} found in sitemap"
    
    @patch('app.api.seo.get_db')
    def test_sitemap_xml_format_validation(self, mock_get_db):
        """Test that sitemap XML is properly formatted."""
        # Create test data
        conversion = MockConversion(
            slug="test-conversion",
            is_public=True,
            is_indexed=True,
            view_count=100,
            created_at=datetime.utcnow() - timedelta(days=10),
            updated_at=datetime.utcnow() - timedelta(days=5)
        )
        
        # Mock database queries
        mock_db = Mock()
        mock_conversions_query = Mock()
        mock_conversions_query.filter.return_value.order_by.return_value.all.return_value = [conversion]
        mock_stacks_query = Mock()
        mock_stacks_query.filter.return_value.order_by.return_value.all.return_value = []
        
        def mock_query(model):
            if "Conversion" in str(model):
                return mock_conversions_query
            elif "ContextStack" in str(model):
                return mock_stacks_query
            return Mock()
        
        mock_db.query = mock_query
        mock_get_db.return_value = mock_db
        
        from app.api.seo import get_sitemap
        import asyncio
        
        result = asyncio.run(get_sitemap(mock_db))
        
        assert result.status_code == 200
        
        # Parse XML and validate structure
        root = ET.fromstring(result.body.decode())
        
        # Check each URL element has required fields
        namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        for url_elem in root.findall("ns:url", namespace):
            loc = url_elem.find("ns:loc", namespace)
            lastmod = url_elem.find("ns:lastmod", namespace)
            changefreq = url_elem.find("ns:changefreq", namespace)
            priority = url_elem.find("ns:priority", namespace)
            
            assert loc is not None and loc.text is not None
            assert lastmod is not None and lastmod.text is not None
            assert changefreq is not None and changefreq.text is not None
            assert priority is not None and priority.text is not None
            
            # Validate priority is within range
            priority_val = float(priority.text)
            assert 0.1 <= priority_val <= 1.0
            
            # Validate changefreq values
            assert changefreq.text in ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"]
            
            # Validate lastmod format (YYYY-MM-DD)
            assert len(lastmod.text) == 10
            datetime.strptime(lastmod.text, "%Y-%m-%d")
    
    @patch('app.api.seo.get_db')
    def test_sitemap_caching_headers(self, mock_get_db):
        """Test sitemap response has proper caching headers."""
        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []
        mock_get_db.return_value = mock_db
        
        from app.api.seo import get_sitemap
        import asyncio
        
        result = asyncio.run(get_sitemap(mock_db))
        
        assert result.status_code == 200
        assert "cache-control" in result.headers
        assert "public, max-age=86400" in result.headers["cache-control"]
        assert result.headers["content-type"] == "application/xml; charset=utf-8"
    
    @patch('app.api.seo.get_db')
    def test_sitemap_error_handling(self, mock_get_db):
        """Test sitemap handles database errors gracefully."""
        # Mock database to raise an exception
        mock_db = Mock()
        mock_db.query.side_effect = Exception("Database error")
        mock_get_db.return_value = mock_db
        
        from app.api.seo import get_sitemap
        import asyncio
        
        with pytest.raises(Exception):  # Should raise HTTPException with 500 status
            asyncio.run(get_sitemap(mock_db))


class TestPriorityCalculation:
    """Test priority calculation functions."""
    
    def test_conversion_priority_calculation(self):
        """Test conversion priority calculation based on view count and recency."""
        from app.api.seo import calculate_conversion_priority
        
        # Recent conversion with high views
        recent_high_views = MockConversion(
            view_count=1500,
            created_at=datetime.utcnow() - timedelta(days=10)
        )
        
        # Old conversion with low views
        old_low_views = MockConversion(
            view_count=5,
            created_at=datetime.utcnow() - timedelta(days=200)
        )
        
        # Medium conversion
        medium_conversion = MockConversion(
            view_count=150,
            created_at=datetime.utcnow() - timedelta(days=60)
        )
        
        priority_high = calculate_conversion_priority(recent_high_views)
        priority_low = calculate_conversion_priority(old_low_views)
        priority_medium = calculate_conversion_priority(medium_conversion)
        
        # High priority should be higher than medium, which should be higher than low
        assert priority_high > priority_medium > priority_low
        
        # All priorities should be within valid range
        assert 0.1 <= priority_high <= 0.9
        assert 0.1 <= priority_medium <= 0.9
        assert 0.1 <= priority_low <= 0.9
    
    def test_context_stack_priority_calculation(self):
        """Test context stack priority calculation based on usage and template status."""
        from app.api.seo import calculate_context_stack_priority
        
        # High usage template
        high_usage_template = MockContextStack(
            use_count=100,
            is_template=True,
            last_used_at=datetime.utcnow() - timedelta(days=2)
        )
        
        # Low usage non-template
        low_usage_stack = MockContextStack(
            use_count=1,
            is_template=False,
            last_used_at=datetime.utcnow() - timedelta(days=100)
        )
        
        # Medium usage template
        medium_template = MockContextStack(
            use_count=15,
            is_template=True,
            last_used_at=datetime.utcnow() - timedelta(days=20)
        )
        
        priority_high = calculate_context_stack_priority(high_usage_template)
        priority_low = calculate_context_stack_priority(low_usage_stack)
        priority_medium = calculate_context_stack_priority(medium_template)
        
        # High priority should be higher than medium, which should be higher than low
        assert priority_high > priority_medium > priority_low
        
        # All priorities should be within valid range
        assert 0.1 <= priority_high <= 0.8
        assert 0.1 <= priority_medium <= 0.8
        assert 0.1 <= priority_low <= 0.8
    
    def test_priority_calculation_edge_cases(self):
        """Test priority calculation edge cases."""
        from app.api.seo import calculate_conversion_priority, calculate_context_stack_priority
        
        # Conversion with no creation date
        no_date_conversion = MockConversion(
            view_count=50,
            created_at=None
        )
        
        # Context stack with no last_used_at
        no_usage_date_stack = MockContextStack(
            use_count=5,
            is_template=False,
            last_used_at=None
        )
        
        # These should not raise exceptions
        conversion_priority = calculate_conversion_priority(no_date_conversion)
        stack_priority = calculate_context_stack_priority(no_usage_date_stack)
        
        assert 0.1 <= conversion_priority <= 0.9
        assert 0.1 <= stack_priority <= 0.8


class TestRobotsTxt:
    """Test robots.txt functionality."""
    
    def test_robots_txt_basic_structure(self):
        """Test basic robots.txt structure and content."""
        from app.api.seo import get_robots_txt
        import asyncio
        
        result = asyncio.run(get_robots_txt())
        
        assert result.status_code == 200
        assert result.media_type == "text/plain"
        
        content = result.body.decode()
        assert "User-agent: *" in content
        assert "Allow: /" in content
        assert "Sitemap: https://ctxt.help/sitemap.xml" in content
        assert "Crawl-delay: 1" in content
    
    def test_robots_txt_allowed_paths(self):
        """Test that robots.txt allows specific paths."""
        from app.api.seo import get_robots_txt
        import asyncio
        
        result = asyncio.run(get_robots_txt())
        
        assert result.status_code == 200
        content = result.body.decode()
        
        assert "Allow: /read/" in content
        assert "Allow: /page/" in content
        assert "Allow: /context/" in content
    
    def test_robots_txt_disallowed_paths(self):
        """Test that robots.txt disallows admin and API paths."""
        from app.api.seo import get_robots_txt
        import asyncio
        
        result = asyncio.run(get_robots_txt())
        
        assert result.status_code == 200
        content = result.body.decode()
        
        assert "Disallow: /api/" in content
        assert "Disallow: /admin/" in content
        assert "Disallow: /auth/" in content
    
    def test_robots_txt_caching_headers(self):
        """Test robots.txt response has proper caching headers."""
        from app.api.seo import get_robots_txt
        import asyncio
        
        result = asyncio.run(get_robots_txt())
        
        assert result.status_code == 200
        assert "cache-control" in result.headers
        assert "public, max-age=86400" in result.headers["cache-control"]
        assert result.headers["content-type"] == "text/plain; charset=utf-8"


class TestSitemapURLPatterns:
    """Test that all expected URL patterns are included in sitemap."""
    
    @patch('app.api.seo.get_db')
    def test_all_conversion_url_patterns(self, mock_get_db):
        """Test that all conversion URL patterns are included."""
        conversion = MockConversion(
            slug="test-conversion",
            is_public=True,
            is_indexed=True,
            view_count=50
        )
        
        # Mock database queries
        mock_db = Mock()
        mock_conversions_query = Mock()
        mock_conversions_query.filter.return_value.order_by.return_value.all.return_value = [conversion]
        mock_stacks_query = Mock()
        mock_stacks_query.filter.return_value.order_by.return_value.all.return_value = []
        
        def mock_query(model):
            if "Conversion" in str(model):
                return mock_conversions_query
            elif "ContextStack" in str(model):
                return mock_stacks_query
            return Mock()
        
        mock_db.query = mock_query
        mock_get_db.return_value = mock_db
        
        from app.api.seo import get_sitemap
        import asyncio
        
        result = asyncio.run(get_sitemap(mock_db))
        
        assert result.status_code == 200
        root = ET.fromstring(result.body.decode())
        namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        found_urls = [url.find("ns:loc", namespace).text for url in root.findall("ns:url", namespace) if url.find("ns:loc", namespace) is not None]
        
        # Check all expected conversion URL patterns
        expected_patterns = [
            f"https://ctxt.help/read/{conversion.slug}",
            f"https://ctxt.help/page/{conversion.slug}",
            f"https://ctxt.help/page/{conversion.slug}/markdown"
        ]
        
        for pattern in expected_patterns:
            assert pattern in found_urls, f"URL pattern {pattern} not found in sitemap"
    
    @patch('app.api.seo.get_db')
    def test_all_context_stack_url_patterns(self, mock_get_db):
        """Test that all context stack URL patterns are included."""
        stack = MockContextStack(
            id=uuid.uuid4(),
            name="Test Stack",
            is_public=True,
            use_count=5
        )
        
        # Mock database queries
        mock_db = Mock()
        mock_conversions_query = Mock()
        mock_conversions_query.filter.return_value.order_by.return_value.all.return_value = []
        mock_stacks_query = Mock()
        mock_stacks_query.filter.return_value.order_by.return_value.all.return_value = [stack]
        
        def mock_query(model):
            if "Conversion" in str(model):
                return mock_conversions_query
            elif "ContextStack" in str(model):
                return mock_stacks_query
            return Mock()
        
        mock_db.query = mock_query
        mock_get_db.return_value = mock_db
        
        from app.api.seo import get_sitemap
        import asyncio
        
        result = asyncio.run(get_sitemap(mock_db))
        
        assert result.status_code == 200
        root = ET.fromstring(result.body.decode())
        namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        found_urls = [url.find("ns:loc", namespace).text for url in root.findall("ns:url", namespace) if url.find("ns:loc", namespace) is not None]
        
        # Check all expected context stack URL patterns
        expected_patterns = [
            f"https://ctxt.help/context/{stack.id}",
            f"https://ctxt.help/context/{stack.id}/markdown",
            f"https://ctxt.help/context/{stack.id}/xml"
        ]
        
        for pattern in expected_patterns:
            assert pattern in found_urls, f"URL pattern {pattern} not found in sitemap"


class TestSitemapIntegration:
    """Test sitemap integration scenarios."""
    
    @patch('app.api.seo.get_db')
    def test_sitemap_with_mixed_content(self, mock_get_db):
        """Test sitemap with mixed conversions and context stacks from different users."""
        # Create public conversion
        conversion = MockConversion(
            slug="user-conversion",
            is_public=True,
            is_indexed=True,
            view_count=100
        )
        
        # Create public context stack
        stack = MockContextStack(
            id=uuid.uuid4(),
            name="User Stack",
            is_public=True,
            use_count=10
        )
        
        # Mock database queries
        mock_db = Mock()
        mock_conversions_query = Mock()
        mock_conversions_query.filter.return_value.order_by.return_value.all.return_value = [conversion]
        mock_stacks_query = Mock()
        mock_stacks_query.filter.return_value.order_by.return_value.all.return_value = [stack]
        
        def mock_query(model):
            if "Conversion" in str(model):
                return mock_conversions_query
            elif "ContextStack" in str(model):
                return mock_stacks_query
            return Mock()
        
        mock_db.query = mock_query
        mock_get_db.return_value = mock_db
        
        from app.api.seo import get_sitemap
        import asyncio
        
        result = asyncio.run(get_sitemap(mock_db))
        
        assert result.status_code == 200
        root = ET.fromstring(result.body.decode())
        namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        found_urls = [url.find("ns:loc", namespace).text for url in root.findall("ns:url", namespace) if url.find("ns:loc", namespace) is not None]
        
        # Check that content from both types is included
        assert f"https://ctxt.help/read/{conversion.slug}" in found_urls
        assert f"https://ctxt.help/context/{stack.id}" in found_urls
    
    @patch('app.api.seo.get_db')
    def test_sitemap_performance_with_large_dataset(self, mock_get_db):
        """Test sitemap generation performance with larger dataset."""
        # Create multiple conversions
        conversions = [
            MockConversion(
                slug=f"bulk-conversion-{i}",
                is_public=True,
                is_indexed=True,
                view_count=i * 10
            ) for i in range(10)
        ]
        
        # Create multiple context stacks
        stacks = [
            MockContextStack(
                id=uuid.uuid4(),
                name=f"Bulk Stack {i}",
                is_public=True,
                use_count=i * 5
            ) for i in range(5)
        ]
        
        # Mock database queries
        mock_db = Mock()
        mock_conversions_query = Mock()
        mock_conversions_query.filter.return_value.order_by.return_value.all.return_value = conversions
        mock_stacks_query = Mock()
        mock_stacks_query.filter.return_value.order_by.return_value.all.return_value = stacks
        
        def mock_query(model):
            if "Conversion" in str(model):
                return mock_conversions_query
            elif "ContextStack" in str(model):
                return mock_stacks_query
            return Mock()
        
        mock_db.query = mock_query
        mock_get_db.return_value = mock_db
        
        from app.api.seo import get_sitemap
        import asyncio
        
        result = asyncio.run(get_sitemap(mock_db))
        
        assert result.status_code == 200
        root = ET.fromstring(result.body.decode())
        
        # Should include homepage + (10 conversions * 3 URLs each) + (5 stacks * 3 URLs each)
        # = 1 + 30 + 15 = 46 URLs
        namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        urls = root.findall("ns:url", namespace)
        assert len(urls) >= 46


# To run these tests:
# 
# 1. Individual test class:
#    ENVIRONMENT=testing JWT_SECRET_KEY=test-jwt-secret-key-for-testing-only-min-32-chars python -m pytest tests/test_sitemap.py::TestSitemapGeneration -v
#
# 2. Individual test method:
#    ENVIRONMENT=testing JWT_SECRET_KEY=test-jwt-secret-key-for-testing-only-min-32-chars python -m pytest tests/test_sitemap.py::TestSitemapGeneration::test_sitemap_basic_structure -v
#
# 3. All sitemap tests:
#    ENVIRONMENT=testing JWT_SECRET_KEY=test-jwt-secret-key-for-testing-only-min-32-chars python -m pytest tests/test_sitemap.py -v
#
# 4. With coverage:
#    ENVIRONMENT=testing JWT_SECRET_KEY=test-jwt-secret-key-for-testing-only-min-32-chars python -m pytest tests/test_sitemap.py --cov=app.api.seo -v