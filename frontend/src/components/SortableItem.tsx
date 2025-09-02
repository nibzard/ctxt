import React, { useState } from 'react';
import {
  useSortable,
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import { 
  GripVertical, 
  X, 
  Edit2,
  Check,
  Link,
  FileText 
} from 'lucide-react';

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
  onUpdate: (blockId: string, updates: Partial<ContextBlock>) => void;
  onRemove: (blockId: string) => void;
}

export const SortableItem: React.FC<SortableItemProps> = ({
  id,
  block,
  onUpdate,
  onRemove,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(block.content);
  const [editTitle, setEditTitle] = useState(block.title || '');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({id});

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    onUpdate(id, {
      content: editContent,
      title: block.type === 'url' ? editTitle : undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(block.content);
    setEditTitle(block.title || '');
    setIsEditing(false);
  };

  const truncateContent = (content: string, maxLength = 150) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <button
          className="mt-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
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
              onClick={() => setIsEditing(true)}
              className="p-1 text-gray-400 hover:text-blue-600 rounded"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onRemove(id)}
              className="p-1 text-gray-400 hover:text-red-600 rounded"
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