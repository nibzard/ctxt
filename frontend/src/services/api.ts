import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { 
  ConversionRequest, 
  Conversion, 
  ConversionList,
  ConversionSave,
  ConversionResponse,
  ConversionCreateRequest
} from '../types/api';

class ApiService {
  private api: AxiosInstance;

  constructor(baseURL: string = 'http://localhost:8000') {
    this.api = axios.create({
      baseURL,
      timeout: 30000, // 30 seconds for conversion requests
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
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

  // Generate ChatGPT link
  generateChatGPTLink(content: string): string {
    const encodedContent = encodeURIComponent(content);
    return `https://chatgpt.com/?q=${encodedContent}`;
  }

  // Generate Claude link
  generateClaudeLink(content: string): string {
    const encodedContent = encodeURIComponent(content);
    return `https://claude.ai/new?q=${encodedContent}`;
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

  // Get SEO page URL
  getSEOPageUrl(slug: string): string {
    return `${this.api.defaults.baseURL}/read/${slug}`;
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
export const apiService = new ApiService(
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
);

export default apiService;