import React, { useState } from 'react';
import { Link2, Copy, ExternalLink, FileText, Check, AlertCircle } from 'lucide-react';
import { useConversion, useClipboard } from '../hooks';
import { apiService } from '../services';

const ConversionForm: React.FC = () => {
  const [url, setUrl] = useState('');
  const { conversion, loading, error, convertUrl, clearError } = useConversion();
  const { copy, copied } = useClipboard();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) return;
    
    if (!apiService.validateUrl(url)) {
      alert('Please enter a valid URL');
      return;
    }

    await convertUrl({ url: url.trim() });
  };

  const handleCopyToClipboard = () => {
    if (conversion?.content) {
      copy(conversion.content);
    }
  };

  const openInChatGPT = () => {
    if (conversion?.content) {
      const chatGPTUrl = apiService.generateChatGPTLink(conversion.content);
      window.open(chatGPTUrl, '_blank');
    }
  };

  const openInClaude = () => {
    if (conversion?.content) {
      const claudeUrl = apiService.generateClaudeLink(conversion.content);
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

      {/* Conversion Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="https://example.com/article"
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
                Showing first 1000 characters. Use "Copy Markdown" to get the full content.
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