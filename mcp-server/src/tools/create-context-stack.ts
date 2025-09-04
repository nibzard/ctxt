import axios from 'axios';

interface CreateContextStackInput {
  urls: string[];
  format?: 'xml' | 'markdown' | 'json';
  custom_context?: string;
  stack_name?: string;
  save_to_library?: boolean;
  api_key?: string;
}

export const createContextStackTool = {
  async execute(input: CreateContextStackInput): Promise<any> {
    try {
      // Validate URLs
      for (const url of input.urls) {
        try {
          new URL(url);
        } catch {
          throw new Error(`Invalid URL: ${url}`);
        }
      }
      
      if (input.save_to_library && !input.api_key) {
        throw new Error('API key required to save context stack to library');
      }
      
      if (input.save_to_library && !input.stack_name) {
        throw new Error('Stack name required when saving to library');
      }
      
      const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8000';
      const conversions = [];
      const errors = [];
      
      // Convert each URL
      for (const url of input.urls) {
        try {
          const response = await axios.post(`${apiBaseUrl}/api/convert`, {
            url: url,
            options: {
              include_images: true,
              remove_navigation: true
            }
          }, {
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'ctxt-mcp-server/1.0.0'
            },
            timeout: 30000
          });
          
          conversions.push({
            url,
            ...response.data
          });
          
        } catch (error: any) {
          console.warn(`Failed to convert ${url}:`, error.message);
          errors.push(`${url}: ${error.message}`);
        }
      }
      
      if (conversions.length === 0) {
        throw new Error(`Failed to convert any URLs. Errors: ${errors.join(', ')}`);
      }
      
      // Format the context stack
      let formattedContext: string;
      
      if (input.format === 'xml') {
        const sources = conversions.map((conv, index) => 
          `  <source_${index + 1} url="${conv.url}" title="${conv.title || 'Untitled'}" domain="${conv.domain || ''}" word_count="${conv.word_count || 0}">
${conv.content.replace(/^/gm, '    ')}
  </source_${index + 1}>`
        ).join('\\n\\n');
        
        formattedContext = input.custom_context 
          ? `<context>\\n  <instructions>${input.custom_context}</instructions>\\n\\n${sources}\\n</context>`
          : `<context>\\n${sources}\\n</context>`;
          
      } else if (input.format === 'json') {
        const contextData = {
          context: input.custom_context || null,
          sources: conversions.map((conv, index) => ({
            index: index + 1,
            url: conv.url,
            title: conv.title,
            domain: conv.domain,
            word_count: conv.word_count,
            reading_time: conv.reading_time,
            content: conv.content,
            permanent_url: `https://ctxt.help/page/${conv.slug}`
          })),
          metadata: {
            total_sources: conversions.length,
            failed_conversions: errors.length,
            total_words: conversions.reduce((sum, conv) => sum + (conv.word_count || 0), 0),
            created_at: new Date().toISOString()
          }
        };
        
        formattedContext = JSON.stringify(contextData, null, 2);
        
      } else {
        // Markdown format
        const header = [
          input.stack_name ? `# ${input.stack_name}` : '# Context Stack',
          '',
          input.custom_context ? `*${input.custom_context}*\\n` : '',
          `**Sources:** ${conversions.length} URLs`,
          `**Total Words:** ${conversions.reduce((sum, conv) => sum + (conv.word_count || 0), 0)}`,
          errors.length > 0 ? `**Failed Conversions:** ${errors.length}` : '',
          '',
          '---',
          ''
        ].filter(Boolean).join('\\n');
        
        const sources = conversions.map((conv, index) => [
          `## Source ${index + 1}: ${conv.title || 'Untitled'}`,
          `**URL:** ${conv.url}`,
          `**Domain:** ${conv.domain || 'Unknown'}`,
          `**Words:** ${conv.word_count || 0}`,
          `**Permanent Link:** https://ctxt.help/page/${conv.slug}`,
          '',
          conv.content,
          '',
          '---',
          ''
        ].join('\\n')).join('\\n');
        
        formattedContext = header + sources;
      }
      
      // Save to library if requested
      let libraryInfo = null;
      if (input.save_to_library && input.api_key) {
        try {
          const blocks = conversions.map((conv, index) => ({
            id: `block-${index}`,
            type: 'url',
            url: conv.url,
            title: conv.title,
            content: conv.content,
            order: index
          }));
          
          const stackResponse = await axios.post(`${apiBaseUrl}/api/context-stacks`, {
            name: input.stack_name,
            description: input.custom_context,
            blocks: blocks,
            is_public: false
          }, {
            headers: {
              'Authorization': `Bearer ${input.api_key}`,
              'Content-Type': 'application/json'
            }
          });
          
          libraryInfo = {
            saved: true,
            stack_id: stackResponse.data.id,
            stack_url: `https://ctxt.help/stacks/${stackResponse.data.id}`
          };
        } catch (saveError: any) {
          console.warn('Failed to save to library:', saveError.message);
          libraryInfo = {
            saved: false,
            error: saveError.response?.data?.detail || saveError.message
          };
        }
      }
      
      return {
        content: [
          {
            type: 'text',
            text: formattedContext
          }
        ],
        _meta: {
          total_sources: conversions.length,
          successful_conversions: conversions.length,
          failed_conversions: errors.length,
          errors: errors,
          format: input.format || 'xml',
          total_words: conversions.reduce((sum, conv) => sum + (conv.word_count || 0), 0),
          library: libraryInfo,
          sources: conversions.map(conv => ({
            url: conv.url,
            title: conv.title,
            domain: conv.domain,
            permanent_url: `https://ctxt.help/page/${conv.slug}`
          }))
        }
      };
      
    } catch (error: any) {
      console.error('Context stack creation error:', error);
      throw new Error(`Context stack creation failed: ${error.message}`);
    }
  }
};