#!/bin/bash
cd mcp-server
export API_BASE_URL=http://localhost:8000
export PORT=3001
export NODE_ENV=development
npm run dev 2>/dev/null || echo "MCP server not ready yet - run 'npm install' in mcp-server directory"
