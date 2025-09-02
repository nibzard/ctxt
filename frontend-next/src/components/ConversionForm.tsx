// ABOUTME: Main URL conversion form component for homepage
// ABOUTME: Handles URL input, conversion process, and result display with action buttons

'use client';

import React, { useState, useCallback } from 'react';
import { Link2, Copy, ExternalLink, FileText, Check, AlertCircle } from 'lucide-react';
import { useConversion, useClipboard } from '@/hooks';
import { apiService } from '@/services/api';
import { Conversion } from '@/types/api';

interface BatchResult {
  url: string;
  success: boolean;
  result: Conversion | null;
  error: string | null;
}

const ConversionForm: React.FC = () => {
  const [url, setUrl] = useState('');
  const [batchUrls, setBatchUrls] = useState('');
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchStatus, setBatchStatus] = useState<string>('');
  const { conversion, loading, error, convertUrl, clearError, isFromCache, cacheAgeHours } = useConversion();
  const { copy, copied } = useClipboard();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'single') {
      if (!url.trim()) return;
      
      if (!apiService.validateUrl(url)) {
        alert('Please enter a valid URL');
        return;
      }

      await convertUrl({ url: url.trim() });
    } else {
      await handleBatchConversion();
    }
  };

  const convertSingleUrl = useCallback(async (urlToConvert: string) => {
    // Create an AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const cacheResult = await apiService.checkConversionCache(urlToConvert);
      
      if (cacheResult.cached && cacheResult.conversion) {
        clearTimeout(timeoutId);
        return cacheResult.conversion;
      }
      
      const jinaUrl = `https://r.jina.ai/${encodeURIComponent(urlToConvert)}`;
      const jinaResponse = await fetch(jinaUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Return-Format': 'markdown'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!jinaResponse.ok) {
        throw new Error(`Jina Reader API error: ${jinaResponse.status}`);
      }

      const jinaData = await jinaResponse.json();
      
      if (jinaData.code !== 200) {
        throw new Error(`Jina Reader failed with code: ${jinaData.code}`);
      }

      const conversion = await apiService.saveConversion({
        source_url: urlToConvert,
        title: jinaData.data.title,
        content: jinaData.data.content,
        meta_description: jinaData.data.description
      });
      
      return conversion;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out after 30 seconds');
      }
      throw error;
    }
  }, []);

  const handleBatchConversion = useCallback(async () => {
    const urls = batchUrls
      .split('\n')
      .map(u => u.trim())
      .filter(u => u)
      .filter(u => apiService.validateUrl(u));

    if (urls.length === 0) {
      setBatchStatus('Please enter at least one valid URL');
      return;
    }

    setBatchLoading(true);
    setBatchResults([]);
    setBatchProgress({ current: 0, total: urls.length });
    setBatchStatus('Starting batch conversion...');

    const results: BatchResult[] = [];
    
    for (let i = 0; i < urls.length; i++) {
      const currentUrl = urls[i];
      setBatchProgress({ current: i + 1, total: urls.length });
      setBatchStatus(`Converting ${i + 1} of ${urls.length}: ${currentUrl}`);
      
      try {
        const result = await convertSingleUrl(currentUrl);
        results.push({
          url: currentUrl,
          success: true,
          result: result,
          error: null
        });
      } catch (error) {
        results.push({
          url: currentUrl,
          success: false,
          result: null,
          error: apiService.handleError(error)
        });
      }
      
      // Update results incrementally for better UX
      setBatchResults([...results]);
      
      // Small delay to prevent overwhelming the API
      if (i < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    setBatchStatus(`Completed: ${successCount}/${urls.length} URLs converted successfully`);
    setBatchLoading(false);
  }, [batchUrls, convertSingleUrl]);

  const handleCopyToClipboard = () => {
    if (conversion?.content) {
      copy(conversion.content);
    }
  };

  const openInChatGPT = () => {
    if (conversion?.slug) {
      const chatGPTUrl = apiService.generateChatGPTLink(conversion.slug);
      window.open(chatGPTUrl, '_blank');
    }
  };

  const openInClaude = () => {
    if (conversion?.slug) {
      const claudeUrl = apiService.generateClaudeLink(conversion.slug);
      window.open(claudeUrl, '_blank');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <Link2 className="w-8 h-8 text-blue-600 mr-2" />
          <h1 className="text-3xl font-bold text-gray-900">ctxt.help</h1>
        </div>
        <p className="text-lg text-gray-600">
          Turn any webpage into perfect LLM input with shareable, permanent links
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => setMode('single')}
            className={`px-4 py-2 rounded-lg font-medium ${
              mode === 'single' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Single URL
          </button>
          <button
            onClick={() => setMode('batch')}
            className={`px-4 py-2 rounded-lg font-medium ${
              mode === 'batch' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Batch URLs
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'single' ? (
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                Enter URL to convert
              </label>
              <div className="flex space-x-3">
                <input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (error) clearError();
                  }}
                  placeholder="Paste any URL (e.g., https://docs.anthropic.com/claude/docs)"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Converting...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      <span>Convert</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="batchUrls" className="block text-sm font-medium text-gray-700 mb-2">
                Enter URLs to convert (one per line)
              </label>
              <textarea
                id="batchUrls"
                value={batchUrls}
                onChange={(e) => setBatchUrls(e.target.value)}
                placeholder="https://example1.com&#10;https://example2.com&#10;https://example3.com"
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={batchLoading}
              />
              
              <div className="flex items-center justify-between mt-3">
                <div className="text-sm text-gray-500">
                  {batchUrls.split('\n').filter(u => u.trim() && apiService.validateUrl(u.trim())).length} valid URLs
                </div>
                
                <button
                  type="submit"
                  disabled={batchLoading || !batchUrls.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {batchLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Converting {batchProgress.current}/{batchProgress.total}</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      <span>Convert All</span>
                    </>
                  )}
                </button>
              </div>

              {(batchLoading || batchStatus) && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  {batchLoading && (
                    <div className="mb-3">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${(batchProgress.current / batchProgress.total) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {batchStatus && (
                    <div className="text-sm text-gray-700">
                      {batchStatus}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </form>
      </div>

      {/* Conversion Result */}
      {conversion && (
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Result Header */}
          <div className="border-b pb-4 mb-4">
            {isFromCache && (
              <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center text-sm text-blue-700">
                  <Check className="w-4 h-4 mr-2" />
                  <span>
                    Using cached version from {cacheAgeHours === 0 ? 'less than 1' : cacheAgeHours} hour{cacheAgeHours !== 1 ? 's' : ''} ago
                  </span>
                </div>
              </div>
            )}
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {conversion.title || 'Converted Content'}
            </h2>
            <div className="flex items-center text-sm text-gray-500 space-x-4">
              <span>Source: {conversion.domain}</span>
              <span>•</span>
              <span>{conversion.word_count} words</span>
              <span>•</span>
              <span>{conversion.reading_time} min read</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={handleCopyToClipboard}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>

            <button
              onClick={openInChatGPT}
              className="flex items-center space-x-2 px-4 py-2 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Send to ChatGPT</span>
            </button>

            <button
              onClick={openInClaude}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-100 hover:bg-orange-200 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Send to Claude</span>
            </button>
          </div>

          {/* Content Preview */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Preview:</h3>
            <div className="max-h-96 overflow-y-auto">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                {conversion.content.slice(0, 1000)}
                {conversion.content.length > 1000 && '...'}
              </pre>
            </div>
            {conversion.content.length > 1000 && (
              <p className="text-xs text-gray-500 mt-2">
                Showing first 1000 characters. Use &quot;Copy Markdown&quot; to get the full content.
              </p>
            )}
          </div>

          {/* SEO Link */}
          {conversion.slug && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Permanent Link:</h4>
              <div className="flex items-center space-x-2">
                <code className="flex-1 text-sm text-blue-800 bg-blue-100 px-2 py-1 rounded">
                  {apiService.getSEOPageUrl(conversion.slug)}
                </code>
                <button
                  onClick={() => copy(apiService.getSEOPageUrl(conversion.slug))}
                  className="p-1 text-blue-600 hover:text-blue-800"
                  title="Copy link"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Batch Results */}
      {batchResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Batch Conversion Results ({batchResults.filter(r => r.success).length}/{batchResults.length} successful)
          </h2>
          
          <div className="space-y-4">
            {batchResults.map((result, index) => (
              <div key={index} className={`border rounded-lg p-4 ${
                result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-sm">
                    {result.success ? (
                      <span className="text-green-800">{result.result?.title || 'Converted Successfully'}</span>
                    ) : (
                      <span className="text-red-800">Conversion Failed</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {result.success ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                </div>
                
                <div className="text-xs text-gray-600 mb-2 font-mono break-all">
                  {result.url}
                </div>
                
                {result.success && result.result ? (
                  <div>
                    <div className="text-sm text-gray-700 mb-2">
                      {result.result.word_count} words • {result.result.reading_time} min read • {result.result.domain}
                    </div>
                    
                    <div className="flex space-x-2 mb-3">
                      <button
                        onClick={() => copy(result.result.content)}
                        className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                      >
                        Copy Markdown
                      </button>
                      {result.result.slug && (
                        <button
                          onClick={() => copy(apiService.getSEOPageUrl(result.result.slug))}
                          className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded"
                        >
                          Copy Permanent Link
                        </button>
                      )}
                    </div>
                    
                    <div className="border border-gray-200 rounded p-2 bg-white text-xs">
                      <div className="max-h-32 overflow-y-auto">
                        <pre className="whitespace-pre-wrap font-mono text-gray-700">
                          {result.result.content.slice(0, 200)}...
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-red-700">
                    Error: {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {batchResults.filter(r => r.success).length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="text-sm text-blue-900 font-medium">
                  Export successful conversions to Context Builder
                </div>
                <button
                  onClick={() => {
                    const successfulResults = batchResults
                      .filter(r => r.success)
                      .map(r => ({
                        id: `batch-${Date.now()}-${Math.random()}`,
                        type: 'url' as const,
                        title: r.result?.title,
                        content: r.result?.content || '',
                        url: r.url,
                        order: 0
                      }));
                    
                    // Store in localStorage for context builder to pick up
                    localStorage.setItem('batchImport', JSON.stringify(successfulResults));
                    alert(`${successfulResults.length} conversions ready for Context Builder. Switch to the Context Builder tab to import them.`);
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Export to Context Builder
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Features */}
      <div className="mt-12 grid md:grid-cols-3 gap-6 text-center">
        <div className="p-6">
          <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <Link2 className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Client-Side Processing</h3>
          <p className="text-gray-600">Zero server costs, unlimited usage, works offline</p>
        </div>

        <div className="p-6">
          <div className="w-12 h-12 bg-green-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <ExternalLink className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Tool Integration</h3>
          <p className="text-gray-600">One-click export to ChatGPT, Claude, and other AI tools</p>
        </div>

        <div className="p-6">
          <div className="w-12 h-12 bg-orange-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <FileText className="w-6 h-6 text-orange-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Clean Markdown</h3>
          <p className="text-gray-600">Perfect formatting for AI analysis and documentation</p>
        </div>
      </div>
    </div>
  );
};

export default ConversionForm;