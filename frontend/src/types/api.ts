export interface ConversionRequest {
  url: string;
  options?: ConversionOptions;
}

export interface ConversionOptions {
  include_links?: boolean;
  include_images?: boolean;
  custom_selector?: string;
}

export interface Conversion {
  id: string;
  slug: string;
  user_id?: string;
  source_url: string;
  title?: string;
  domain: string;
  content: string;
  meta_description?: string;
  word_count: number;
  reading_time: number;
  is_public: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface ConversionResponse {
  slug: string;
  permanent_url: string;
  seo_optimized: boolean;
}

export interface ConversionSave {
  make_public: boolean;
  tags?: string[];
}

export interface ConversionCreateRequest {
  source_url: string;
  title: string;
  content: string;
  meta_description?: string;
  options?: ConversionOptions;
}

export interface ConversionList {
  items: Conversion[];
  total: number;
  limit: number;
  offset: number;
}

export interface ContextBlock {
  id: string;
  type: 'text' | 'conversion' | 'file';
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  order: number;
}

export interface ContextStack {
  id: string;
  user_id?: string;
  title: string;
  description?: string;
  blocks: ContextBlock[];
  is_public: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  tier: 'free' | 'power' | 'pro' | 'enterprise';
  api_usage_count: number;
  created_at: string;
  is_active: boolean;
}

export interface ApiError {
  detail: string;
}