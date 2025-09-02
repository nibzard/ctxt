import { useState, useCallback } from 'react';
import { apiService } from '../services';
import { ConversionRequest, Conversion } from '../types';

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

export function useConversion(): UseConversionState & UseConversionActions {
  const [state, setState] = useState<UseConversionState>({
    conversion: null,
    loading: false,
    error: null,
  });

  const convertUrl = useCallback(async (request: ConversionRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const conversion = await apiService.convertUrl(request);
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