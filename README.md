# ctxt.help - The LLM Context Builder

**"Turn any webpage into perfect LLM input with shareable, permanent links"**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/username/ctxt)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Deploy](https://img.shields.io/badge/deploy-production--ready-brightgreen.svg)](https://ctxt.help)
[![Security](https://img.shields.io/badge/security-hardened-blue.svg)](https://ctxt.help)
[![Test Coverage](https://img.shields.io/badge/coverage-85%2B-green.svg)](https://ctxt.help)

## 🎯 Overview

ctxt.help is the first URL-to-markdown converter that combines client-side processing, programmatic SEO, and native AI tool integration. We're building essential developer infrastructure that turns any webpage into clean, LLM-ready content with shareable, permanent links.

### Key Features

- 🔄 **Client-Side Processing** - Zero server costs, unlimited usage, works offline
- 🔗 **Programmatic SEO** - Every conversion becomes a searchable, permanent page
- 🤖 **MCP Server Integration** - First-class support for Cursor, Claude Desktop, and all AI tools
- 📚 **Context Building** - Stack multiple sources into perfect LLM input with XML formatting

## 🏗️ Architecture

**New Unified Architecture (Next.js SSR)**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │    │   FastAPI API   │    │   MCP Server    │
│                 │    │                 │    │                 │
│ • SSR Pages     │───▶│ • Business      │───▶│ • AI Tool       │
│ • Client SPA    │    │   Logic         │    │   Integration   │ 
│ • API Proxy     │    │ • Database      │    │ • Library API   │
│ • Bot Detection │    │ • Auth & Users  │    │ • Context Tools │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │
        └───────────────────────┘
         Unified serving on port 3000
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+
- PostgreSQL 14+
- Redis 6+
- Docker & Docker Compose

### Development Setup

#### Quick Start (Recommended) - Next.js Version
```bash
# Start all services with Docker
docker-compose up frontend-next backend postgresql redis --build

# Or manually:
cd ctxt
./start-frontend-next.sh  # Next.js frontend
./start-backend.sh        # FastAPI backend (separate terminal)
```

#### Legacy Frontend (React + Vite)
```bash
# Still available for comparison
docker-compose up frontend-legacy backend postgresql redis --build
```

#### Manual Setup
```bash
# Infrastructure
docker-compose up postgresql redis -d

# Next.js Frontend (new approach)
cd frontend-next
npm install
npm run dev

# Backend (separate terminal)
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# MCP server (separate terminal)
cd mcp-server && npm install && npm run build && npm run dev
```

**Development URLs:**
- **Next.js Frontend**: http://localhost:3000 ⭐ *New unified approach*
- **Legacy Frontend**: http://localhost:5173 (for comparison)
- **Backend API**: http://localhost:8000  
- **API Documentation**: http://localhost:8000/docs
- **MCP Server**: http://localhost:3001

**SEO Pages**: Now served from http://localhost:3000/read/{slug} with unified routing!

### Environment Configuration

The setup script automatically creates `.env` files with proper defaults. For manual configuration:

```bash
# Core Configuration
ENVIRONMENT=development
JWT_SECRET_KEY=<generated-32-char-secret>
DATABASE_URL=postgresql://ctxt_user:ctxt_password@192.168.117.2:5432/ctxt_help
REDIS_URL=redis://localhost:6379/0

# Payment Processing (Polar.sh) - Required for production
POLAR_ACCESS_TOKEN=polar_oat_your_access_token
POLAR_WEBHOOK_SECRET=wh_secret_your_webhook_secret
POLAR_ORGANIZATION_ID=org_your_organization_id
POLAR_SUCCESS_URL=http://localhost:5173/success?checkout_id={CHECKOUT_ID}

# Product Configuration
POLAR_POWER_PRODUCT_ID=prod_your_power_product_id
POLAR_PRO_PRODUCT_ID=prod_your_pro_product_id
POLAR_ENTERPRISE_PRODUCT_ID=prod_your_enterprise_product_id

# Email Configuration (Optional)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASSWORD=your_email_password
FROM_EMAIL=noreply@ctxt.help

# Feature Flags
JINA_FALLBACK_ENABLED=true
MCP_SERVER_ENABLED=true
SEO_PAGES_ENABLED=true
ANALYTICS_ENABLED=false

# Monitoring (Production)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# CORS Settings
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

**Environment-Specific Configs:** The application loads additional configuration from `backend/config/{environment}.json` files that override defaults for development, production, and testing environments.

**Database Connection Troubleshooting:** If you encounter PostgreSQL connection errors:
1. Check if local PostgreSQL is running and conflicting with Docker: `lsof -i :5432`
2. Use the Docker container IP instead of localhost: `192.168.117.2:5432`
3. Get container IP: `docker network inspect ctxt_default | grep IPv4Address`

## 📁 Project Structure

```
ctxt/
├── frontend-next/         # Next.js 15 + TypeScript + SSR (NEW)
│   ├── src/
│   │   ├── app/
│   │   │   ├── read/[slug]/       # SSR SEO pages
│   │   │   ├── api/[...path]/     # API proxy routes
│   │   │   ├── layout.tsx         # Root layout
│   │   │   └── page.tsx           # Homepage
│   │   ├── components/        # React components (ContextBuilder, ConversionForm)
│   │   ├── services/          # API clients and utilities
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Bot detection, utilities
│   │   └── types/             # TypeScript definitions
│   ├── middleware.ts          # Next.js middleware for bot detection
│   ├── tailwind.config.ts     # Tailwind with typography
│   └── Dockerfile.dev
├── frontend/              # Legacy React + Vite (for comparison)
│   └── [existing structure]
├── backend/               # FastAPI + Python + PostgreSQL
│   ├── app/
│   │   ├── api/               # REST API endpoints
│   │   │   └── seo.py             # SEO pages (legacy route)
│   │   ├── core/              # Auth, database, config management
│   │   ├── models/            # SQLAlchemy database models
│   │   ├── services/          # Business logic layer
│   │   │   └── bot_detection.py   # Python bot detection
│   │   ├── middleware/        # Custom middleware (CORS, rate limiting)
│   │   └── main.py            # FastAPI application
│   ├── config/                # Environment-specific configurations
│   ├── alembic/               # Database migrations
│   ├── tests/                 # Backend test suites
│   └── requirements.txt
├── mcp-server/            # Node.js + TypeScript MCP integration
│   └── [existing structure]
├── scripts/               # Setup and utility scripts
├── docker-compose.yml     # Updated with frontend-next service
├── start-frontend-next.sh # Quick start script
├── CLAUDE.md              # Development guidelines
└── README.md              # This file
```

## 🔧 Technology Stack

### Frontend (Next.js - Recommended)
- **Framework**: Next.js 15 + App Router + TypeScript
- **Rendering**: SSR for SEO pages, CSR for interactive components
- **Styling**: Tailwind CSS v4 + Typography plugin
- **State Management**: React hooks + Context API
- **HTTP Client**: Axios with interceptors + Next.js API routes
- **UI Components**: Pragmatic Drag and Drop (Atlassian)
- **Bot Detection**: Client-side with middleware integration
- **Testing**: Vitest + React Testing Library (80%+ coverage)

### Frontend (Legacy - React + Vite)
- **Framework**: React 19 + TypeScript + Vite
- **Available at**: http://localhost:5173 (for comparison)

### Backend
- **Framework**: FastAPI + Python 3.9+ with async/await
- **Database**: PostgreSQL + SQLAlchemy ORM + Alembic migrations
- **Caching**: Redis with session management
- **Authentication**: JWT with secure token handling
- **Payment**: Polar.sh SDK integration
- **Architecture**: Service layer pattern with dependency injection
- **Security**: Rate limiting, input validation, CORS protection
- **Testing**: Pytest with fixtures (85%+ coverage)

### MCP Server
- **Runtime**: Node.js 18+ + TypeScript
- **MCP SDK**: @modelcontextprotocol/sdk
- **HTTP Client**: Axios with error handling
- **Tools**: URL conversion, library search, context building
- **Distribution**: NPM package with TypeScript declarations

### Infrastructure
- **Development**: Docker Compose with PostgreSQL + Redis
- **Configuration**: Multi-environment JSON configs with validation
- **Database**: Comprehensive migrations with relationships
- **Monitoring**: Structured logging with Sentry integration

## 💰 Pricing Tiers

### 🆓 Free Tier - "Essential Access"
- 5 conversions per day (150/month)
- Full client-side conversion capability
- Copy to clipboard, ChatGPT, Claude
- Access to all public SEO pages

### ⭐ Power User - "Unlimited Workflow" ($5/month)
- Unlimited conversions
- Conversation library - save and organize
- Advanced export - PDF, DOCX, plain text
- Context templates - reusable patterns
- Browser extension - right-click convert

### 🚀 Pro - "AI Integration" ($15/month)
- MCP Server access - Cursor, Claude Desktop integration
- API access - custom integrations
- Advanced context tools - bulk processing, custom XML
- Team sharing - shared libraries
- Analytics dashboard - usage insights

### 🏢 Enterprise - "Custom Infrastructure" (Custom Pricing)
- Self-hosted MCP server
- Custom rate limits
- SSO integration
- SLA guarantees
- Dedicated support

## 🔍 Core Features

### URL Conversion Engine
Convert any webpage to clean markdown using Jina Reader API with client-side processing for speed and reliability.

### Context Building System
Stack multiple URL conversions and text blocks into perfect LLM context with XML formatting and drag-and-drop reordering.

### SEO Page Generation
Every conversion automatically generates a permanent, SEO-optimized page at `ctxt.help/read/{slug}` for sharing and discovery.

### MCP Server Integration
Native integration with AI tools like Claude Desktop and Cursor through the Model Context Protocol (MCP).

## 🧪 Testing

### Test Coverage Requirements
- **Frontend**: 80%+ coverage with Vitest + React Testing Library
- **Backend**: 85%+ coverage with Pytest + fixtures
- **MCP Server**: Unit and integration tests with Jest

### Running Tests

#### All Tests (Recommended)
```bash
# Run comprehensive test suite across all components
./scripts/run-tests.sh
```

#### Individual Components
```bash
# Frontend tests
cd frontend
npm test              # Unit tests with Vitest
npm run test:coverage # Coverage report
npm run test:watch    # Watch mode for development

# Backend tests
cd backend
source venv/bin/activate
pytest tests/ -v      # All tests with verbose output
pytest --cov=app      # Coverage report
pytest -k "test_conversion" # Run specific test patterns

# MCP Server tests
cd mcp-server
npm test              # Unit tests
npm run test:watch    # Watch mode
```

### Test Structure
- **Frontend**: `frontend/tests/` with component and integration tests
- **Backend**: `backend/tests/` with API, service, and database tests  
- **MCP Server**: `mcp-server/tests/` with tool and integration tests
- **Fixtures**: Shared test data and database fixtures in `backend/tests/fixtures/`

## 🚀 Deployment

### Development
```bash
docker-compose up -d  # Start all services
```

### Production

#### Environment Setup
```bash
# Production environment setup
./scripts/setup-environment.sh production

# Review generated configuration
cat .env  # Update with production values
```

#### Deployment Targets
- **Frontend**: Static hosting (Vercel/Netlify) with environment variables
- **Backend**: API hosting (Railway/Render/AWS) with PostgreSQL + Redis
- **Database**: Managed PostgreSQL (Railway/Supabase/AWS RDS)
- **MCP Server**: NPM registry distribution for end-users

#### Security Checklist
- ✅ JWT secrets properly configured (32+ characters)
- ✅ Database credentials secured  
- ✅ CORS origins restricted to production domains
- ✅ Rate limiting enabled
- ✅ HTTPS enforced
- ✅ Environment-specific configurations loaded
- ✅ Sentry monitoring configured

## 📖 Documentation

- [API Reference](docs/api.md) - Complete API documentation
- [MCP Integration Guide](docs/mcp.md) - Setup and usage guide
- [Contributing Guide](CONTRIBUTING.md) - Development guidelines
- [Style Guide](TODO.md) - Code standards and conventions

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Website**: [ctxt.help](https://ctxt.help)
- **Documentation**: [help.ctxt.help](https://help.ctxt.help)
- **Status Page**: [status.ctxt.help](https://status.ctxt.help)
- **Support**: support@ctxt.help

## 🎯 Roadmap

### ✅ Completed (v1.1)
- [x] **Next.js Migration** - Unified serving with SSR SEO pages on port 3000
- [x] **Pragmatic Drag and Drop** - Modern drag-and-drop with Atlassian's library
- [x] **Bot Detection** - TypeScript implementation with middleware integration
- [x] **Unified Architecture** - Single frontend serving both SPA and SEO content
- [x] **Security Hardening** - JWT secrets, SQL injection protection, auth validation
- [x] **Core Architecture** - Service layer pattern, dependency injection, error handling
- [x] **Context Builder** - Drag-and-drop UI for context stacking
- [x] **MCP Server** - Full implementation with convert-url, search-library, context tools
- [x] **Authentication System** - Complete JWT auth with user registration/login
- [x] **Testing Framework** - 85% backend coverage, frontend test suites, automated testing
- [x] **Configuration Management** - Multi-environment configs, automated setup scripts
- [x] **Database Schema** - Complete migrations with proper relationships
- [x] **Rate Limiting** - Tier-based rate limiting with Redis backend
- [x] **Payment Integration** - Polar.sh SDK with configurable products

### 🚧 In Progress (v1.2)  
- [ ] **Production Deployment** - CI/CD pipeline, monitoring, performance optimization
- [ ] **API Documentation** - OpenAPI specs, interactive docs, SDK generation
- [ ] **Browser Extension** - Right-click conversion, clipboard integration
- [ ] **Performance Optimization** - Edge caching, image optimization, bundle splitting

### 🎯 Planned (v2.0)
- [ ] **Team Features** - Shared libraries, collaboration tools
- [ ] **Advanced Export** - PDF/DOCX generation, custom templates
- [ ] **Analytics Dashboard** - Usage insights, performance metrics
- [ ] **Enterprise SSO** - SAML/OAuth integration, admin controls

---

**Ready to build the future of AI-powered content workflows? Let's ship it! 🚀**