// ABOUTME: Context builder component for stacking multiple conversions with drag-and-drop
// ABOUTME: Migrated to use Pragmatic Drag and Drop for better performance and accessibility

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { SortableItem } from './SortableItem';
import { DropZone } from './DropZone';
import { Plus, Save, Download } from 'lucide-react';
import { apiService } from '@/services/api';

interface ContextBlock {
  id: string;
  type: 'url' | 'text';
  title?: string;
  content: string;
  url?: string;
  order: number;
}

interface ContextBuilderProps {
  onExport?: (blocks: ContextBlock[], format: string) => void;
  onSave?: (name: string, blocks: ContextBlock[]) => void;
  initialBlocks?: ContextBlock[];
  className?: string;
}

const ContextBuilder: React.FC<ContextBuilderProps> = ({
  onExport,
  onSave,
  initialBlocks = [],
  className = '',
}) => {
  const [blocks, setBlocks] = useState<ContextBlock[]>(initialBlocks);
  const [newBlockType, setNewBlockType] = useState<'url' | 'text'>('url');
  const [newBlockContent, setNewBlockContent] = useState('');
  const [stackName, setStackName] = useState('');
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [exportFormat, setExportFormat] = useState<'xml' | 'markdown' | 'json'>('xml');
  const [isConverting, setIsConverting] = useState(false);
  const [hasCheckedImport, setHasCheckedImport] = useState(false);

  // Check for batch import on component mount (only once)
  useEffect(() => {
    if (hasCheckedImport) return;
    
    const batchImport = localStorage.getItem('batchImport');
    if (batchImport) {
      try {
        const importedBlocks = JSON.parse(batchImport);
        if (Array.isArray(importedBlocks) && importedBlocks.length > 0) {
          // Update order for imported blocks
          const updatedBlocks = importedBlocks.map((block: ContextBlock, index: number) => ({
            ...block,
            order: blocks.length + index
          }));
          
          setBlocks(prev => [...prev, ...updatedBlocks]);
          localStorage.removeItem('batchImport');
          
          // Show notification
          const count = importedBlocks.length;
          alert(`Imported ${count} conversion${count > 1 ? 's' : ''} from batch processing!`);
        }
      } catch (error) {
        console.error('Error importing batch conversions:', error);
      }
    }
    setHasCheckedImport(true);
  }, [hasCheckedImport, blocks.length]);

  const handleDragEnd = useCallback((sourceIndex: number, targetIndex: number) => {
    if (sourceIndex === targetIndex) return;

    // Use requestAnimationFrame to batch the state update
    requestAnimationFrame(() => {
      setBlocks(prev => {
        const newBlocks = [...prev];
        const [movedItem] = newBlocks.splice(sourceIndex, 1);
        newBlocks.splice(targetIndex, 0, movedItem);
        
        // Update order property
        return newBlocks.map((item, index) => ({ ...item, order: index }));
      });
    });
  }, []);

  const addUrlBlock = useCallback(async (url: string) => {
    if (!apiService.validateUrl(url)) {
      console.error('Invalid URL provided');
      return;
    }

    setIsConverting(true);
    
    try {
      // Check cache first
      const cacheResult = await Promise.race([
        apiService.checkConversionCache(url),
        new Promise<{ cached: false }>((_, reject) => 
          setTimeout(() => reject(new Error('Cache check timeout')), 5000)
        )
      ]);
      
      let conversion;
      if (cacheResult.cached && cacheResult.conversion) {
        conversion = cacheResult.conversion;
      } else {
        // Convert URL using Jina Reader API with timeout
        const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        
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

        // Save conversion to backend
        conversion = await apiService.saveConversion({
          source_url: url,
          title: jinaData.data.title,
          content: jinaData.data.content,
          meta_description: jinaData.data.description
        });
      }

      // Add as block
      const newBlock: ContextBlock = {
        id: `block-${Date.now()}-${Math.random()}`,
        type: 'url',
        title: conversion.title || 'Untitled',
        content: conversion.content,
        url: url,
        order: blocks.length,
      };

      setBlocks(prev => [...prev, newBlock]);
      setNewBlockContent('');
      setIsAddingBlock(false);
      
    } catch (error) {
      console.error('Error converting URL:', error);
      // Show error in UI instead of alert
      setNewBlockContent('');
      setIsAddingBlock(false);
    } finally {
      setIsConverting(false);
    }
  }, [blocks.length]);

  const addBlock = useCallback(async () => {
    if (!newBlockContent.trim()) return;

    if (newBlockType === 'url') {
      await addUrlBlock(newBlockContent.trim());
    } else {
      const newBlock: ContextBlock = {
        id: `block-${Date.now()}`,
        type: 'text',
        content: newBlockContent,
        order: blocks.length,
      };

      setBlocks(prev => [...prev, newBlock]);
      setNewBlockContent('');
      setIsAddingBlock(false);
    }
  }, [newBlockContent, newBlockType, blocks.length, addUrlBlock]);

  const removeBlock = useCallback((blockId: string) => {
    requestAnimationFrame(() => {
      setBlocks(prev => prev.filter(block => block.id !== blockId).map((block, index) => ({
        ...block,
        order: index
      })));
    });
  }, []);

  const updateBlock = useCallback((blockId: string, updates: Partial<ContextBlock>) => {
    setBlocks(prev => prev.map(block => 
      block.id === blockId ? { ...block, ...updates } : block
    ));
  }, []);

  const handleExport = useCallback(() => {
    if (onExport) {
      onExport(blocks, exportFormat);
    }
  }, [blocks, exportFormat, onExport]);

  const handleSave = useCallback(() => {
    if (onSave && stackName.trim()) {
      onSave(stackName, blocks);
    }
  }, [blocks, stackName, onSave]);

  const generatePreview = useCallback(() => {
    // Limit preview to first 2000 chars to improve performance
    const truncateForPreview = (text: string, maxLength = 2000) => {
      if (text.length <= maxLength) return text;
      return text.slice(0, maxLength) + '\n... (truncated for preview)';
    };

    const content = blocks.map(block => {
      if (block.type === 'url') {
        return `${block.title || 'Untitled'}\n${block.url}\n---\n${truncateForPreview(block.content, 500)}`;
      }
      return truncateForPreview(block.content, 500);
    }).join('\n\n---\n\n');

    if (exportFormat === 'xml') {
      const xmlContent = `<context>\n${blocks.map((block, index) => 
        `  <source_${index + 1} type="${block.type}"${block.url ? ` url="${block.url}"` : ''}>\n    ${truncateForPreview(block.content, 500).replace(/\n/g, '\n    ')}\n  </source_${index + 1}>`
      ).join('\n')}\n</context>`;
      return truncateForPreview(xmlContent);
    } else if (exportFormat === 'json') {
      const jsonContent = JSON.stringify({ 
        blocks: blocks.map(block => ({
          ...block,
          content: truncateForPreview(block.content, 500)
        }))
      }, null, 2);
      return truncateForPreview(jsonContent);
    }
    
    return content; // markdown format
  }, [blocks, exportFormat]);

  return (
    <div className={`max-w-4xl mx-auto p-6 ${className}`}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Context Builder</h2>
        <p className="text-gray-600 mb-3">
          Build your context by adding URLs and text blocks. Drag to reorder them.
        </p>
        
        {/* Check for available batch import */}
        {typeof window !== 'undefined' && localStorage.getItem('batchImport') && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-blue-800">
                <strong>Batch conversions ready to import!</strong> You have converted URLs waiting to be added.
              </div>
              <button
                onClick={() => {
                  // Force re-run the useEffect by triggering a state change
                  window.location.reload();
                }}
                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Import Now
              </button>
            </div>
          </div>
        )}
        
        <div className="text-sm text-gray-500">
          <strong>Pro tip:</strong> Use the &quot;Single URL&quot; tab to convert multiple URLs in batch, then export them here for organization and further editing.
        </div>
      </div>

      {/* Context Stack Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
          <input
            type="text"
            placeholder="Context stack name..."
            value={stackName}
            onChange={(e) => setStackName(e.target.value)}
            className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <div className="flex gap-2 flex-wrap">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'xml' | 'markdown' | 'json')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="xml">XML</option>
              <option value="markdown">Markdown</option>
              <option value="json">JSON</option>
            </select>
            
            <button
              onClick={handleSave}
              disabled={!stackName.trim() || blocks.length === 0}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </button>
            
            <button
              onClick={handleExport}
              disabled={blocks.length === 0}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Add Block Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        {!isAddingBlock ? (
          <button
            onClick={() => setIsAddingBlock(true)}
            className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-400"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add URL or Text Block
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="url"
                  checked={newBlockType === 'url'}
                  onChange={() => setNewBlockType('url')}
                  className="form-radio"
                />
                <span className="ml-2">URL</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="text"
                  checked={newBlockType === 'text'}
                  onChange={() => setNewBlockType('text')}
                  className="form-radio"
                />
                <span className="ml-2">Text</span>
              </label>
            </div>

            {newBlockType === 'url' ? (
              <input
                type="url"
                placeholder="https://example.com"
                value={newBlockContent}
                onChange={(e) => setNewBlockContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            ) : (
              <textarea
                placeholder="Enter your text content..."
                value={newBlockContent}
                onChange={(e) => setNewBlockContent(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            )}

            <div className="flex gap-2">
              <button
                onClick={addBlock}
                disabled={!newBlockContent.trim() || isConverting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isConverting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Converting...</span>
                  </>
                ) : (
                  <span>Add Block</span>
                )}
              </button>
              <button
                onClick={() => {
                  setIsAddingBlock(false);
                  setNewBlockContent('');
                }}
                disabled={isConverting}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Context Blocks */}
      {blocks.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Context Blocks ({blocks.length})
          </h3>
          
          <div className="space-y-1">
            <DropZone index={0} onDrop={handleDragEnd} />
            {blocks.map((block, index) => (
              <React.Fragment key={block.id}>
                <SortableItem
                  id={block.id}
                  block={block}
                  index={index}
                  onUpdate={updateBlock}
                  onRemove={removeBlock}
                  onMove={handleDragEnd}
                />
                <DropZone index={index + 1} onDrop={handleDragEnd} />
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      {blocks.length > 0 && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Preview ({exportFormat})
          </h3>
          <pre className="bg-white border rounded p-4 text-sm overflow-auto max-h-96 whitespace-pre-wrap">
            {generatePreview()}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ContextBuilder;