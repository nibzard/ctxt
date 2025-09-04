// ABOUTME: API service class for communicating with FastAPI backend
// ABOUTME: Handles authentication, error handling, and all backend API calls

'use client';

import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { 
  ConversionRequest, 
  Conversion, 
  ConversionList,
  ConversionSave,
  ConversionResponse,
  ConversionCreateRequest
} from '@/types/api';

class ApiService {
  private api: AxiosInstance;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') {
    this.api = axios.create({
      baseURL,
      timeout: 90000, // 90 seconds for conversion requests (matches frontend retry logic)
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use((config) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
          // Redirect to login or show auth modal
        }
        return Promise.reject(error);
      }
    );
  }

  // Health check
  async healthCheck(): Promise<Record<string, unknown>> {
    const response = await this.api.get('/health');
    return response.data;
  }

  // URL Conversion
  async convertUrl(request: ConversionRequest): Promise<Conversion> {
    const response = await this.api.post<Conversion>('/api/convert', request);
    return response.data;
  }

  // Get conversion by ID
  async getConversion(id: string): Promise<Conversion> {
    const response = await this.api.get<Conversion>(`/api/conversions/${id}`);
    return response.data;
  }

  // Get conversion by slug
  async getConversionBySlug(slug: string): Promise<Conversion> {
    const response = await this.api.get<Conversion>(`/api/conversions/slug/${slug}`);
    return response.data;
  }

  // Create new conversion from client-side processed data
  async saveConversion(data: ConversionCreateRequest): Promise<Conversion> {
    const response = await this.api.post<Conversion>('/api/conversions', data);
    return response.data;
  }

  // Save existing conversion to library
  async saveConversionToLibrary(id: string, data: ConversionSave): Promise<ConversionResponse> {
    const response = await this.api.post<ConversionResponse>(`/api/conversions/${id}/save`, data);
    return response.data;
  }

  // List user's conversions
  async listConversions(params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ConversionList> {
    const response = await this.api.get<ConversionList>('/api/conversions', { params });
    return response.data;
  }

  // Delete conversion
  async deleteConversion(id: string): Promise<void> {
    await this.api.delete(`/api/conversions/${id}`);
  }

  // Save context stack and get permalink
  async saveContextStack(data: {
    title: string;
    blocks: Array<{
      id: string;
      type: 'url' | 'text';
      title?: string;
      content: string;
      url?: string;
      order: number;
    }>;
    content: string;
  }): Promise<Conversion> {
    // Create a unified content structure
    const contextContent = data.blocks.map(block => {
      if (block.type === 'url') {
        return `# ${block.title || 'Untitled'}\n\nSource: ${block.url}\n\n---\n\n${block.content}`;
      }
      return block.content;
    }).join('\n\n---\n\n');

    // Save as a regular conversion with special metadata
    const conversionData = {
      source_url: 'context://stack',
      title: data.title,
      content: contextContent,
      meta_description: `Context stack with ${data.blocks.length} blocks`
    };

    const response = await this.api.post<Conversion>('/api/conversions', conversionData);
    return response.data;
  }

  // Check if URL has cached conversion (within 48 hours)
  async checkConversionCache(url: string): Promise<{
    cached: boolean;
    conversion?: Conversion;
    cache_age_hours?: number;
  }> {
    const response = await this.api.get('/api/cache/check', {
      params: { url }
    });
    return response.data;
  }

  // Copy content to clipboard
  async copyToClipboard(content: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  }

  // Generate ChatGPT link with permalink
  generateChatGPTLink(slug: string): string {
    const permalink = this.getSEOPageUrl(slug);
    const prompt = `Read the context at: ${permalink}`;
    const encodedPrompt = encodeURIComponent(prompt);
    return `https://chatgpt.com/?q=${encodedPrompt}`;
  }

  // Generate Claude link with permalink
  generateClaudeLink(slug: string): string {
    const permalink = this.getSEOPageUrl(slug);
    const prompt = `Read the context at: ${permalink}`;
    const encodedPrompt = encodeURIComponent(prompt);
    return `https://claude.ai/new?q=${encodedPrompt}`;
  }

  // Validate URL
  validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Get SEO page URL - now points to Next.js frontend
  getSEOPageUrl(slug: string): string {
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}/read/${slug}`;
  }

  // Handle API errors
  handleError(error: unknown): string {
    if (typeof error === 'object' && error !== null) {
      const err = error as Record<string, unknown>;
      if (err.response && typeof err.response === 'object' && err.response !== null) {
        const response = err.response as Record<string, unknown>;
        if (response.data && typeof response.data === 'object' && response.data !== null) {
          const data = response.data as Record<string, unknown>;
          if (typeof data.detail === 'string') {
            return data.detail;
          }
        }
      }
      
      if (typeof err.message === 'string') {
        return err.message;
      }
    }
    
    return 'An unexpected error occurred';
  }
}

// Create and export singleton instance
export const apiService = new ApiService();
export default apiService;