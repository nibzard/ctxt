# API Documentation

## Overview

The ctxt.help API provides endpoints for URL conversion, user management, and context building.

### Base URL
- Development: `http://localhost:8000`
- Production: `https://api.ctxt.help`

### Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Core Endpoints

### Conversion Endpoints

#### Convert URL
```http
POST /api/convert
Content-Type: application/json
Authorization: Bearer <token>

{
  "url": "https://example.com/page",
  "options": {
    "include_images": true,
    "custom_selector": ".content"
  }
}
```

Response:
```json
{
  "id": "uuid",
  "url": "https://example.com/page",
  "title": "Page Title",
  "content": "# Converted Markdown Content...",
  "word_count": 500,
  "reading_time": 3,
  "created_at": "2025-09-02T10:00:00Z"
}
```

#### Save Conversion
```http
POST /api/conversions/{conversion_id}/save
Authorization: Bearer <token>

{
  "make_public": true,
  "tags": ["documentation", "react"]
}
```

Response:
```json
{
  "slug": "react-hooks-guide",
  "permanent_url": "https://ctxt.help/read/react-hooks-guide",
  "seo_optimized": true
}
```

#### List Conversions
```http
GET /api/conversions?search=react&limit=10&offset=0
Authorization: Bearer <token>
```

Response:
```json
{
  "items": [
    {
      "id": "uuid",
      "slug": "react-hooks-guide",
      "title": "React Hooks Guide",
      "url": "https://example.com/react-hooks",
      "created_at": "2025-09-02T10:00:00Z",
      "view_count": 25
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

### Authentication Endpoints

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

Response:
```json
{
  "access_token": "jwt-token",
  "refresh_token": "refresh-token",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "tier": "free"
  }
}
```

### SEO Pages

#### Get SEO Page
```http
GET /read/{slug}
```

Returns HTML page optimized for SEO with meta tags, structured data, and clean markdown rendering.

## Error Responses

All endpoints return consistent error responses:

```json
{
  "detail": "Error message",
  "code": "ERROR_CODE",
  "type": "validation_error"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Rate Limiting

Rate limits are enforced based on user tier:

- **Free**: 5 conversions per day
- **Power**: Unlimited conversions
- **Pro**: Unlimited conversions + API access

Rate limit headers:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1640995200
```

## MCP Integration Endpoints

These endpoints are used by the MCP server and require API key authentication:

#### MCP Convert
```http
POST /api/mcp/convert
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "url": "https://example.com",
  "format": "xml"
}
```

#### MCP Search Library
```http
GET /api/mcp/library?q=search-term&limit=10
Authorization: Bearer <api-key>
```

#### MCP Create Context Stack
```http
POST /api/mcp/context-stack
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "urls": [
    "https://example.com/page1",
    "https://example.com/page2"
  ],
  "format": "xml",
  "custom_context": "Additional context for the AI"
}
```

## SDK Examples

### Python
```python
import requests

api_base = "http://localhost:8000"
token = "your-jwt-token"

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# Convert URL
response = requests.post(
    f"{api_base}/api/convert",
    json={"url": "https://example.com"},
    headers=headers
)

conversion = response.json()
print(conversion["content"])  # Markdown content
```

### JavaScript
```javascript
const apiBase = 'http://localhost:8000';
const token = 'your-jwt-token';

async function convertUrl(url) {
  const response = await fetch(`${apiBase}/api/convert`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url })
  });
  
  return await response.json();
}

// Usage
const conversion = await convertUrl('https://example.com');
console.log(conversion.content);
```