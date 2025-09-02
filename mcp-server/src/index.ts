#!/usr/bin/env node

/**
 * ctxt.help MCP Server
 * 
 * Provides AI tool integration for URL conversion and context building.
 * Compatible with Claude Desktop, Cursor, and other MCP-enabled tools.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { convertUrlTool } from './tools/convert-url';
import { searchLibraryTool } from './tools/search-library';
import { createContextStackTool } from './tools/create-context-stack';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const server = new Server(
  {
    name: 'ctxt-mcp',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Register list tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'convert_url',
        description: 'Convert any webpage into clean markdown or XML format for use in AI conversations',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL to convert to markdown',
              format: 'uri'
            },
            format: {
              type: 'string',
              enum: ['markdown', 'xml'],
              default: 'markdown',
              description: 'Output format - markdown for general use, xml for structured contexts'
            },
            include_images: {
              type: 'boolean',
              default: true,
              description: 'Whether to include image descriptions in the output'
            },
            custom_context: {
              type: 'string',
              description: 'Optional context or instructions for the conversion'
            }
          },
          required: ['url']
        }
      },
      {
        name: 'search_library',
        description: 'Search through user\'s saved conversions and context stacks in their ctxt.help library',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query - will search titles and content of saved conversions'
            },
            limit: {
              type: 'number',
              default: 10,
              minimum: 1,
              maximum: 50,
              description: 'Maximum number of results to return'
            },
            api_key: {
              type: 'string',
              description: 'User\'s ctxt.help API key for authentication'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'create_context_stack',
        description: 'Combine multiple URLs into a single, structured context perfect for AI conversations',
        inputSchema: {
          type: 'object',
          properties: {
            urls: {
              type: 'array',
              items: {
                type: 'string',
                format: 'uri'
              },
              minItems: 1,
              maxItems: 10,
              description: 'List of URLs to combine into context (max 10)'
            },
            format: {
              type: 'string',
              enum: ['xml', 'markdown', 'json'],
              default: 'xml',
              description: 'Output format'
            },
            custom_context: {
              type: 'string',
              description: 'Optional context or instructions'
            },
            stack_name: {
              type: 'string',
              description: 'Name for the context stack'
            },
            save_to_library: {
              type: 'boolean',
              default: false,
              description: 'Whether to save this context stack to user\'s library'
            },
            api_key: {
              type: 'string',
              description: 'User\'s ctxt.help API key'
            }
          },
          required: ['urls']
        }
      }
    ]
  };
});

// Register call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case 'convert_url':
        if (!args) throw new McpError(ErrorCode.InvalidParams, 'Missing arguments for convert_url');
        return await convertUrlTool.execute(args as any);
      case 'search_library':
        if (!args) throw new McpError(ErrorCode.InvalidParams, 'Missing arguments for search_library');
        return await searchLibraryTool.execute(args as any);
      case 'create_context_stack':
        if (!args) throw new McpError(ErrorCode.InvalidParams, 'Missing arguments for create_context_stack');
        return await createContextStackTool.execute(args as any);
      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

// Start the server
const transport = new StdioServerTransport();

server.connect(transport);

console.error('ctxt.help MCP Server started');
console.error('Available tools:');
console.error('- convert_url: Convert webpage to clean markdown');
console.error('- search_library: Search user\'s saved conversions');
console.error('- create_context_stack: Combine multiple URLs into LLM context');

export default server;