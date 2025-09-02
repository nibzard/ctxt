# MCP Server Documentation

## Overview

The ctxt.help MCP (Model Context Protocol) server provides AI tools for URL conversion and context building. It's designed to integrate with Claude Desktop, Cursor, and other MCP-enabled AI applications.

## Installation & Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
cd mcp-server
npm install
```

### Configuration

Create a `.env` file:
```env
MCP_SERVER_PORT=3001
MCP_SERVER_HOST=localhost
CTXT_API_URL=http://localhost:8000
CTXT_API_KEY=your-api-key
JINA_READER_URL=https://r.jina.ai
```

### Running the Server

Development:
```bash
npm run dev
```

Production:
```bash
npm run build
npm start
```

## Available Tools

### 1. convert_url

Convert a webpage to clean markdown format.

**Parameters:**
- `url` (required): The URL to convert
- `include_images` (optional): Whether to include image URLs in markdown
- `custom_selector` (optional): CSS selector to extract specific content

**Example:**
```json
{
  "url": "https://docs.react.dev/learn/hooks-intro",
  "include_images": true
}
```

**Response:**
```json
{
  "content": "# Introducing Hooks\n\nHooks are a new addition...",
  "title": "Introducing Hooks – React",
  "word_count": 1200,
  "reading_time": 6
}
```

### 2. search_library

Search through saved conversions in the user's library.

**Parameters:**
- `query` (required): Search terms
- `limit` (optional): Maximum results to return (default: 10)

**Example:**
```json
{
  "query": "react hooks",
  "limit": 5
}
```

**Response:**
```json
{
  "results": [
    {
      "title": "React Hooks Guide",
      "url": "https://example.com/react-hooks",
      "slug": "react-hooks-guide",
      "excerpt": "Learn how to use React hooks..."
    }
  ]
}
```

### 3. create_context_stack

Combine multiple URLs into a structured context for LLMs.

**Parameters:**
- `urls` (required): Array of URLs to combine
- `format` (optional): Output format ("xml" or "markdown", default: "xml")
- `custom_context` (optional): Additional context or instructions

**Example:**
```json
{
  "urls": [
    "https://docs.react.dev/learn/hooks-intro",
    "https://docs.react.dev/reference/react/useState"
  ],
  "format": "xml",
  "custom_context": "Focus on useState examples"
}
```

**Response:**
```xml
<context>
  <instruction>Focus on useState examples</instruction>
  <sources>
    <source url="https://docs.react.dev/learn/hooks-intro">
      <title>Introducing Hooks – React</title>
      <content>
        # Introducing Hooks
        
        Hooks are a new addition in React 16.8...
      </content>
    </source>
    <source url="https://docs.react.dev/reference/react/useState">
      <title>useState – React</title>
      <content>
        # useState
        
        useState is a React Hook that lets you add state...
      </content>
    </source>
  </sources>
</context>
```

## Claude Desktop Integration

To integrate with Claude Desktop, add this configuration to your `claude_desktop_config.json`:

### macOS
Location: `~/Library/Application Support/Claude/claude_desktop_config.json`

### Windows
Location: `%APPDATA%\Claude\claude_desktop_config.json`

### Configuration
```json
{
  "mcpServers": {
    "ctxt": {
      "command": "node",
      "args": ["/path/to/ctxt/mcp-server/dist/index.js"],
      "env": {
        "CTXT_API_URL": "http://localhost:8000",
        "CTXT_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Cursor Integration

For Cursor IDE integration, add to your project's `.cursor/config.json`:

```json
{
  "mcp": {
    "servers": {
      "ctxt": {
        "command": "node",
        "args": ["./mcp-server/dist/index.js"],
        "env": {
          "CTXT_API_URL": "http://localhost:8000",
          "CTXT_API_KEY": "your-api-key"
        }
      }
    }
  }
}
```

## API Integration

The MCP server communicates with the ctxt.help API backend. All conversions are processed through the API and can be saved to the user's library for future reference.

### Authentication

The MCP server uses API key authentication to access the backend. Users need to:

1. Create an account on ctxt.help
2. Generate an API key from their dashboard
3. Configure the MCP server with their API key

### Rate Limiting

API usage is subject to the user's subscription tier:
- **Free**: 5 conversions per day
- **Power**: Unlimited conversions
- **Pro**: Unlimited conversions + advanced features

## Error Handling

The MCP server handles various error scenarios:

### Network Errors
- Timeout errors (30s default)
- Connection failures
- DNS resolution issues

### API Errors
- Rate limit exceeded
- Invalid API key
- Malformed URLs

### Content Errors
- Pages requiring authentication
- Content behind paywalls
- Invalid or empty content

Example error response:
```json
{
  "error": "RateLimitExceeded",
  "message": "Daily conversion limit reached. Upgrade to Power tier for unlimited conversions.",
  "retry_after": 86400
}
```

## Development

### Project Structure
```
mcp-server/
├── src/
│   ├── index.ts           # Main server entry point
│   ├── tools/             # MCP tool implementations
│   │   ├── convert-url.ts
│   │   ├── search-library.ts
│   │   └── create-context-stack.ts
│   └── api/               # API client utilities
│       └── client.ts
├── dist/                  # Compiled JavaScript
├── package.json
├── tsconfig.json
└── Dockerfile.dev
```

### Adding New Tools

1. Create a new file in `src/tools/`
2. Implement the MCP tool interface:

```typescript
import { Tool } from '@anthropic-ai/mcp-sdk';

export const newTool: Tool = {
  name: 'tool_name',
  description: 'Tool description',
  parameters: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Parameter description'
      }
    },
    required: ['param1']
  },
  handler: async (params) => {
    // Tool implementation
    return {
      result: 'success'
    };
  }
};
```

3. Register the tool in `src/index.ts`

### Testing

Run tests:
```bash
npm test
```

Run with coverage:
```bash
npm run test:coverage
```

### Deployment

Build for production:
```bash
npm run build
```

The compiled JavaScript will be in the `dist/` directory and can be deployed to any Node.js environment.

## Troubleshooting

### Common Issues

1. **Server won't start**
   - Check Node.js version (18+ required)
   - Verify all dependencies are installed
   - Check port availability

2. **Tools not appearing in Claude/Cursor**
   - Verify configuration file path and syntax
   - Check server is running on correct port
   - Restart Claude/Cursor after configuration changes

3. **Conversion failures**
   - Verify API key is valid
   - Check internet connectivity
   - Ensure target URLs are accessible

### Debug Mode

Enable debug logging:
```bash
DEBUG=mcp:* npm run dev
```

This will show detailed logs of MCP communication and tool execution.