// ABOUTME: Custom hook for URL conversion logic and state management
// ABOUTME: Handles Jina Reader API calls and backend storage coordination

'use client';

import { useState, useCallback } from 'react';
import { apiService } from '@/services/api';
import type { ConversionRequest, Conversion } from '@/types/api';

interface UseConversionState {
  conversion: Conversion | null;
  loading: boolean;
  error: string | null;
}

interface UseConversionActions {
  convertUrl: (request: ConversionRequest) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

interface JinaReaderResponse {
  code: number;
  status: number;
  data: {
    title: string;
    description: string;
    url: string;
    content: string;
    usage: {
      tokens: number;
    };
  };
}

export function useConversion(): UseConversionState & UseConversionActions {
  const [state, setState] = useState<UseConversionState>({
    conversion: null,
    loading: false,
    error: null,
  });

  const convertUrl = useCallback(async (request: ConversionRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Step 1: Call Jina Reader API directly from client-side
      const jinaUrl = `https://r.jina.ai/${encodeURIComponent(request.url)}`;
      const jinaResponse = await fetch(jinaUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Return-Format': 'markdown'
        }
      });

      if (!jinaResponse.ok) {
        throw new Error(`Jina Reader API error: ${jinaResponse.status}`);
      }

      const jinaData: JinaReaderResponse = await jinaResponse.json();
      
      if (jinaData.code !== 200) {
        throw new Error(`Jina Reader failed with code: ${jinaData.code}`);
      }

      // Step 2: Send processed markdown to our backend for database storage
      const conversion = await apiService.saveConversion({
        source_url: request.url,
        title: jinaData.data.title,
        content: jinaData.data.content,
        meta_description: jinaData.data.description,
        options: request.options
      });
      
      setState(prev => ({ ...prev, conversion, loading: false }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: apiService.handleError(error) 
      }));
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState({
      conversion: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    convertUrl,
    clearError,
    reset,
  };
}