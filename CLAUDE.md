# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ctxt.help is a URL-to-markdown converter with three main components:
- **Frontend**: React + TypeScript + Tailwind CSS (Vite)
- **Backend**: FastAPI + Python + PostgreSQL + Redis
- **MCP Server**: Node.js + TypeScript for AI tool integration

The application converts webpages to clean markdown with shareable permanent links, context building features, and native integration with AI tools like Claude Desktop and Cursor.

## Development Commands

### Quick Start
```bash
# Start all development services
docker-compose up -d

# Alternative: Use development setup script
./setup-dev.sh
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev        # Development server (localhost:5173)
npm run build      # Production build
npm run lint       # ESLint
npm run preview    # Preview production build
```

### Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head      # Database migrations
uvicorn app.main:app --reload  # Development server (localhost:8000)

# Testing
pytest tests/ -v          # Run tests
pytest --cov=app         # Coverage report
```

### MCP Server (Node.js)
```bash
cd mcp-server
npm install
npm run dev        # Development server
npm run build      # TypeScript compilation
npm test           # Run tests
npm run lint       # ESLint
```

### Database Operations
```bash
# With Docker (recommended for development)
docker-compose up -d postgresql redis

# Manual setup
alembic revision --autogenerate -m "description"  # Create migration
alembic upgrade head                              # Apply migrations
alembic downgrade -1                              # Rollback one migration
```

## Architecture Overview

### Request Flow
1. **Client-Side Conversion**: Frontend uses Jina Reader API for URL-to-markdown conversion
2. **SEO Page Generation**: Backend creates permanent pages at `/read/{slug}` for each conversion
3. **Context Building**: Users can stack multiple conversions with drag-and-drop reordering
4. **MCP Integration**: AI tools access conversions through the MCP server

### Key Components

#### Frontend (`frontend/src/`)
- `components/ConversionForm.tsx` - Main URL input and conversion interface
- `components/ContextBuilder.tsx` - Context stacking with drag-and-drop (React DnD)
- `components/PricingSection.tsx` - Subscription pricing tiers
- `services/api.ts` - Axios-based API client
- `hooks/useConversion.ts` - Custom hook for conversion logic

#### Backend (`backend/app/`)
- `main.py` - FastAPI application entry point
- `api/conversions.py` - URL conversion endpoints
- `api/payment.py` - Polar payment integration (replaces Stripe)
- `services/conversion.py` - Core business logic
- `models/` - SQLAlchemy database models
- `core/auth.py` - JWT authentication

#### MCP Server (`mcp-server/src/`)
- `index.ts` - Main MCP server with tool registration
- `tools/` - MCP tool implementations for AI integration
- `api/` - Client for ctxt.help API access

### Database Schema
- `users` - User accounts with subscription tiers
- `conversions` - URL conversions with SEO metadata
- `context_stacks` - Saved context collections (JSONB blocks)

## Code Style & Conventions

### TypeScript (Frontend/MCP)
- Strict typing with explicit interfaces
- PascalCase for components (`ConversionForm`)
- camelCase for functions and variables
- Use const assertions for immutable data
- Prefer explicit return types

### Python (Backend)
- Type hints required for all functions
- snake_case for functions and variables
- PascalCase for classes (`ConversionService`)
- Pydantic models for API schemas
- Docstrings for public functions

### File Naming
- kebab-case for files (`context-builder.tsx`)
- kebab-case for directories (`mcp-server`)
- SCREAMING_SNAKE_CASE for constants

## Testing Requirements

### Coverage Requirements
- Frontend: >80% coverage (Jest + React Testing Library)
- Backend: >85% coverage (Pytest)
- MCP Server: Unit and integration tests (Jest)

### Test Commands
```bash
# Frontend
cd frontend && npm test

# Backend  
cd backend && pytest tests/ -v

# MCP Server
cd mcp-server && npm test
```

## Environment Setup

### Required Services
- PostgreSQL 14+ (port 5432)
- Redis 6+ (port 6379)
- Node.js 18+
- Python 3.9+

### Environment Variables
Create `.env` in project root:
```bash
DATABASE_URL=postgresql://ctxt_user:ctxt_password@localhost:5432/ctxt_help
REDIS_URL=redis://localhost:6379
JWT_SECRET_KEY=your-secret-key
DEBUG=true
```

### Development URLs
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- MCP Server: http://localhost:3001

## Payment Integration

The project uses **Polar.sh** for payment processing with the following architecture:

### SDK Usage
- **Backend**: Uses `polar-sdk` (Python SDK) for server-side operations
- **Frontend**: Makes API calls to backend (no direct Polar integration)
- **MCP Server**: No payment functionality needed

### Key Endpoints
- `POST /api/payment/checkout` - Create checkout session
- `GET /api/payment/status` - Check subscription status  
- `POST /api/payment/webhook` - Handle Polar webhooks
- `POST /api/payment/cancel` - Cancel subscription

### Environment Variables
```bash
POLAR_ACCESS_TOKEN=polar_oat_your_access_token
POLAR_WEBHOOK_SECRET=wh_secret_your_webhook_secret
POLAR_ORGANIZATION_ID=org_your_organization_id
POLAR_SUCCESS_URL=http://localhost:3000/success?checkout_id={CHECKOUT_ID}
```

### Payment Flow
1. Frontend calls `/api/payment/checkout` with product IDs
2. Backend creates Polar checkout session using Python SDK
3. User redirected to Polar-hosted checkout page
4. Webhooks update user subscription status

## Common Development Tasks

### Adding New API Endpoints
1. Create route in `backend/app/api/`
2. Add service logic in `backend/app/services/`
3. Update frontend API client in `frontend/src/services/api.ts`
4. Add tests for both backend and frontend

### Database Changes
1. Update models in `backend/app/models/`
2. Generate migration: `alembic revision --autogenerate -m "description"`
3. Apply migration: `alembic upgrade head`
4. Update corresponding Pydantic schemas

### Frontend Component Development
1. Follow existing patterns in `components/`
2. Use TypeScript interfaces for props
3. Implement with React hooks and Context API
4. Style with Tailwind CSS classes
5. Add tests with React Testing Library

## Deployment Notes

- Frontend: Static hosting (Vercel/Netlify)
- Backend: API hosting (Railway/Render)
- Database: PostgreSQL (Railway/Supabase)
- MCP Server: NPM package distribution