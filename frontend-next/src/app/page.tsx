// ABOUTME: Homepage component with ConversionForm and main landing content
// ABOUTME: Entry point for URL conversion and context building functionality

'use client';

import React, { useState } from 'react';
import ConversionForm from '@/components/ConversionForm';
import ContextBuilder from '@/components/ContextBuilder';
import { Link2, Layers } from 'lucide-react';

interface ContextBlock {
  id: string;
  type: 'url' | 'text';
  title?: string;
  content: string;
  url?: string;
  order: number;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'single' | 'context'>('single');

  const handleExport = (blocks: ContextBlock[], format: string) => {
    // Generate and download the context in the specified format
    const content = generateContextContent(blocks, format);
    downloadContent(content, `context.${format === 'json' ? 'json' : 'md'}`, 
      format === 'json' ? 'application/json' : 'text/markdown');
  };

  const handleSave = (name: string, blocks: ContextBlock[]) => {
    // For now, save to localStorage. Later we'll wire this to the backend
    const contextStack = {
      id: `stack-${Date.now()}`,
      name,
      blocks,
      createdAt: new Date().toISOString()
    };
    
    const savedStacks = JSON.parse(localStorage.getItem('contextStacks') || '[]');
    savedStacks.push(contextStack);
    localStorage.setItem('contextStacks', JSON.stringify(savedStacks));
    
    alert(`Context stack "${name}" saved successfully!`);
  };

  const generateContextContent = (blocks: ContextBlock[], format: string): string => {
    if (format === 'json') {
      return JSON.stringify({ blocks }, null, 2);
    }
    
    if (format === 'xml') {
      return `<context>\n${blocks.map((block, index) => 
        `  <source_${index + 1} type="${block.type}"${block.url ? ` url="${block.url}"` : ''}>\n    ${block.content.replace(/\n/g, '\n    ')}\n  </source_${index + 1}>`
      ).join('\n')}\n</context>`;
    }
    
    // Markdown format
    return blocks.map(block => {
      if (block.type === 'url') {
        return `# ${block.title || 'Untitled'}\n\nSource: ${block.url}\n\n---\n\n${block.content}`;
      }
      return block.content;
    }).join('\n\n---\n\n');
  };

  const downloadContent = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('single')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'single'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Link2 className="w-4 h-4" />
                <span>Single URL</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('context')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'context'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4" />
                <span>Context Builder</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="py-6">
        {activeTab === 'single' && <ConversionForm />}
        {activeTab === 'context' && (
          <ContextBuilder 
            onExport={handleExport}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  );
}
