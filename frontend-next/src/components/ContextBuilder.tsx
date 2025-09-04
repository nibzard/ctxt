// ABOUTME: Context builder component for stacking multiple conversions with drag-and-drop
// ABOUTME: Migrated to use Pragmatic Drag and Drop for better performance and accessibility

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { SortableItem } from './SortableItem';
import { DropZone } from './DropZone';
import { Plus, Save, Download, Trash2, Link2, Check, Layers, MoreVertical, ExternalLink, Copy } from 'lucide-react';
import { apiService } from '@/services/api';
import { estimateTokenCount, formatTokenCount, getContextUsage } from '@/utils/tokenCount';

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
  initialBlocks?: ContextBlock[];
  initialStackName?: string;
  isLoading?: boolean;
  className?: string;
}

const ContextBuilder: React.FC<ContextBuilderProps> = ({
  onExport,
  initialBlocks = [],
  initialStackName = '',
  isLoading = false,
  className = '',
}) => {
  const [blocks, setBlocks] = useState<ContextBlock[]>([]);
  const [newBlockType, setNewBlockType] = useState<'url' | 'text'>('text');
  const [newBlockContent, setNewBlockContent] = useState('');
  const [stackName, setStackName] = useState(initialStackName);
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [importedBlockIds, setImportedBlockIds] = useState<Set<string>>(new Set());
  const [importNotification, setImportNotification] = useState<string>('');
  const [savedContextSlug, setSavedContextSlug] = useState<string>('');
  const [permalinkCopied, setPermalinkCopied] = useState(false);
  const [isSavingForPermalink, setIsSavingForPermalink] = useState(false);
  const [xmlCopied, setXmlCopied] = useState(false);
  const [isRemixMode, setIsRemixMode] = useState(false);
  const [hasAutoSaved, setHasAutoSaved] = useState(false);
  const [autoSaveNotification, setAutoSaveNotification] = useState<string>('');
  const isImportingRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Function to actually perform the batch import
  const performBatchImport = useCallback(() => {
    // Prevent concurrent imports
    if (isImportingRef.current) return;
    
    const batchImport = localStorage.getItem('batchImport');
    if (!batchImport) return;

    isImportingRef.current = true;

    try {
      const importedBlocks = JSON.parse(batchImport);
      if (Array.isArray(importedBlocks) && importedBlocks.length > 0) {
        
        // Use functional state update to get the most current blocks and imported IDs
        setBlocks(currentBlocks => {
          // Filter out blocks we've already imported using current state
          const newBlocks = importedBlocks.filter((block: ContextBlock) => 
            !importedBlockIds.has(block.id) && 
            !currentBlocks.some(existingBlock => 
              existingBlock.id === block.id || 
              (existingBlock.url === block.url && existingBlock.title === block.title)
            )
          );
          
          if (newBlocks.length === 0) {
            isImportingRef.current = false;
            return currentBlocks; // No new blocks to add
          }

          // Update imported block IDs and localStorage
          setImportedBlockIds(prevIds => {
            const newSet = new Set(prevIds);
            newBlocks.forEach((block: ContextBlock) => newSet.add(block.id));
            
            // Clear localStorage since we're importing all remaining blocks
            localStorage.removeItem('batchImport');
            
            return newSet;
          });

          // Show notification
          const count = newBlocks.length;
          setImportNotification(`Imported ${count} conversion${count > 1 ? 's' : ''} from batch processing`);
          setTimeout(() => setImportNotification(''), 4000);

          // Add new blocks with correct ordering
          const updatedBlocks = newBlocks.map((block: ContextBlock, index: number) => ({
            ...block,
            order: currentBlocks.length + index
          }));

          isImportingRef.current = false;
          return [...currentBlocks, ...updatedBlocks];
        });
      }
    } catch (error) {
      console.error('Error importing batch conversions:', error);
      isImportingRef.current = false;
    }
  }, [importedBlockIds]);

  // Debounced version of batch import check
  const checkForBatchImport = useCallback(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      performBatchImport();
    }, 100);
  }, [performBatchImport]);

  // Check for batch import on component mount
  useEffect(() => {
    checkForBatchImport();
  }, [checkForBatchImport]);

  // Check for batch imports when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkForBatchImport();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Clean up debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [checkForBatchImport]);

  // Load draft from localStorage AFTER checking for imports
  useEffect(() => {
    // First check for batch imports, then load draft if no imports and no existing blocks
    const batchImport = localStorage.getItem('batchImport');
    if (!batchImport && initialBlocks.length === 0 && blocks.length === 0) {
      const savedDraft = localStorage.getItem('contextBuilderDraft');
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          if (draft.blocks && Array.isArray(draft.blocks) && draft.blocks.length > 0) {
            setBlocks(draft.blocks);
          }
          if (draft.stackName && typeof draft.stackName === 'string') {
            setStackName(draft.stackName);
          }
        } catch (error) {
          console.error('Error loading draft from localStorage:', error);
        }
      }
    }
  }, [blocks.length, initialBlocks.length]); // Run only on mount after batch import check

  // Handle remix/initial data updates
  useEffect(() => {
    if (initialBlocks.length > 0 && blocks.length === 0) {
      setBlocks(initialBlocks);
      setIsRemixMode(true);
    }
    if (initialStackName && !stackName) {
      setStackName(initialStackName);
    }
  }, [initialBlocks, initialStackName, blocks.length, stackName]);

  // Save draft to localStorage whenever blocks or stackName changes
  useEffect(() => {
    // Only save if we have blocks or a stack name
    if (blocks.length > 0 || stackName.trim()) {
      const draft = {
        blocks,
        stackName,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('contextBuilderDraft', JSON.stringify(draft));
    } else {
      // Clear draft if no blocks and no name
      localStorage.removeItem('contextBuilderDraft');
    }
  }, [blocks, stackName]);

  const generateFullContext = useCallback((): string => {
    // Always generate XML format for copy to clipboard
    return `<context>\n${blocks.map((block, index) => {
      const tagName = block.type === 'text' ? 'instruction' : 'context';
      const urlAttr = block.url ? ` source_url="${block.url}"` : '';
      const titleAttr = block.title ? ` title="${block.title}"` : '';
      return `  <${tagName}_${index + 1} type="${block.type}"${titleAttr}${urlAttr}>\n    ${block.content.replace(/\n/g, '\n    ')}\n  </${tagName}_${index + 1}>`;
    }).join('\n')}\n</context>`;
  }, [blocks]);

  const performAutoSave = useCallback(async () => {
    if (!isRemixMode || hasAutoSaved || blocks.length === 0) return;
    
    try {
      const contextStackData = {
        title: stackName.trim() || `Context Stack - ${new Date().toLocaleDateString()}`,
        blocks: blocks,
        content: generateFullContext()
      };
      
      const savedContext = await apiService.saveContextStack(contextStackData);
      setSavedContextSlug(savedContext.slug);
      setHasAutoSaved(true);
      setIsRemixMode(false);
      
      const permalink = apiService.getSEOPageUrl(savedContext.slug, true); // Context stacks always use true
      setAutoSaveNotification(`Automatically created new context: ${permalink}`);
      setTimeout(() => setAutoSaveNotification(''), 8000);
      
    } catch (error) {
      console.error('Error auto-saving context stack:', error);
    }
  }, [isRemixMode, hasAutoSaved, blocks, stackName, generateFullContext]);

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
      // Clear saved slug when blocks are reordered (for remix mode)
      setSavedContextSlug('');
      // Auto-save on first change if in remix mode
      performAutoSave();
    });
  }, [performAutoSave]);

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
      // Clear saved slug when blocks are modified (for remix mode)
      setSavedContextSlug('');
      // Auto-save on first change if in remix mode
      performAutoSave();
      
    } catch (error) {
      console.error('Error converting URL:', error);
      // Show error in UI instead of alert
      setNewBlockContent('');
      setIsAddingBlock(false);
    } finally {
      setIsConverting(false);
    }
  }, [blocks.length, performAutoSave]);

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
      // Clear saved slug when blocks are modified (for remix mode)
      setSavedContextSlug('');
      // Auto-save on first change if in remix mode
      performAutoSave();
    }
  }, [newBlockContent, newBlockType, blocks.length, addUrlBlock, performAutoSave]);

  const removeBlock = useCallback((blockId: string) => {
    requestAnimationFrame(() => {
      setBlocks(prev => prev.filter(block => block.id !== blockId).map((block, index) => ({
        ...block,
        order: index
      })));
      // Clear saved slug when blocks are modified (for remix mode)
      setSavedContextSlug('');
      // Auto-save on first change if in remix mode
      performAutoSave();
    });
  }, [performAutoSave]);

  const updateBlock = useCallback((blockId: string, updates: Partial<ContextBlock>) => {
    setBlocks(prev => prev.map(block => 
      block.id === blockId ? { ...block, ...updates } : block
    ));
    // Clear saved slug when blocks are modified (for remix mode)
    setSavedContextSlug('');
    // Auto-save on first change if in remix mode
    performAutoSave();
  }, [performAutoSave]);

  const duplicateBlock = useCallback((block: ContextBlock) => {
    const newBlock: ContextBlock = {
      ...block,
      id: `block-${Date.now()}-${Math.random()}`,
      order: blocks.length, // Add to end
      title: block.title ? `${block.title} (Copy)` : undefined
    };
    
    setBlocks(prev => [...prev, newBlock].map((b, index) => ({
      ...b,
      order: index
    })));
    // Clear saved slug when blocks are modified (for remix mode)
    setSavedContextSlug('');
    // Auto-save on first change if in remix mode
    performAutoSave();
  }, [blocks.length, performAutoSave]);

  const handleExport = useCallback(() => {
    if (onExport) {
      onExport(blocks, 'markdown');
    }
  }, [blocks, onExport]);


  const calculateTotalTokens = useCallback(() => {
    const fullContent = generateFullContext();
    return estimateTokenCount(fullContent);
  }, [generateFullContext]);



  // Consolidated Save & Get Link handler
  const handleSaveAndGetLink = useCallback(async () => {
    if (blocks.length === 0 || !stackName.trim()) return;

    let targetSlug = savedContextSlug;
    
    // If not already saved, save first
    if (!targetSlug) {
      setIsSavingForPermalink(true);
      try {
        const contextStackData = {
          title: stackName.trim(),
          blocks: blocks,
          content: generateFullContext()
        };
        
        const savedContext = await apiService.saveContextStack(contextStackData);
        targetSlug = savedContext.slug;
        setSavedContextSlug(targetSlug);
      } catch (error) {
        console.error('Error saving context stack:', error);
        return;
      } finally {
        setIsSavingForPermalink(false);
      }
    }
    
    // Copy permalink to clipboard
    if (targetSlug) {
      const permalink = apiService.getSEOPageUrl(targetSlug, true);
      try {
        await navigator.clipboard.writeText(permalink);
        setPermalinkCopied(true);
        setTimeout(() => setPermalinkCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy permalink:', error);
      }
    }
  }, [blocks, savedContextSlug, stackName, generateFullContext]);

  // Copy XML to clipboard handler  
  const handleCopyXML = useCallback(async () => {
    if (blocks.length === 0) return;
    
    const xmlContent = generateFullContext();
    try {
      await navigator.clipboard.writeText(xmlContent);
      setXmlCopied(true);
      setTimeout(() => setXmlCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy XML:', error);
    }
  }, [generateFullContext, blocks.length]);


  const handleClearAll = useCallback(() => {
    if (blocks.length === 0 && !stackName.trim()) return;
    
    if (window.confirm('Are you sure you want to clear all blocks and start over?')) {
      setBlocks([]);
      setStackName('');
      localStorage.removeItem('contextBuilderDraft');
    }
  }, [blocks.length, stackName]);

  const generatePreview = useCallback(() => {
    // Limit preview to first 2000 chars to improve performance
    const truncateForPreview = (text: string, maxLength = 2000) => {
      if (text.length <= maxLength) return text;
      return text.slice(0, maxLength) + '\n... (truncated for preview)';
    };

    // Always generate XML format for preview
    const xmlContent = `<context>\n${blocks.map((block, index) => {
      const tagName = block.type === 'text' ? 'instruction' : 'context';
      const urlAttr = block.url ? ` source_url="${block.url}"` : '';
      return `  <${tagName}_${index + 1} type="${block.type}"${block.title ? ` title="${block.title}"` : ''}${urlAttr}>\n    ${truncateForPreview(block.content, 500).replace(/\n/g, '\n    ')}\n  </${tagName}_${index + 1}>`;
    }).join('\n')}\n</context>`;
    return truncateForPreview(xmlContent);
  }, [blocks]);

  return (
    <div className={`max-w-4xl mx-auto p-6 ${className}`}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Context Builder</h2>
        <p className="text-gray-600 mb-3">
          Build your context by adding URLs and text blocks. Drag to reorder them.
        </p>
        
        {/* Import notification */}
        {importNotification && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="text-sm text-green-800 flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{importNotification}</span>
            </div>
          </div>
        )}
        
        {/* Remix notification */}
        {isRemixMode && initialStackName && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
            <div className="text-sm text-purple-800 flex items-center space-x-2">
              <Layers className="w-4 h-4" />
              <span><strong>Remixing:</strong> {initialStackName.replace(' (Remix -', ' -')} - Your first change will automatically create a new context</span>
            </div>
          </div>
        )}
        
        {/* Auto-save notification */}
        {autoSaveNotification && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="text-sm text-green-800 flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>{autoSaveNotification}</span>
            </div>
          </div>
        )}
        
        {/* Loading state for remix */}
        {isLoading && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              <span className="text-sm text-gray-700">Loading context for remix...</span>
            </div>
          </div>
        )}
        
        {/* Check for available batch import */}
        {typeof window !== 'undefined' && localStorage.getItem('batchImport') && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-blue-800">
                <strong>Conversions ready to import!</strong> You have {JSON.parse(localStorage.getItem('batchImport') || '[]').length} converted URL{JSON.parse(localStorage.getItem('batchImport') || '[]').length > 1 ? 's' : ''} waiting to be added.
              </div>
              <button
                onClick={() => {
                  checkForBatchImport();
                }}
                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Import Now
              </button>
            </div>
          </div>
        )}
        
        <div className="text-sm text-gray-500">
          <strong>Pro tip:</strong> Use the &quot;Add Context&quot; tab to convert individual URLs or batch convert multiple URLs, then export them here for organization and further editing.
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
          
          <div className="flex gap-3 flex-wrap">
            {/* Primary: Save & Get Link */}
            <button
              onClick={handleSaveAndGetLink}
              disabled={!stackName.trim() || blocks.length === 0 || isSavingForPermalink}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              {isSavingForPermalink ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <span>Saving...</span>
                </>
              ) : permalinkCopied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  <span>Link Copied!</span>
                </>
              ) : savedContextSlug ? (
                <>
                  <Link2 className="w-4 h-4 mr-2" />
                  <span>Copy Link</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  <span>Save & Get Link</span>
                </>
              )}
            </button>

            {/* Secondary: Copy XML */}
            <button
              onClick={handleCopyXML}
              disabled={blocks.length === 0}
              className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-50 disabled:cursor-not-allowed"
            >
              {xmlCopied ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-green-600" />
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  <span>Copy XML</span>
                </>
              )}
            </button>

            {/* Tertiary: More Actions Dropdown */}
            {blocks.length > 0 && (
              <Menu as="div" className="relative inline-block text-left">
                <Menu.Button
                  disabled={blocks.length === 0}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-50 disabled:cursor-not-allowed"
                >
                  <MoreVertical className="w-4 h-4" />
                </Menu.Button>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={handleExport}
                            className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                          >
                            <Download className="w-4 h-4 mr-3" />
                            Export Markdown
                          </button>
                        )}
                      </Menu.Item>
                      
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={async () => {
                              const chatGPTUrl = apiService.generateChatGPTLink(savedContextSlug || 'temp', true);
                              window.open(chatGPTUrl, '_blank');
                            }}
                            disabled={!savedContextSlug}
                            className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700 disabled:text-gray-400`}
                          >
                            <ExternalLink className="w-4 h-4 mr-3" />
                            Send to ChatGPT
                          </button>
                        )}
                      </Menu.Item>
                      
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={async () => {
                              const claudeUrl = apiService.generateClaudeLink(savedContextSlug || 'temp', true);
                              window.open(claudeUrl, '_blank');
                            }}
                            disabled={!savedContextSlug}
                            className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700 disabled:text-gray-400`}
                          >
                            <ExternalLink className="w-4 h-4 mr-3" />
                            Send to Claude
                          </button>
                        )}
                      </Menu.Item>
                      
                      <div className="border-t border-gray-100"></div>
                      
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={handleClearAll}
                            className={`${active ? 'bg-red-50 text-red-600' : 'text-red-600'} flex items-center w-full px-4 py-2 text-sm`}
                          >
                            <Trash2 className="w-4 h-4 mr-3" />
                            Clear All
                          </button>
                        )}
                      </Menu.Item>
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
            )}
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
                  onDuplicate={duplicateBlock}
                />
                <DropZone index={index + 1} onDrop={handleDragEnd} />
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Token Count Summary */}
      {blocks.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">Context Usage</h4>
              <p className="text-sm text-blue-700">
                Total: <span className="font-semibold">{formatTokenCount(calculateTotalTokens())}</span>
                {(() => {
                  const usage = getContextUsage(calculateTotalTokens());
                  return (
                    <span className="ml-2 text-xs">
                      ({usage.usagePercentage}% of GPT-4 context)
                    </span>
                  );
                })()}
              </p>
            </div>
            <div className="text-xs text-blue-600">
              <div>{blocks.length} block{blocks.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      {blocks.length > 0 && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Preview (XML)
          </h3>
          <pre className="bg-white border rounded p-4 text-sm overflow-auto max-h-96 whitespace-pre-wrap mb-4">
            {generatePreview()}
          </pre>
          
        </div>
      )}
    </div>
  );
};

export default ContextBuilder;