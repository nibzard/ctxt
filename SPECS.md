# CTXT (ctxt.help) - Complete Product Specification

**Version:** 1.0
**Date:** September 2025
**Status:** Ready for Development
**Tagline:** *"Context, simplified" or "Clean context for AI" or "Need clean content? Use ctxt.help"*

---

## 🎯 Executive Summary

**"The LLM Context Builder" - Turn any webpage into perfect LLM input with stackable, reusable blocks**

We're building the first URL-to-markdown converter that combines:
- **Client-side processing** (zero server costs, unlimited usage)
- **Programmatic SEO** (every conversion becomes a permanent, searchable page)
- **MCP Server integration** (works natively in Cursor, Claude Desktop, and all AI tools)
- **Context building** (stack multiple sources into perfect LLM input)

**Market Position:** "The Git of AI content workflows" - essential developer infrastructure that turns any webpage into clean, LLM-ready content.

---

## 🚀 Product Vision

### Core Value Proposition
**"Turn any webpage into perfect LLM input with shareable, permanent links"**

### Target Users
1. **AI Developers** (Primary) - Building RAG systems, need clean content for LLMs
2. **Content Creators** (Secondary) - Researchers, writers, need clean offline reading
3. **Development Teams** (Tertiary) - Need shared context for documentation workflows

### Differentiation Strategy
- **Clean shareable URLs**: `ctxt.help/read/fastapi-tutorial-docs`
- **MCP Server**: First-mover in AI tool infrastructure space
- **Programmatic SEO**: Every conversion builds community value
- **Fair monetization**: Generous free tier, pay-for-convenience model

---

## 🏗️ Technical Architecture

### Hybrid Client-Server Architecture

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

### Core Components

#### 1. Client-Side Application (React)
```typescript
// Core conversion functionality
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
      `<${block.type} source="${block.url}" title="${block.title}">\n${block.content}\n</${block.type}>`
    ).join('\n\n');
  }
}
```

#### 2. Server-Side API (FastAPI)
```python
# Persistence and SEO page generation
@app.post("/save-conversion")
async def save_conversion(conversion_data: ConversionRequest):
    slug = generate_seo_slug(conversion_data.url, conversion_data.title)

    # Save to database for SEO page
    page = await db.create_conversion_page(
        slug=slug,
        url=conversion_data.url,
        content=conversion_data.markdown,
        title=conversion_data.title,
        meta_description=generate_seo_description(conversion_data.markdown)
    )

    return {
        "slug": slug,
        "permanent_url": f"https://ctxt.help/read/{slug}",
        "seo_optimized": True
    }

@app.get("/read/{slug}")
async def read_conversion(slug: str):
    conversion = await db.get_conversion_by_slug(slug)
    # Return SEO-optimized HTML page
    return render_seo_page(conversion)
```

#### 3. MCP Server (Node.js/TypeScript)
```typescript
// AI tool integration
class CtxtMCPServer {
  tools = [
    {
      name: "convert_url",
      description: "Convert webpage to clean markdown",
      handler: this.convertUrl
    },
    {
      name: "list_library",
      description: "List user's saved conversions",
      handler: this.listLibrary
    },
    {
      name: "create_context_stack",
      description: "Combine multiple URLs into LLM context",
      handler: this.createContextStack
    }
  ];
}
```

---

## 🎨 User Experience Design

### Core User Flow

#### 1. Simple Conversion Flow
```
User enters URL → Client-side Jina call → Display markdown → Options:
├─ Copy to clipboard
├─ Copy to ChatGPT
├─ Copy to Claude
├─ Save to library (creates SEO page)
└─ Share permanent link
```

#### 2. Context Building Flow
```
User adds multiple blocks:
├─ URL blocks (webpage conversions)
├─ Text blocks (custom context)
├─ Reorder with drag & drop
└─ Export as combined context with XML wrapping
```

### UI Components

#### Main Interface (React)
```jsx
// Stackable blocks interface
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

#### SEO Page Template
```html
<!-- /read/{slug} pages -->
<!DOCTYPE html>
<html>
<head>
  <title>{{title}} - Clean Markdown | ctxt.help</title>
  <meta name="description" content="{{description}}">
  <meta property="og:title" content="{{title}} - Clean Markdown">
  <script type="application/ld+json">{{schema_markup}}</script>
</head>
<body>
  <article>
    <header>
      <h1>{{title}}</h1>
      <div class="meta">
        Source: <a href="{{source_url}}">{{domain}}</a>
        • {{reading_time}} min read
        • Converted {{date}}
      </div>
    </header>

    <div class="actions">
      <button onclick="copyToClipboard()">Copy Markdown</button>
      <button onclick="copyToChatGPT()">Send to ChatGPT</button>
      <button onclick="copyToClaude()">Send to Claude</button>
    </div>

    <main class="markdown-content">{{rendered_markdown}}</main>

    <footer class="related-content">
      <h3>Related Documentation</h3>
      {{related_links}}
    </footer>
  </article>
</body>
</html>
```

---

## 🔍 SEO Strategy

### Programmatic Page Generation

#### URL Structure
```
ctxt.help/read/fastapi-tutorial-documentation
ctxt.help/read/react-hooks-comprehensive-guide
ctxt.help/read/python-requests-library-docs
ctxt.help/read/typescript-advanced-types-handbook
```

#### Slug Generation Algorithm
```python
def generate_seo_slug(url: str, title: str = None) -> str:
    # Priority: Use page title if available
    if title and len(title) > 10:
        slug = title.lower()
        # Clean for SEO: remove special chars, limit length
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

#### Target Keywords Strategy
- **Primary**: "[technology] documentation markdown"
- **Secondary**: "[framework] tutorial clean format"
- **Long-tail**: "[specific-guide] readable version"

#### Content Enhancement
```python
def enhance_seo_content(original_markdown: str, source_url: str) -> dict:
    return {
        "auto_summary": generate_ai_summary(original_markdown),
        "key_topics": extract_topics_with_nlp(original_markdown),
        "reading_time": calculate_reading_time(original_markdown),
        "related_conversions": find_similar_by_topic(source_url),
        "structured_data": generate_schema_markup(original_markdown, source_url)
    }
```

### Hub Pages Strategy
- **Topic pages**: `/topics/react` - all React conversions
- **Collection pages**: `/collections/web-development` - curated docs
- **Trending pages**: `/trending` - popular recent conversions
- **Sitemap generation**: Auto-updated XML sitemaps

---

## 🔧 MCP Server Implementation

### NPM Package Structure
```
ctxt-mcp/
├── package.json
├── src/
│   ├── index.ts (main MCP server)
│   ├── tools/
│   │   ├── convert-url.ts
│   │   ├── list-library.ts
│   │   └── create-context.ts
│   └── api/
│       └── client.ts (ctxt.help API client)
├── dist/ (compiled JS)
└── README.md (installation guide)
```

### Core MCP Tools
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
            remove_navigation: { type: "boolean", default: true },
            custom_selector: { type: "string" }
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
        custom_context: {
          type: "string",
          description: "Additional context to include"
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

### Installation Experience
```bash
# Install globally
npm install -g ctxt-mcp

# Configure in Claude Desktop
# ~/.claude/mcp_servers.json
{
  "ctxt": {
    "command": "ctxt-mcp",
    "env": {
      "CTXT_API_KEY": "your-api-key-here"
    }
  }
}

# Configure in Cursor
# Similar MCP configuration
```

---

## 💰 Monetization Strategy

### Tier Structure

#### 🆓 Free Tier - "Essential Access"
**Forever Free Features:**
- **5 conversions per day** (150/month)
- Full client-side conversion capability
- Copy to clipboard, ChatGPT, Claude
- Access to all public SEO pages
- Basic share links

**Value:** Solves core problem completely for casual users

#### ⭐ Power User - "Unlimited Workflow" ($5/month)
**Added Features:**
- **Unlimited conversions**
- **Conversation library** - save and organize all conversions
- **Advanced export** - PDF, DOCX, plain text formats
- **Context templates** - save reusable context patterns
- **Browser extension** - right-click convert
- **Priority conversion** - faster processing

**Target:** Regular users who want convenience and unlimited usage

#### 🚀 Pro - "AI Integration" ($15/month)
**Added Features:**
- **MCP Server access** - integrate with Cursor, Claude Desktop
- **API access** - build custom integrations
- **Advanced context tools** - bulk processing, custom XML tags
- **Team sharing** - share libraries with team members
- **Analytics dashboard** - usage insights and patterns
- **Priority support** - faster response times

**Target:** Professional developers, teams, power users

#### 🏢 Enterprise - "Custom Infrastructure" (Custom Pricing)
**Added Features:**
- **Self-hosted MCP server** - deploy on your infrastructure
- **Custom rate limits** - handle high-volume processing
- **SSO integration** - enterprise authentication
- **Custom features** - built for specific use cases
- **SLA guarantees** - uptime and performance commitments
- **Dedicated support** - account management and training

**Target:** Large teams, companies with specific compliance needs

### Revenue Projections

#### Conservative Growth Model
```
Month 6:   1,000 free users → 30 Power ($150) + 5 Pro ($75) = $225/month
Month 12: 10,000 free users → 300 Power ($1,500) + 50 Pro ($750) = $2,250/month
Month 18: 50,000 free users → 1,000 Power ($5,000) + 150 Pro ($2,250) = $7,250/month
Month 24: 100,000 free users → 2,000 Power ($10,000) + 300 Pro ($4,500) = $14,500/month
```

#### Key Assumptions
- **Free to Power conversion**: 3% (industry standard)
- **Power to Pro conversion**: 15% (natural progression)
- **Enterprise deals**: 2-3 per year starting Month 18

---

## 🚀 Go-to-Market Strategy

### Phase 1: Foundation (Months 1-3)
**Goal:** Build and validate core product

#### Development Priorities
1. **Client-side React app** - core conversion functionality
2. **Basic server infrastructure** - user accounts, persistence
3. **SEO page generation** - programmatic content creation
4. **Free tier launch** - no monetization, focus on usage

#### Marketing Focus
- **Developer community engagement** - Reddit, Discord, Twitter
- **Content creation** - "Clean LLM context" positioning
- **SEO foundation** - optimize for "URL to markdown" keywords
- **Product Hunt launch** - build initial awareness

#### Success Metrics
- **1,000 monthly active users**
- **10,000 SEO pages generated**
- **50+ upvotes on Product Hunt**
- **Basic word-of-mouth traction**

### Phase 2: MCP Differentiation (Months 4-6)
**Goal:** Establish unique market position

#### Development Priorities
1. **MCP server development** - core tools implementation
2. **NPM package distribution** - easy installation
3. **Documentation and tutorials** - reduce friction
4. **Power User tier launch** - first monetization

#### Marketing Focus
- **MCP showcase submission** - get featured by Anthropic
- **Developer conference presence** - demo the integration
- **Technical content marketing** - "Future of AI workflows"
- **Cursor/Claude Desktop partnerships** - official integrations

#### Success Metrics
- **10,000 monthly active users**
- **500 MCP server installs**
- **100 paying Power Users**
- **Featured in MCP ecosystem**

### Phase 3: Scale & Revenue (Months 7-12)
**Goal:** Build sustainable business

#### Development Priorities
1. **Pro tier features** - advanced MCP tools, API access
2. **Team collaboration** - shared libraries, permissions
3. **Analytics dashboard** - user insights and optimization
4. **Enterprise features** - SSO, self-hosting options

#### Marketing Focus
- **Content marketing scale** - regular technical blog posts
- **Developer advocate program** - community champions
- **Partnership expansion** - integrate with more AI tools
- **Enterprise sales motion** - direct outreach to teams

#### Success Metrics
- **50,000 monthly active users**
- **2,000 MCP server installs**
- **500 paying users** ($2,000+ MRR)
- **5 enterprise pilot customers**

### Phase 4: Market Leadership (Year 2+)
**Goal:** Become essential developer infrastructure

#### Development Priorities
1. **Advanced AI features** - content summarization, topic extraction
2. **Marketplace** - user-generated templates and tools
3. **International expansion** - multi-language support
4. **Platform integrations** - VS Code, JetBrains, etc.

#### Marketing Focus
- **Thought leadership** - "AI workflow infrastructure" category
- **Community building** - conferences, meetups, online events
- **Strategic partnerships** - deeper integrations with AI companies
- **International expansion** - localized content and marketing

#### Success Metrics
- **200,000+ monthly active users**
- **10,000+ MCP server installs**
- **$50,000+ MRR**
- **Market recognition** as essential developer tool

---

## 🗓️ Implementation Timeline

### Month 1: Core Development
**Week 1-2: Foundation**
- Set up React app with Tailwind CSS
- Implement client-side Jina Reader integration
- Basic context block UI (add, remove, reorder)
- Copy to clipboard functionality

**Week 3-4: Enhancement**
- Export to ChatGPT/Claude integration
- Basic server setup (FastAPI)
- User registration and authentication
- Database schema for conversions

### Month 2: SEO & Persistence
**Week 1-2: SEO Infrastructure**
- Slug generation algorithm
- SEO page template creation
- Meta tag and schema markup generation
- Sitemap generation

**Week 3-4: User Features**
- Conversion library and search
- Share link generation
- Related content algorithms
- Performance optimization

### Month 3: MCP Development
**Week 1-2: MCP Server Core**
- Basic MCP server structure
- convert_url tool implementation
- NPM package setup and testing
- Installation documentation

**Week 3-4: Advanced MCP Features**
- list_library and search_library tools
- create_context_stack implementation
- Error handling and edge cases
- Integration testing with Claude Desktop/Cursor

### Month 4: Launch & Iteration
**Week 1-2: Public Launch**
- Product Hunt submission
- Developer community outreach
- Documentation polish
- Bug fixes and stability

**Week 3-4: Monetization Prep**
- Payment system integration (Polar.sh)
- Usage tracking and analytics
- Power User tier implementation
- Conversion optimization

---

## 🎯 Success Metrics & KPIs

### Product Metrics
- **Daily Active Users** - engagement and stickiness
- **Conversion Success Rate** - technical reliability (target: >95%)
- **Average Session Duration** - user engagement depth
- **Context Stack Size** - complexity of use cases

### Business Metrics
- **Monthly Recurring Revenue** - sustainable growth
- **Customer Acquisition Cost** - marketing efficiency
- **Free to Paid Conversion Rate** - product-market fit (target: 3-5%)
- **Net Promoter Score** - user satisfaction (target: 70+)

### Technical Metrics
- **API Response Time** - performance (target: <3s average)
- **Uptime** - reliability (target: 99.9%)
- **SEO Page Index Rate** - search visibility
- **MCP Server Adoption** - infrastructure integration

### Community Metrics
- **SEO Pages Generated** - community value creation
- **Organic Traffic Growth** - SEO strategy success
- **Developer Community Engagement** - social mentions, discussions
- **Documentation Accessibility** - impact on developer productivity

---

## 🔒 Risk Analysis & Mitigation

### Technical Risks

#### Risk: Jina Reader API Changes/Limits
**Impact:** High - Core functionality dependent
**Mitigation:**
- Build fallback conversion methods (Turndown.js)
- Monitor Jina Reader status and announcements
- Develop direct browser automation as backup

#### Risk: MCP Specification Changes
**Impact:** Medium - Affects differentiation strategy
**Mitigation:**
- Stay close to MCP working group discussions
- Build modular architecture for easy updates
- Maintain compatibility layers

### Business Risks

#### Risk: Low Free-to-Paid Conversion
**Impact:** High - Revenue model dependent
**Mitigation:**
- A/B test pricing and feature boundaries
- Implement usage analytics to optimize conversion points
- Focus on value demonstration rather than artificial limits

#### Risk: Competition from Established Players
**Impact:** Medium - Market share threat
**Mitigation:**
- Focus on unique differentiators (clean URLs, MCP integration)
- Build strong developer community relationships
- Patent/trademark key innovations where possible

### Market Risks

#### Risk: AI Tools Add Native URL Processing
**Impact:** High - Could commoditize core feature
**Mitigation:**
- Position as specialized infrastructure rather than basic feature
- Build moat through SEO content and user libraries
- Focus on workflow optimization beyond simple conversion

#### Risk: Developer Fatigue with New Tools
**Impact:** Medium - Adoption challenge
**Mitigation:**
- Emphasize seamless integration rather than new workflow
- Provide clear ROI demonstration
- Build on existing habits rather than replacing them

---

## 📋 Acceptance Criteria

### MVP Launch Criteria
- ✅ Client-side URL conversion using Jina Reader
- ✅ Context block stacking with drag & drop
- ✅ Export to ChatGPT/Claude with one click
- ✅ Basic SEO page generation for saved conversions
- ✅ Free tier with 5 conversions/day limit
- ✅ Mobile-responsive interface
- ✅ 95%+ conversion success rate

### MCP Integration Criteria
- ✅ Working MCP server with core tools
- ✅ NPM package published and installable
- ✅ Integration tested with Claude Desktop and Cursor
- ✅ Clear installation documentation
- ✅ Error handling and graceful failures
- ✅ API key authentication system

### Business Launch Criteria
- ✅ Payment processing (Polar.sh integration)
- ✅ User account system with usage tracking
- ✅ Power User tier features implemented
- ✅ Basic analytics dashboard
- ✅ Customer support system
- ✅ Terms of service and privacy policy

---

## 📚 Technical Specifications

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

### API Endpoints
```python
# Core conversion endpoints
POST /api/convert
    - Convert URL to markdown (client-side or server-side)
    - Rate limited by tier

GET /api/conversions
    - List user's saved conversions
    - Supports filtering and search

POST /api/conversions/{id}/save
    - Save conversion to library
    - Generates SEO page

# MCP integration endpoints
POST /api/mcp/convert
    - MCP server conversion endpoint
    - Requires API key authentication

GET /api/mcp/library
    - List library for MCP server
    - Supports search and filtering

POST /api/mcp/context-stack
    - Create context stack via MCP
    - Returns formatted context

# SEO page endpoints
GET /read/{slug}
    - Public SEO-optimized page
    - No authentication required

GET /topics/{topic}
    - Topic hub pages
    - Lists related conversions
```

### Environment Configuration
```bash
# Required Environment Variables
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
POLAR_ACCESS_TOKEN=polar_oat_...
POLAR_WEBHOOK_SECRET=wh_secret_...
POLAR_ORGANIZATION_ID=org_...
JINA_FALLBACK_ENABLED=true
MCP_SERVER_ENABLED=true

# Optional Configuration
RATE_LIMIT_FREE_DAILY=5
RATE_LIMIT_POWER_DAILY=unlimited
RATE_LIMIT_PRO_DAILY=unlimited
SEO_PAGES_ENABLED=true
ANALYTICS_ENABLED=true
```

---

## 🎉 Conclusion

ctxt.help represents a unique opportunity to become essential developer infrastructure in the rapidly growing AI tools ecosystem. By combining client-side processing, programmatic SEO, and MCP integration, we're building something that's both immediately useful and strategically positioned for long-term success.

**The key insight:** This isn't just about converting URLs to markdown - it's about becoming the standard bridge between web content and AI tools.

**Success will be measured not just in revenue, but in developer productivity improved and content made accessible to the AI-powered future of work.**

---

**Ready to build the future of AI-powered content workflows? Let's ship it! 🚀**