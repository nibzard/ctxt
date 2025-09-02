# ctxt.help - The LLM Context Builder

**"Turn any webpage into perfect LLM input with shareable, permanent links"**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/username/ctxt)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Deploy](https://img.shields.io/badge/deploy-ready-brightgreen.svg)](https://ctxt.help)

## 🎯 Overview

ctxt.help is the first URL-to-markdown converter that combines client-side processing, programmatic SEO, and native AI tool integration. We're building essential developer infrastructure that turns any webpage into clean, LLM-ready content with shareable, permanent links.

### Key Features

- 🔄 **Client-Side Processing** - Zero server costs, unlimited usage, works offline
- 🔗 **Programmatic SEO** - Every conversion becomes a searchable, permanent page
- 🤖 **MCP Server Integration** - First-class support for Cursor, Claude Desktop, and all AI tools
- 📚 **Context Building** - Stack multiple sources into perfect LLM input with XML formatting

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client-Side   │    │   Server-Side   │    │   MCP Server    │
│                 │    │                 │    │                 │
│ • Jina Reader   │───▶│ • Persistence   │───▶│ • AI Tool       │
│ • UI/UX         │    │ • SEO Pages     │    │   Integration   │
│ • Context Stack │    │ • User Library  │    │ • Library API   │
│ • Free Usage    │    │ • Premium API   │    │ • Context Tools │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+
- PostgreSQL 14+
- Redis 6+
- Docker & Docker Compose

### Development Setup

```bash
# Clone repository
git clone https://github.com/username/ctxt.git
cd ctxt

# Start development environment
docker-compose up -d

# Frontend setup
cd frontend
npm install
npm run dev

# Backend setup (new terminal)
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload

# MCP server setup (new terminal)
cd mcp-server
npm install
npm run dev
```

### Environment Variables

Create `.env` file in the project root:

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/ctxt_help
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET_KEY=your-jwt-secret-here

# Payment Processing (Polar.sh)
POLAR_ACCESS_TOKEN=polar_oat_your_access_token
POLAR_WEBHOOK_SECRET=wh_secret_your_webhook_secret
POLAR_ORGANIZATION_ID=org_your_organization_id
POLAR_SUCCESS_URL=http://localhost:3000/success?checkout_id={CHECKOUT_ID}

# Feature Flags
JINA_FALLBACK_ENABLED=true
MCP_SERVER_ENABLED=true
SEO_PAGES_ENABLED=true

# Rate Limits
RATE_LIMIT_FREE_DAILY=5
RATE_LIMIT_POWER_DAILY=unlimited
RATE_LIMIT_PRO_DAILY=unlimited

# Development
DEBUG=true
LOG_LEVEL=info
```

## 📁 Project Structure

```
ctxt/
├── frontend/          # React + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API and utility services
│   │   ├── types/         # TypeScript type definitions
│   │   └── hooks/         # Custom React hooks
│   ├── public/
│   └── package.json
├── backend/           # FastAPI + Python + PostgreSQL
│   ├── app/
│   │   ├── api/           # API route handlers
│   │   ├── core/          # Auth, database, config
│   │   ├── models/        # Database models
│   │   ├── services/      # Business logic
│   │   └── main.py        # FastAPI application
│   ├── alembic/           # Database migrations
│   ├── tests/
│   └── requirements.txt
├── mcp-server/        # Node.js + TypeScript MCP integration
│   ├── src/
│   │   ├── tools/         # MCP tool implementations
│   │   ├── api/           # ctxt.help API client
│   │   └── index.ts       # Main MCP server
│   ├── dist/              # Compiled JavaScript
│   └── package.json
├── docs/              # Documentation and guides
├── docker-compose.yml # Development environment
├── TODO.md            # Style guide and task breakdown
└── README.md          # This file
```

## 🔧 Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: React Context + useReducer
- **HTTP Client**: Axios
- **Testing**: Jest + React Testing Library

### Backend
- **Framework**: FastAPI + Python 3.9+
- **Database**: PostgreSQL + SQLAlchemy + Alembic
- **Caching**: Redis
- **Authentication**: JWT + bcrypt
- **Payment**: Polar.sh
- **Testing**: Pytest

### MCP Server
- **Runtime**: Node.js 18+ + TypeScript
- **MCP SDK**: Anthropic MCP SDK
- **HTTP Client**: Axios
- **Distribution**: NPM package

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

### Frontend
```bash
cd frontend
npm test              # Unit tests
npm run test:coverage # Coverage report
npm run test:e2e      # End-to-end tests
```

### Backend
```bash
cd backend
pytest tests/ -v      # All tests
pytest --cov=app      # Coverage report
```

### MCP Server
```bash
cd mcp-server
npm test              # Unit tests
npm run test:integration # Integration tests
```

## 🚀 Deployment

### Development
```bash
docker-compose up -d  # Start all services
```

### Production
- **Frontend**: Vercel/Netlify for static hosting
- **Backend**: Railway/Render for API hosting
- **Database**: PostgreSQL on Railway/Supabase
- **MCP Server**: NPM registry distribution

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

- [x] MVP with core conversion features
- [x] SEO page generation
- [x] Free tier with rate limiting
- [ ] MCP server development
- [ ] Power User tier
- [ ] Pro tier with API access
- [ ] Enterprise features

---

**Ready to build the future of AI-powered content workflows? Let's ship it! 🚀**