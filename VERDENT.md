# VERDENT.md - ctxt.help

**The Developer's Context Companion - Turn any webpage into perfect LLM input**

---

## 🎯 Project Overview

### Product Summary
**ctxt.help** is the first URL-to-markdown converter that combines client-side processing, programmatic SEO, and native AI tool integration. We're building essential developer infrastructure that turns any webpage into clean, LLM-ready content with shareable, permanent links.

### Core Value Proposition
*"Turn any webpage into perfect LLM input with shareable, permanent links"*

### Key Differentiators
- **Native AI Integration**: First-class MCP server support for Cursor, Claude Desktop, and all AI tools
- **Client-Side Processing**: Zero server costs, unlimited usage, works offline
- **Programmatic SEO**: Every conversion becomes a searchable, permanent page
- **Context Building**: Stack multiple sources into perfect LLM input with XML formatting

### Target Market
1. **AI Developers** (Primary) - Building RAG systems, need clean content for LLMs
2. **Content Creators** (Secondary) - Researchers, writers, need clean offline reading
3. **Development Teams** (Tertiary) - Shared context for documentation workflows

---

## 🏗️ Technical Architecture

 ### Core Development Principles

1. **Modularity**: Every component must be self-contained with clear interfaces. Services should be interchangeable, views should be comp posable, and business logic should be isolated from presentation concerns.

2. **Domain-Driven Design**: Code organization follows health document organization concepts. Use health terminology in naming, structure p services around document organization workflows (document processing, text recognition, health timeline), and maintain strict boundaries p between document organization and medical analysis concerns.

3. **Excessive Documentation**: All code must be thoroughly documented. Include comprehensive inline documentation for complex document p processing logic, maintain detailed architectural decision records, and provide extensive code examples for health document organization cponcepts.

### System Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client-Side   │    │   Server-Side   │    │   MCP Server    │
│ • Jina Reader   │───▶│ • Persistence   │───▶│ • AI Tool       │
│ • UI/UX  ctxt.help   │ • SEO Pages     │    │   Integration   │
│ • Context Stack │    │ • User Library  │    │ • Library API   │
│ • Free Usage    │    │ • Premium API   │    │ • Context Tools │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

#### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React Context + useState/useReducer
- **Build Tool**: Vite for fast development and builds
- **Key Libraries**:
  - React DnD for drag-and-drop context blocks
  - React Router for client-side routing
  - Axios for API calls

#### Backend (FastAPI + Python)
- **Framework**: FastAPI with Python 3.9+
- **Database**: PostgreSQL with asyncpg
- **Caching**: Redis for session and page caching
- **Authentication**: JWT tokens with refresh mechanism
- **Payment Processing**: Polar.sh integration
- **Background Tasks**: Celery with Redis broker

#### MCP Server (Node.js + TypeScript)
- **Runtime**: Node.js 18+ with TypeScript
- **MCP Framework**: Official Anthropic MCP SDK
- **API Client**: Axios for ctxt.help API integration
- **Distribution**: NPM package for easy installation

### Database Schema

```sql
-- Core conversion storage
CREATE TABLE conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    source_url TEXT NOT NULL,
    title VARCHAR(300),
    content TEXT NOT NULL,
    meta_description VARCHAR(200),
    word_count INTEGER,
    reading_time INTEGER,
    topics TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    view_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT true
);

-- User management
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    tier VARCHAR(20) DEFAULT 'free',
    api_key VARCHAR(64) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    subscription_ends_at TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    last_reset_at TIMESTAMP DEFAULT NOW()
);

-- Context stacks for reusable templates
CREATE TABLE context_stacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    blocks JSONB NOT NULL,
    is_template BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🚀 Development Setup

### Prerequisites
- **Node.js**: 18+ for frontend and MCP server
- **Python**: 3.9+ with pip and virtualenv
- **PostgreSQL**: 14+ for data storage
- **Redis**: 6+ for caching and background tasks
- **Git**: For version control

### Environment Variables

Create `.env` file in the project root:

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/ctxt_help
REDIS_URL=redis://localhost:6379

# API Keys
POLAR_ACCESS_TOKEN=polar_oat_your_access_token
POLAR_WEBHOOK_SECRET=wh_secret_your_webhook_secret
POLAR_ORGANIZATION_ID=org_your_organization_id
JWT_SECRET_KEY=your-jwt-secret-here

# Feature Flags
JINA_FALLBACK_ENABLED=true
MCP_SERVER_ENABLED=true
SEO_PAGES_ENABLED=true
ANALYTICS_ENABLED=true

# Rate Limits
RATE_LIMIT_FREE_DAILY=5
RATE_LIMIT_POWER_DAILY=unlimited
RATE_LIMIT_PRO_DAILY=unlimited

# Development
DEBUG=true
LOG_LEVEL=info
```

### Installation Steps

#### 1. Clone Repository
```bash
git clone https://github.com/your-username/ctxt-help.git
cd ctxt-help
```

#### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Setup database
alembic upgrade head

# Create superuser (optional)
python scripts/create_superuser.py
```

#### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

#### 4. MCP Server Setup
```bash
cd mcp-server
npm install
npm run build
npm link  # For local development
```

### Development Commands

#### Backend Commands
```bash
# Start development server
uvicorn main:app --reload --port 8000

# Run tests
pytest tests/ -v

# Database migrations
alembic revision --autogenerate -m "Description"
alembic upgrade head

# Type checking
mypy .

# Code formatting
black .
isort .
```

#### Frontend Commands
```bash
# Development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Testing
npm run test
npm run test:coverage
```

#### MCP Server Commands
```bash
# Build TypeScript
npm run build

# Development with watch
npm run dev

# Testing
npm run test

# Package for distribution
npm pack
```

---

## 🔧 Core Features

### 1. URL Conversion Engine

#### Client-Side Processing
```typescript
class ContextBuilder {
  async convertUrl(url: string): Promise<ConvertedContent> {
    // Direct call to Jina Reader API
    const jinaUrl = `https://r.jina.ai/${url}`;
    const response = await fetch(jinaUrl);
    const markdown = await response.text();

    return {
      url,
      markdown,
      title: this.extractTitle(markdown),
      wordCount: this.countWords(markdown),
      readingTime: this.calculateReadingTime(markdown)
    };
  }

  generateContextStack(blocks: ContextBlock[]): string {
    return blocks.map(block =>
      `<${block.type} source="${block.url}" title="${block.title}">
${block.content}
</${block.type}>`
    ).join('\n\n');
  }
}
```

#### Supported Export Formats
- **Markdown**: Clean, formatted markdown
- **ChatGPT**: Direct integration with `https://chatgpt.com/?q=`
- **Claude**: Direct integration with `https://claude.ai/new?q=`
- **PDF**: Formatted document export
- **DOCX**: Microsoft Word compatible
- **Plain Text**: Simple text format

### 2. Context Building System

#### Stackable Blocks Interface
```jsx
const ContextBuilder = () => {
  const [blocks, setBlocks] = useState([
    { id: 1, type: 'url', content: '', status: 'empty' }
  ]);

  return (
    <div className="context-builder">
      <Header />

      {blocks.map(block => (
        <ContextBlock
          key={block.id}
          block={block}
          onUpdate={updateBlock}
          onDelete={deleteBlock}
          onMove={moveBlock}
        />
      ))}

      <AddBlockButtons />
      <ExportPanel />
    </div>
  );
};
```

#### Block Types
- **URL Blocks**: Webpage conversions
- **Text Blocks**: Custom context
- **Template Blocks**: Reusable patterns
- **File Blocks**: Document uploads (Pro+)

### 3. SEO Page Generation

#### Automatic Slug Creation
```python
def generate_seo_slug(url: str, title: str = None) -> str:
    # Priority: Use page title if available
    if title and len(title) > 10:
        slug = title.lower()
        slug = re.sub(r'[^a-z0-9\-\s]', '', slug)
        slug = re.sub(r'\s+', '-', slug)
        slug = re.sub(r'-+', '-', slug)
        slug = slug[:50].strip('-')
    else:
        # Extract from URL path
        parsed = urlparse(url)
        slug = parsed.path.strip('/').replace('/', '-')
        slug = re.sub(r'[^a-z0-9\-]', '', slug)

    # Ensure uniqueness
    if await slug_exists(slug):
        slug += f"-{hashlib.md5(url.encode()).hexdigest()[:6]}"

    return slug
```

#### SEO Page Template
- **URL Structure**: `ctxt.help/read/{seo-optimized-slug}`
- **Meta Tags**: Title, description, Open Graph, Twitter Cards
- **Structured Data**: Schema.org markup for rich snippets
- **Internal Linking**: Automated topic-based connections
- **Performance**: Cached HTML, optimized images

### 4. MCP Server Integration

#### Core MCP Tools
```typescript
export const CTXT_TOOLS = [
  {
    name: "convert_url",
    description: "Convert any webpage to clean markdown format",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to convert" },
        options: {
          type: "object",
          properties: {
            include_images: { type: "boolean", default: true },
            remove_navigation: { type: "boolean", default: true }
          }
        }
      },
      required: ["url"]
    }
  },
  {
    name: "search_library",
    description: "Search through your saved conversions",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        limit: { type: "number", default: 10 }
      },
      required: ["query"]
    }
  },
  {
    name: "create_context_stack",
    description: "Combine multiple URLs into single context for AI analysis",
    inputSchema: {
      type: "object",
      properties: {
        urls: {
          type: "array",
          items: { type: "string" },
          description: "URLs to combine into context"
        },
        format: {
          type: "string",
          enum: ["xml", "markdown", "json"],
          default: "xml"
        }
      },
      required: ["urls"]
    }
  }
];
```

#### Installation for AI Tools
```bash
# Install globally
npm install -g ctxt-mcp

# Configure in Claude Desktop (~/.claude/mcp_servers.json)
{
  "ctxt": {
    "command": "ctxt-mcp",
    "env": {
      "CTXT_API_KEY": "your-api-key-here"
    }
  }
}
```

---

## 💰 Business Model & Monetization

### Pricing Tiers

#### 🆓 Free Tier - "Essential Access"
- **5 conversions per day** (150/month)
- Full client-side conversion capability
- Copy to clipboard, ChatGPT, Claude
- Access to all public SEO pages
- Basic share links

#### ⭐ Power User - "Unlimited Workflow" ($5/month)
- **Unlimited conversions**
- **Conversation library** - save and organize
- **Advanced export** - PDF, DOCX, plain text
- **Context templates** - reusable patterns
- **Browser extension** - right-click convert
- **Priority conversion** - faster processing

#### 🚀 Pro - "AI Integration" ($15/month)
- **MCP Server access** - Cursor, Claude Desktop integration
- **API access** - custom integrations
- **Advanced context tools** - bulk processing, custom XML
- **Team sharing** - shared libraries
- **Analytics dashboard** - usage insights
- **Priority support**

#### 🏢 Enterprise - "Custom Infrastructure" (Custom Pricing)
- **Self-hosted MCP server**
- **Custom rate limits**
- **SSO integration**
- **Custom features**
- **SLA guarantees**
- **Dedicated support**

### Revenue Projections

#### Conservative Growth Model
```
Month 6:   1,000 free users → 30 Power ($150) + 5 Pro ($75) = $225/month
Month 12: 10,000 free users → 300 Power ($1,500) + 50 Pro ($750) = $2,250/month
Month 18: 50,000 free users → 1,000 Power ($5,000) + 150 Pro ($2,250) = $7,250/month
Month 24: 100,000 free users → 2,000 Power ($10,000) + 300 Pro ($4,500) = $14,500/month
```

### Lifetime Deal Strategy
- **Platform**: AppSumo primary launch
- **Price**: $59 one-time (normally $180/year)
- **Target**: 1,000 lifetime customers = $59,000 funding
- **Timeline**: Month 2 after MVP validation

---

## 🚀 Go-to-Market Strategy

### Phase 1: Foundation (Months 1-3)
**Goal**: Build and validate core product

#### Development Priorities
1. Client-side React app with core conversion
2. Basic server infrastructure for persistence
3. SEO page generation system
4. Free tier launch

#### Marketing Focus
- Developer community engagement (Reddit, Discord, Twitter)
- Content creation around "Clean LLM context"
- SEO foundation for "URL to markdown" keywords
- Product Hunt launch

#### Success Metrics
- 1,000 monthly active users
- 10,000 SEO pages generated
- Basic word-of-mouth traction

### Phase 2: MCP Differentiation (Months 4-6)
**Goal**: Establish unique market position

#### Development Priorities
1. MCP server development and NPM distribution
2. Documentation and installation tutorials
3. Power User tier launch
4. Browser extension

#### Marketing Focus
- MCP showcase submission to Anthropic
- Developer conference presence
- Technical content marketing
- Cursor/Claude Desktop partnerships

#### Success Metrics
- 10,000 monthly active users
- 500 MCP server installs
- 100 paying Power Users
- Featured in MCP ecosystem

### Phase 3: Scale & Revenue (Months 7-12)
**Goal**: Build sustainable business

#### Development Priorities
1. Pro tier with advanced MCP tools
2. Team collaboration features
3. Analytics dashboard
4. Enterprise features (SSO, self-hosting)

#### Marketing Focus
- Content marketing at scale
- Developer advocate program
- Partnership expansion
- Enterprise sales motion

#### Success Metrics
- 50,000 monthly active users
- 2,000 MCP server installs
- 500 paying users ($2,000+ MRR)
- 5 enterprise pilot customers

---

## 🔍 SEO Implementation

### Programmatic Content Strategy

#### URL Structure
```
https://ctxt.help/read/fastapi-tutorial-documentation
https://ctxt.help/read/react-hooks-comprehensive-guide
https://ctxt.help/read/python-requests-library-usage
https://ctxt.help/read/typescript-advanced-types-handbook
```

#### Target Keywords
- **Primary**: "[technology] documentation markdown"
- **Secondary**: "[framework] tutorial clean format"
- **Long-tail**: "[specific-guide] readable version"

#### Content Enhancement
```python
async def enhance_conversion(conversion: Conversion) -> EnhancedConversion:
    # Generate AI summary
    summary = await generate_summary(conversion.content)

    # Extract key topics
    topics = await extract_topics(conversion.content, conversion.title)

    # Generate FAQ
    faq = await generate_faq(conversion.content)

    # Detect technology stack
    tech_stack = await detect_technology(conversion.content, conversion.url)

    return EnhancedConversion(
        **conversion.dict(),
        ai_summary=summary,
        topics=topics,
        auto_faq=faq,
        detected_language=tech_stack.get('language'),
        detected_framework=tech_stack.get('framework')
    )
```

### Internal Linking Engine
- **Topic-based linking**: Connect related conversions
- **Same-domain linking**: Group content from same sources
- **Technology linking**: Connect by programming language/framework
- **Popular content**: Promote high-traffic conversions

---

## 🤝 Contributing

### Development Workflow

#### 1. Fork and Clone
```bash
git clone https://github.com/your-username/ctxt-help.git
cd ctxt-help
git remote add upstream https://github.com/original/ctxt-help.git
```

#### 2. Create Feature Branch
```bash
git checkout -b feature/your-feature-name
```

#### 3. Development Guidelines
- **Code Style**: Use Prettier for formatting, ESLint for linting
- **Commits**: Follow conventional commit format
- **Testing**: Add tests for new features
- **Documentation**: Update relevant docs

#### 4. Pull Request Process
- Ensure all tests pass
- Update documentation
- Add screenshots for UI changes
- Request review from maintainers

### Code Standards

#### TypeScript (Frontend & MCP)
```typescript
// Use strict typing
interface ConversionRequest {
  url: string;
  options?: {
    includeImages?: boolean;
    customSelector?: string;
  };
}

// Prefer explicit return types
async function convertUrl(request: ConversionRequest): Promise<ConvertedContent> {
  // Implementation
}
```

#### Python (Backend)
```python
# Use type hints
from typing import List, Optional, Dict, Any

async def create_conversion(
    url: str,
    title: Optional[str] = None,
    user_id: Optional[UUID] = None
) -> Conversion:
    # Implementation
```

### Testing Requirements

#### Frontend Tests
```bash
# Unit tests with Jest and React Testing Library
npm run test

# E2E tests with Playwright
npm run test:e2e

# Coverage requirements: >80%
npm run test:coverage
```

#### Backend Tests
```bash
# Unit and integration tests with pytest
pytest tests/ -v

# Coverage requirements: >85%
pytest --cov=app --cov-report=html
```

---

## 🚀 Deployment

### Production Environment

#### Infrastructure Requirements
- **Application Server**: 2+ CPU cores, 4GB+ RAM
- **Database**: PostgreSQL 14+ with 100GB+ storage
- **Cache**: Redis with 2GB+ memory
- **CDN**: Cloudflare for static assets and caching
- **Monitoring**: DataDog or similar APM

#### Docker Configuration
```dockerfile
# Backend Dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Environment Setup
```bash
# Production environment variables
DATABASE_URL=postgresql://prod_user:password@db.host:5432/ctxt_help_prod
REDIS_URL=redis://redis.host:6379
POLAR_ACCESS_TOKEN=polar_oat_live_token
ENVIRONMENT=production
DEBUG=false
```

### CI/CD Pipeline

#### GitHub Actions Workflow
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Tests
        run: |
          npm test
          pytest tests/

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Production
        run: |
          docker build -t ctxt-help .
          docker push registry.com/ctxt-help:latest
```

### Monitoring & Performance

#### Key Metrics
- **Application**: Response time, error rate, throughput
- **Database**: Query performance, connection pool usage
- **Redis**: Memory usage, hit/miss rates
- **Business**: Conversion rates, user engagement, revenue

#### Performance Optimization
- **Frontend**: Code splitting, lazy loading, CDN
- **Backend**: Database indexing, Redis caching, async processing
- **SEO Pages**: Static generation, edge caching

---

## 🗺️ Roadmap

### Immediate (Next 3 Months)
- ✅ MVP launch with core conversion features
- ✅ Basic SEO page generation
- ✅ Free tier with rate limiting
- 🔄 MCP server development
- 🔄 Power User tier implementation
- 📋 Browser extension

### Short-term (3-6 Months)
- 📋 Pro tier with advanced features
- 📋 Team collaboration tools
- 📋 Advanced analytics dashboard
- 📋 Mobile app (React Native)
- 📋 API documentation portal

### Medium-term (6-12 Months)
- 📋 Enterprise features (SSO, self-hosting)
- 📋 Advanced AI features (summarization, Q&A)
- 📋 Marketplace for user templates
- 📋 White-label solutions
- 📋 International expansion

### Long-term (1+ Years)
- 📋 Platform integrations (VS Code, JetBrains)
- 📋 AI-powered content optimization
- 📋 Community-driven template library
- 📋 Advanced workflow automation
- 📋 Strategic partnerships with AI companies

---

## 📊 Success Metrics & KPIs

### Product Metrics
- **Daily Active Users**: Engagement and stickiness
- **Conversion Success Rate**: Technical reliability (target: >95%)
- **Average Session Duration**: User engagement depth
- **Context Stack Complexity**: Advanced use case adoption

### Business Metrics
- **Monthly Recurring Revenue**: Sustainable growth
- **Customer Acquisition Cost**: Marketing efficiency
- **Free to Paid Conversion**: Product-market fit (target: 3-5%)
- **Net Promoter Score**: User satisfaction (target: 70+)

### Technical Metrics
- **API Response Time**: Performance (target: <3s average)
- **Uptime**: Reliability (target: 99.9%)
- **SEO Page Index Rate**: Search visibility
- **MCP Server Adoption**: Infrastructure integration

---

## 🔒 Security & Privacy

### Data Protection
- **User Data**: Encrypted at rest and in transit
- **API Keys**: Secure storage with rotation capability
- **Payment Data**: PCI DSS compliance via Polar.sh
- **Content**: User control over public/private conversions

### Security Measures
- **Authentication**: JWT with refresh tokens
- **Rate Limiting**: Per-user and IP-based limits
- **Input Validation**: Comprehensive sanitization
- **CORS**: Properly configured cross-origin policies

---

## 📚 Additional Resources

### Documentation
- **API Reference**: `/docs` - Interactive Swagger documentation
- **MCP Integration Guide**: `/docs/mcp` - Setup and usage guide
- **SEO Strategy**: `/docs/seo` - How programmatic content works
- **Contributing Guide**: `/CONTRIBUTING.md` - Development guidelines

### Community
- **GitHub Issues**: Bug reports and feature requests
- **Discord Server**: Developer community and support
- **Blog**: Technical posts and product updates
- **Twitter**: [@ctxthelp](https://twitter.com/ctxthelp) - News and updates

### Support
- **Email**: support@ctxt.help
- **Documentation**: help.ctxt.help
- **Status Page**: status.ctxt.help

---

**Ready to build the future of AI-powered content workflows? Let's ship it! 🚀**