// ABOUTME: Individual sortable item component for context blocks
// ABOUTME: Uses Pragmatic Drag and Drop for drag-and-drop reordering functionality

'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { 
  GripVertical, 
  X, 
  Edit2,
  Check,
  Link,
  FileText,
  Files
} from 'lucide-react';
import { estimateTokenCount, formatTokenCount } from '@/utils/tokenCount';

interface ContextBlock {
  id: string;
  type: 'url' | 'text';
  title?: string;
  content: string;
  url?: string;
  order: number;
}

interface SortableItemProps {
  id: string;
  block: ContextBlock;
  index: number;
  onUpdate: (blockId: string, updates: Partial<ContextBlock>) => void;
  onRemove: (blockId: string) => void;
  onMove: (sourceIndex: number, targetIndex: number) => void;
  onDuplicate: (block: ContextBlock) => void;
}

const SortableItemComponent: React.FC<SortableItemProps> = ({
  id,
  block,
  index,
  onUpdate,
  onRemove,
  onMove,
  onDuplicate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(block.content);
  const [editTitle, setEditTitle] = useState(block.title || '');
  const [isDragging, setIsDragging] = useState(false);
  const [isOver, setIsOver] = useState(false);

  const elementRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    const dragHandle = dragHandleRef.current;
    
    if (!element || !dragHandle) return;

    return combine(
      draggable({
        element: dragHandle,
        getInitialData: () => ({ id, index, type: 'context-block' }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element,
        canDrop: ({ source }) => source.data.type === 'context-block',
        onDragEnter: () => setIsOver(true),
        onDragLeave: () => setIsOver(false),
        onDrop: ({ source }) => {
          setIsOver(false);
          const sourceIndex = source.data.index as number;
          if (sourceIndex !== index) {
            onMove(sourceIndex, index);
          }
        },
      })
    );
  }, [id, index, onMove]);

  const handleSave = useCallback(() => {
    onUpdate(id, {
      content: editContent,
      title: block.type === 'url' ? editTitle : undefined,
    });
    setIsEditing(false);
  }, [id, editContent, editTitle, block.type, onUpdate]);

  const handleCancel = useCallback(() => {
    setEditContent(block.content);
    setEditTitle(block.title || '');
    setIsEditing(false);
  }, [block.content, block.title]);

  const handleRemove = useCallback(() => {
    onRemove(id);
  }, [id, onRemove]);

  const handleDuplicate = useCallback(() => {
    onDuplicate(block);
  }, [block, onDuplicate]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const truncateContent = useCallback((content: string, maxLength = 150) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  }, []);

  return (
    <div
      ref={elementRef}
      className={`bg-white border rounded-lg p-4 shadow-sm transition-all duration-200 ${
        isDragging 
          ? 'opacity-40 scale-95 shadow-lg border-blue-300 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      } ${
        isOver 
          ? 'border-blue-500 shadow-lg bg-blue-50 scale-[1.02] ring-2 ring-blue-200' 
          : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <button
          ref={dragHandleRef}
          className={`mt-1 p-1 rounded transition-colors ${
            isDragging 
              ? 'text-blue-600 bg-blue-100' 
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          } cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-blue-500`}
          title="Drag to reorder"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        {/* Content Type Icon */}
        <div className="mt-1 flex-shrink-0">
          {block.type === 'url' ? (
            <Link className="w-5 h-5 text-blue-500" />
          ) : (
            <FileText className="w-5 h-5 text-green-500" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-3">
              {block.type === 'url' && (
                <input
                  type="text"
                  placeholder="Title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
              
              {block.type === 'url' ? (
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <textarea
                  placeholder="Enter your text content..."
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
              
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="inline-flex items-center px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Title */}
              {block.title && (
                <div className="font-medium text-gray-900 mb-1">
                  {block.title}
                </div>
              )}
              
              {/* Content Preview */}
              <div className="text-sm text-gray-600 mb-2">
                {block.type === 'url' ? (
                  <div className="font-mono text-blue-600 break-all">
                    {block.url || block.content}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">
                    {truncateContent(block.content)}
                  </div>
                )}
              </div>
              
              {/* Metadata */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="capitalize">{block.type} Block</span>
                <span>Order: {block.order + 1}</span>
                <span className="font-medium text-blue-600">
                  {formatTokenCount(estimateTokenCount(block.content))}
                </span>
                {block.type === 'text' && (
                  <span>{block.content.length} characters</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!isEditing && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleEdit}
              className="p-1 text-gray-400 hover:text-blue-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDuplicate}
              className="p-1 text-gray-400 hover:text-purple-600 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              title="Duplicate"
            >
              <Files className="w-4 h-4" />
            </button>
            <button
              onClick={handleRemove}
              className="p-1 text-gray-400 hover:text-red-600 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              title="Remove"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const SortableItem = memo(SortableItemComponent, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.index === nextProps.index &&
    prevProps.block.content === nextProps.block.content &&
    prevProps.block.title === nextProps.block.title &&
    prevProps.block.order === nextProps.block.order
  );
});