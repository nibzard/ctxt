import axios from 'axios';

interface ConvertUrlInput {
  url: string;
  format?: 'markdown' | 'xml';
  include_images?: boolean;
  custom_context?: string;
}

export const convertUrlTool = {
  async execute(input: ConvertUrlInput): Promise<any> {
    try {
      // Validate URL
      new URL(input.url);
      
      const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8000';
      
      // Make request to ctxt.help API
      const response = await axios.post(`${apiBaseUrl}/api/convert`, {
        url: input.url,
        options: {
          include_images: input.include_images ?? true,
          remove_navigation: true
        }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ctxt-mcp-server/1.0.0'
        },
        timeout: 30000
      });
      
      const conversion = response.data;
      
      // Format output based on requested format
      let formattedContent: string;
      
      if (input.format === 'xml') {
        formattedContent = `<source url="${input.url}" title="${conversion.title || 'Untitled'}" domain="${conversion.domain || ''}" word_count="${conversion.word_count || 0}">
${conversion.content}
</source>`;
      } else {
        // Markdown format (default)
        const header = [
          `# ${conversion.title || 'Untitled'}`,
          `**URL:** ${input.url}`,
          conversion.domain && `**Domain:** ${conversion.domain}`,
          conversion.word_count && `**Word Count:** ${conversion.word_count}`,
          conversion.reading_time && `**Reading Time:** ${conversion.reading_time} minutes`,
          ''
        ].filter(Boolean).join('\n');
        
        formattedContent = `${header}\n${conversion.content}`;
      }
      
      // Add custom context if provided
      if (input.custom_context) {
        if (input.format === 'xml') {
          formattedContent = `<context>${input.custom_context}</context>\n\n${formattedContent}`;
        } else {
          formattedContent = `*Context: ${input.custom_context}*\n\n${formattedContent}`;
        }
      }
      
      return {
        content: [
          {
            type: 'text',
            text: formattedContent
          }
        ],
        _meta: {
          title: conversion.title,
          url: input.url,
          domain: conversion.domain,
          word_count: conversion.word_count,
          reading_time: conversion.reading_time,
          permanent_url: `https://ctxt.help/page/${conversion.slug}`,
          format: input.format || 'markdown'
        }
      };
      
    } catch (error: any) {
      console.error('URL conversion error:', error);
      
      // Return helpful error messages
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Failed to connect to ctxt.help API. Please check your internet connection and API configuration.');
      }
      
      if (error.response?.status === 400) {
        throw new Error(`Invalid URL or conversion failed: ${error.response.data?.detail || error.message}`);
      }
      
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later or upgrade your plan.');
      }
      
      throw new Error(`URL conversion failed: ${error.message}`);
    }
  }
};