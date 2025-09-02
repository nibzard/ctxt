# TODO.md - ctxt.help Development Guide

**Project:** ctxt.help - The LLM Context Builder  
**Version:** 1.0  
**Status:** Active Development  
**Last Updated:** September 2025

---

## 📋 Style Guide & Development Standards

### Code Style Standards

#### TypeScript (Frontend & MCP Server)
```typescript
// Use strict typing with explicit interfaces
interface ConversionRequest {
  url: string;
  options?: {
    includeImages?: boolean;
    customSelector?: string;
  };
}

// Prefer explicit return types for functions
async function convertUrl(request: ConversionRequest): Promise<ConvertedContent> {
  // Implementation
}

// Use const assertions for immutable data
const EXPORT_FORMATS = ['markdown', 'chatgpt', 'claude', 'xml'] as const;
type ExportFormat = typeof EXPORT_FORMATS[number];

// Component naming: PascalCase
const ContextBuilder: React.FC<ContextBuilderProps> = ({ blocks, onUpdate }) => {
  // Implementation
};
```

#### Python (Backend)
```python
# Use type hints for all function signatures
from typing import List, Optional, Dict, Any, Union
from uuid import UUID

async def create_conversion(
    url: str,
    title: Optional[str] = None,
    user_id: Optional[UUID] = None
) -> Conversion:
    """Create a new URL conversion with SEO optimization."""
    # Implementation

# Use Pydantic models for request/response schemas
class ConversionRequest(BaseModel):
    url: HttpUrl
    title: Optional[str] = None
    options: Optional[ConversionOptions] = None

# Class naming: PascalCase
class ConversionService:
    """Service for handling URL conversions and SEO generation."""
    
    def __init__(self, db: Database) -> None:
        self.db = db
```

#### Naming Conventions
- **Files**: kebab-case (`context-builder.tsx`, `conversion-service.py`)
- **Directories**: kebab-case (`mcp-server`, `api-routes`)
- **Classes**: PascalCase (`ContextBuilder`, `ConversionService`)
- **Functions/Variables**: camelCase (TS) / snake_case (Python)
- **Constants**: SCREAMING_SNAKE_CASE (`API_BASE_URL`, `RATE_LIMIT_FREE`)
- **Database Tables**: snake_case (`conversions`, `context_stacks`)

### Git Workflow

#### Branch Naming
- `feature/` - New features (`feature/mcp-server-integration`)
- `fix/` - Bug fixes (`fix/conversion-error-handling`)
- `docs/` - Documentation (`docs/api-reference`)
- `refactor/` - Code refactoring (`refactor/context-block-component`)

#### Commit Message Format
```
type(scope): brief description

- Detailed explanation if needed
- Use bullet points for multiple changes
- Reference issues: Closes #123

Types: feat, fix, docs, style, refactor, test, chore
Scopes: frontend, backend, mcp-server, docs, deploy
```

Examples:
```
feat(frontend): add drag-and-drop context block reordering

- Implement React DnD for context blocks
- Add visual feedback during drag operations
- Update block order in state management

fix(backend): resolve SEO slug generation conflicts

- Add uniqueness check with MD5 fallback
- Handle special characters in titles
- Closes #45
```

### Testing Requirements

#### Frontend Testing (Jest + React Testing Library)
```typescript
// Component tests
describe('ContextBuilder', () => {
  it('should add new context block when add button clicked', () => {
    // Test implementation
  });
  
  it('should handle URL conversion errors gracefully', () => {
    // Test implementation
  });
});

// Coverage requirements: >80%
```

#### Backend Testing (Pytest)
```python
# Test file naming: test_*.py
async def test_create_conversion_success():
    """Test successful conversion creation."""
    # Test implementation

async def test_conversion_rate_limiting():
    """Test rate limiting for free tier users."""
    # Test implementation

# Coverage requirements: >85%
```

#### Integration Testing
- End-to-end testing with Playwright
- API integration tests
- MCP server integration tests

### Documentation Standards

#### Code Documentation
```typescript
/**
 * Converts a URL to clean markdown format using Jina Reader API
 * @param url - The URL to convert
 * @param options - Conversion options (images, selectors, etc.)
 * @returns Promise resolving to converted content with metadata
 * @throws ConversionError when URL is invalid or conversion fails
 */
async function convertUrl(url: string, options?: ConversionOptions): Promise<ConvertedContent> {
  // Implementation
}
```

#### API Documentation
- Use FastAPI automatic documentation
- Include request/response examples
- Document error codes and responses
- Provide curl examples

#### README Requirements
- Clear setup instructions
- Environment variable documentation
- Testing and deployment guides
- Contributing guidelines

---

## 🗓️ Task Breakdown & Implementation Roadmap

### Phase 1: Foundation (Week 1)

#### Priority: HIGH
- [ ] **Project Structure Setup**
  - [ ] Create monorepo structure (frontend/, backend/, mcp-server/)
  - [ ] Setup package.json files with dependencies
  - [ ] Create docker-compose.yml for development
  - [ ] Environment variable templates (.env.example)
  - [ ] Git repository initialization with .gitignore

- [ ] **Development Environment**
  - [ ] Docker containers for PostgreSQL and Redis
  - [ ] Frontend development server (Vite)
  - [ ] Backend development server (FastAPI with reload)
  - [ ] Database migration setup (Alembic)

#### Priority: MEDIUM
- [ ] **Documentation Setup**
  - [ ] README.md with project overview
  - [ ] CONTRIBUTING.md with development guidelines
  - [ ] API documentation structure
  - [ ] Code of conduct and license

### Phase 2: Backend Infrastructure (Week 1-2)

#### Priority: HIGH
- [ ] **FastAPI Backend Core**
  - [ ] Project structure with proper module organization
  - [ ] Database models (User, Conversion, ContextStack)
  - [ ] Database connection and session management
  - [ ] Basic authentication middleware
  - [ ] Error handling and logging

- [ ] **Database Schema**
  - [ ] Users table with tier and API key management
  - [ ] Conversions table with SEO metadata
  - [ ] Context stacks table with JSONB blocks
  - [ ] Database indexes for performance
  - [ ] Migration scripts

- [ ] **Core API Endpoints**
  - [ ] `POST /api/convert` - URL conversion
  - [ ] `GET /api/conversions` - User library
  - [ ] `POST /api/conversions/{id}/save` - Save conversion
  - [ ] Authentication endpoints (register, login, refresh)

#### Priority: MEDIUM
- [ ] **Rate Limiting & Usage Tracking**
  - [ ] Redis-based rate limiting
  - [ ] Usage tracking per user tier
  - [ ] Daily reset mechanism
  - [ ] Quota enforcement

- [ ] **SEO Infrastructure**
  - [ ] Slug generation algorithm
  - [ ] SEO page template rendering
  - [ ] Meta tag generation
  - [ ] Related content algorithms

### Phase 3: Frontend Development (Week 2-3)

#### Priority: HIGH
- [ ] **React App Setup**
  - [ ] Vite + React 18 + TypeScript configuration
  - [ ] Tailwind CSS setup and configuration
  - [ ] Router setup for multi-page navigation
  - [ ] State management with Context API

- [ ] **Core Components**
  - [ ] `ContextBuilder` - Main interface component
  - [ ] `ContextBlock` - Individual block component
  - [ ] `ExportPanel` - Export options component
  - [ ] `Header` - Navigation and user menu
  - [ ] `Library` - Saved conversions management

- [ ] **URL Conversion Feature**
  - [ ] Jina Reader API integration
  - [ ] Loading states and error handling
  - [ ] Markdown preview component
  - [ ] Copy to clipboard functionality

#### Priority: MEDIUM
- [ ] **Context Building**
  - [ ] Drag-and-drop reordering (React DnD)
  - [ ] Add/remove block functionality
  - [ ] Block type switching (URL/Text)
  - [ ] Context stack export formats

- [ ] **Export Integrations**
  - [ ] ChatGPT integration (`https://chatgpt.com/?q=`)
  - [ ] Claude integration (`https://claude.ai/new?q=`)
  - [ ] PDF export functionality
  - [ ] Plain text export

### Phase 4: MCP Server Development (Week 3-4)

#### Priority: HIGH
- [ ] **MCP Server Core**
  - [ ] Node.js + TypeScript project setup
  - [ ] Anthropic MCP SDK integration
  - [ ] Basic server structure and tool registration
  - [ ] Error handling and logging

- [ ] **Core MCP Tools**
  - [ ] `convert_url` tool implementation
  - [ ] `search_library` tool implementation
  - [ ] `create_context_stack` tool implementation
  - [ ] API key authentication

#### Priority: MEDIUM
- [ ] **NPM Package**
  - [ ] Package.json configuration
  - [ ] Build and distribution scripts
  - [ ] Installation documentation
  - [ ] CLI interface for configuration

- [ ] **Integration Testing**
  - [ ] Claude Desktop integration testing
  - [ ] Cursor integration testing
  - [ ] Error handling and edge cases
  - [ ] Performance optimization

### Phase 5: Authentication & Payment (Week 4-5)

#### Priority: HIGH
- [ ] **User Management**
  - [ ] JWT authentication implementation
  - [ ] User registration and login flows
  - [ ] Password reset functionality
  - [ ] API key generation and management

- [ ] **Pricing Tiers**
  - [ ] Free tier with 5 conversions/day
  - [ ] Power User tier ($5/month) features
  - [ ] Pro tier ($15/month) features
  - [ ] Usage enforcement and upgrades

#### Priority: MEDIUM
- [ ] **Payment Integration**
  - [ ] Polar.sh payment processing
  - [ ] Subscription management
  - [ ] Webhook handling for payments
  - [ ] Billing dashboard

- [ ] **Analytics Dashboard**
  - [ ] Usage statistics
  - [ ] Conversion success rates
  - [ ] User engagement metrics
  - [ ] Revenue tracking

### Phase 6: SEO & Content (Week 5-6)

#### Priority: HIGH
- [ ] **SEO Page Generation**
  - [ ] Dynamic slug creation from titles/URLs
  - [ ] Server-side rendered HTML pages
  - [ ] Meta tag optimization
  - [ ] Schema.org structured data

- [ ] **Content Enhancement**
  - [ ] Automatic summary generation
  - [ ] Topic extraction and tagging
  - [ ] Related content suggestions
  - [ ] Internal linking algorithms

#### Priority: MEDIUM
- [ ] **Performance Optimization**
  - [ ] Page caching strategies
  - [ ] CDN integration
  - [ ] Image optimization
  - [ ] SEO monitoring and analytics

### Phase 7: Testing & Polish (Week 6)

#### Priority: HIGH
- [ ] **Testing Suite**
  - [ ] Frontend unit and integration tests
  - [ ] Backend API and service tests
  - [ ] MCP server functionality tests
  - [ ] End-to-end testing with Playwright

- [ ] **Performance & Security**
  - [ ] Database query optimization
  - [ ] Security audit and fixes
  - [ ] Rate limiting testing
  - [ ] Error handling improvements

#### Priority: MEDIUM
- [ ] **Documentation & Polish**
  - [ ] Complete API documentation
  - [ ] User onboarding flow
  - [ ] MCP server installation guide
  - [ ] Video tutorials and demos

---

## 🚀 Development Environment Setup

### Prerequisites
- Node.js 18+
- Python 3.9+
- PostgreSQL 14+
- Redis 6+
- Docker & Docker Compose

### Quick Start
```bash
# Clone and setup
git clone https://github.com/username/ctxt.git
cd ctxt

# Start development environment
docker-compose up -d

# Frontend setup
cd frontend
npm install
npm run dev

# Backend setup
cd ../backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload

# MCP server setup
cd ../mcp-server
npm install
npm run dev
```

### Environment Variables
```bash
# .env file template
DATABASE_URL=postgresql://user:pass@localhost:5432/ctxt_help
REDIS_URL=redis://localhost:6379
JWT_SECRET_KEY=your-secret-key
POLAR_ACCESS_TOKEN=polar_oat_your_access_token
POLAR_WEBHOOK_SECRET=wh_secret_your_webhook_secret
POLAR_ORGANIZATION_ID=org_your_organization_id
JINA_FALLBACK_ENABLED=true
MCP_SERVER_ENABLED=true
```

---

## 📊 Success Metrics & KPIs

### Development Metrics
- [ ] **Code Quality**
  - Frontend test coverage >80%
  - Backend test coverage >85%
  - Zero critical security vulnerabilities
  - TypeScript strict mode compliance

- [ ] **Performance**
  - API response time <3s average
  - Frontend bundle size <500KB
  - Database queries optimized
  - 95%+ conversion success rate

### Business Metrics
- [ ] **MVP Launch Criteria**
  - Client-side URL conversion working
  - Context block stacking functional
  - Export to ChatGPT/Claude working
  - SEO page generation active
  - Free tier rate limiting enforced

---

## 🔧 Tools & Technologies

### Frontend Stack
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: React Context + useReducer
- **HTTP Client**: Axios
- **Testing**: Jest + React Testing Library
- **E2E Testing**: Playwright

### Backend Stack
- **Framework**: FastAPI + Python 3.9+
- **Database**: PostgreSQL + SQLAlchemy + Alembic
- **Caching**: Redis
- **Authentication**: JWT + bcrypt
- **Payment**: Polar.sh
- **Testing**: Pytest + pytest-asyncio

### MCP Server Stack
- **Runtime**: Node.js 18+ + TypeScript
- **MCP SDK**: Anthropic MCP SDK
- **HTTP Client**: Axios
- **Testing**: Jest
- **Distribution**: NPM

### DevOps
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Deployment**: Vercel (Frontend) + Railway (Backend)
- **Monitoring**: Sentry + Analytics

---

## 🎯 Current Sprint (Week 1)

### Active Tasks
- [x] Create TODO.md with style guide ✅
- [ ] Setup project structure and dependencies
- [ ] Configure development environment
- [ ] Initialize database schema
- [ ] Create basic FastAPI application

### Next Up
- Frontend React app initialization
- Basic authentication system
- URL conversion proof of concept
- MCP server project setup

---

**Ready to build the future of AI-powered content workflows! 🚀**

---

*This document is a living guide - update regularly as the project evolves.*