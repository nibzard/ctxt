import React, { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers';
import { SortableItem } from './SortableItem';
import { Plus, Share, Save } from 'lucide-react';

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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over?.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        // Update order property
        return newItems.map((item, index) => ({ ...item, order: index }));
      });
    }
  }, []);

  const addBlock = useCallback(() => {
    if (!newBlockContent.trim()) return;

    const newBlock: ContextBlock = {
      id: `block-${Date.now()}`,
      type: newBlockType,
      content: newBlockContent,
      order: blocks.length,
    };

    if (newBlockType === 'url') {
      newBlock.url = newBlockContent;
      // Extract domain as title for now - would normally fetch from API
      try {
        const url = new URL(newBlockContent);
        newBlock.title = url.hostname;
      } catch {
        newBlock.title = 'Invalid URL';
      }
    }

    setBlocks(prev => [...prev, newBlock]);
    setNewBlockContent('');
    setIsAddingBlock(false);
  }, [newBlockContent, newBlockType, blocks.length]);

  const removeBlock = useCallback((blockId: string) => {
    setBlocks(prev => prev.filter(block => block.id !== blockId).map((block, index) => ({
      ...block,
      order: index
    })));
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
    const content = blocks.map(block => {
      if (block.type === 'url') {
        return `${block.title || 'Untitled'}\n${block.url}\n---\n${block.content}`;
      }
      return block.content;
    }).join('\n\n---\n\n');

    if (exportFormat === 'xml') {
      return `<context>\n${blocks.map((block, index) => 
        `  <source_${index + 1} type="${block.type}"${block.url ? ` url="${block.url}"` : ''}>\n    ${block.content.replace(/\n/g, '\n    ')}\n  </source_${index + 1}>`
      ).join('\n')}\n</context>`;
    } else if (exportFormat === 'json') {
      return JSON.stringify({ blocks }, null, 2);
    }
    
    return content; // markdown format
  }, [blocks, exportFormat]);

  return (
    <div className={`max-w-4xl mx-auto p-6 ${className}`}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Context Builder</h2>
        <p className="text-gray-600">
          Build your context by adding URLs and text blocks. Drag to reorder them.
        </p>
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
          
          <div className="flex gap-2">
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
              <Share className="w-4 h-4 mr-2" />
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
                disabled={!newBlockContent.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add Block
              </button>
              <button
                onClick={() => {
                  setIsAddingBlock(false);
                  setNewBlockContent('');
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
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
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          >
            <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {blocks.map((block) => (
                  <SortableItem
                    key={block.id}
                    id={block.id}
                    block={block}
                    onUpdate={updateBlock}
                    onRemove={removeBlock}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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