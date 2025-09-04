import axios from 'axios';

interface SearchLibraryInput {
  query: string;
  limit?: number;
  api_key?: string;
}

export const searchLibraryTool = {
  async execute(input: SearchLibraryInput): Promise<any> {
    try {
      if (!input.api_key) {
        throw new Error('API key required. Please provide your ctxt.help API key to search your library.');
      }
      
      const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8000';
      
      // Search conversions
      const response = await axios.get(`${apiBaseUrl}/api/conversions`, {
        params: {
          search: input.query,
          limit: input.limit || 10,
          offset: 0
        },
        headers: {
          'Authorization': `Bearer ${input.api_key}`,
          'Content-Type': 'application/json',
          'User-Agent': 'ctxt-mcp-server/1.0.0'
        },
        timeout: 10000
      });
      
      const searchResults = response.data;
      
      if (!searchResults.items || searchResults.items.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No results found for "${input.query}". Try different search terms or make sure you have saved conversions in your library.`
            }
          ],
          _meta: {
            query: input.query,
            total_results: 0
          }
        };
      }
      
      // Format results
      const formattedResults = searchResults.items.map((item: any, index: number) => {
        // Determine if it's a context stack and use appropriate route
        const isContextStack = item.source_url === 'context://stack';
        const routeType = isContextStack ? 'context' : 'page';
        const readUrl = `https://ctxt.help/${routeType}/${item.slug}`;
        const createdDate = new Date(item.created_at).toLocaleDateString();
        
        return [
          `## ${index + 1}. ${item.title || 'Untitled'}`,
          `**URL:** ${item.source_url}`,
          `**Domain:** ${item.domain}`,
          `**Created:** ${createdDate}`,
          `**Views:** ${item.view_count}`,
          `**Word Count:** ${item.word_count || 0}`,
          `**Permanent Link:** ${readUrl}`,
          '',
          `**Preview:**`,
          item.meta_description || item.content.slice(0, 200) + '...',
          '',
          '---',
          ''
        ].join('\\n');
      }).join('\\n');
      
      const summary = [
        `# Search Results for "${input.query}"`,
        '',
        `Found ${searchResults.items.length} of ${searchResults.total} total results`,
        '',
        formattedResults
      ].join('\\n');
      
      return {
        content: [
          {
            type: 'text',
            text: summary
          }
        ],
        _meta: {
          query: input.query,
          results_shown: searchResults.items.length,
          total_results: searchResults.total,
          has_more: searchResults.total > searchResults.items.length
        }
      };
      
    } catch (error: any) {
      console.error('Library search error:', error);
      
      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please check your API key or log in to ctxt.help.');
      }
      
      if (error.response?.status === 403) {
        throw new Error('Access denied. This feature may require a premium subscription.');
      }
      
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Failed to connect to ctxt.help API. Please check your internet connection.');
      }
      
      throw new Error(`Library search failed: ${error.message}`);
    }
  }
};