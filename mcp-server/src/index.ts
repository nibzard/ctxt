#!/usr/bin/env node

/**
 * ctxt.help MCP Server
 * 
 * Provides AI tool integration for URL conversion and context building.
 * Compatible with Claude Desktop, Cursor, and other MCP-enabled tools.
 */

import { MCPServer } from '@anthropic-ai/mcp-sdk';
import { convertUrlTool } from './tools/convert-url';
import { searchLibraryTool } from './tools/search-library';
import { createContextStackTool } from './tools/create-context-stack';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const server = new MCPServer({
  name: 'ctxt-mcp',
  version: '1.0.0',
  description: 'ctxt.help MCP Server for AI tool integration'
});

// Register tools
server.addTool(convertUrlTool);
server.addTool(searchLibraryTool);
server.addTool(createContextStackTool);

// Error handling
server.on('error', (error) => {
  console.error('MCP Server error:', error);
});

// Start the server
const port = process.env.MCP_SERVER_PORT || 3001;
const host = process.env.MCP_SERVER_HOST || 'localhost';

server.listen(Number(port), host, () => {
  console.log(`ctxt.help MCP Server running on ${host}:${port}`);
  console.log('Available tools:');
  console.log('- convert_url: Convert webpage to clean markdown');
  console.log('- search_library: Search user\'s saved conversions');
  console.log('- create_context_stack: Combine multiple URLs into LLM context');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down MCP server...');
  server.close(() => {
    console.log('MCP server stopped');
    process.exit(0);
  });
});

export default server;