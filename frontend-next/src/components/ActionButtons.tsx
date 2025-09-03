// ABOUTME: Reusable action buttons component for Copy, ChatGPT, Claude, and Context Builder actions
// ABOUTME: Provides consistent behavior across single conversions and context stacks using permalink approach

'use client';

import React from 'react';
import { Copy, ExternalLink, Check, Layers } from 'lucide-react';
import { apiService } from '@/services/api';
import { useClipboard } from '@/hooks';

interface ContextBlock {
  id: string;
  type: 'url' | 'text';
  title?: string;
  content: string;
  url?: string;
  order: number;
}

interface ActionButtonsProps {
  // For single conversions
  slug?: string;
  content?: string;
  
  // For context builder
  contextBlocks?: ContextBlock[];
  contextContent?: string;
  
  // Optional handlers
  onAddToContext?: () => void;
  onContextSaved?: (slug: string) => void;
  
  // UI state
  isLoading?: boolean;
  className?: string;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  slug,
  content,
  contextBlocks,
  contextContent,
  onAddToContext,
  onContextSaved,
  isLoading = false,
  className = ''
}) => {
  const { copy, copied } = useClipboard();
  const [isSavingContext, setIsSavingContext] = React.useState(false);
  const [contextSlug, setContextSlug] = React.useState<string | undefined>(undefined);

  // Determine the content to copy
  const copyableContent = contextContent || content || '';
  
  // Determine if we need to save context to get a slug for sharing
  const needsContextSave = contextBlocks && contextBlocks.length > 0 && !contextSlug && !slug;
  const shareSlug = contextSlug || slug;

  const handleCopyToClipboard = () => {
    if (copyableContent) {
      copy(copyableContent);
    }
  };

  const saveContextStack = async (): Promise<string | undefined> => {
    if (!contextBlocks || contextBlocks.length === 0) return undefined;

    setIsSavingContext(true);
    try {
      // Save the context stack to get a permalink
      const contextStackData = {
        title: `Context Stack - ${new Date().toLocaleDateString()}`,
        blocks: contextBlocks,
        content: contextContent || ''
      };
      
      // Note: This assumes we'll add a context stack endpoint to the API
      const savedContext = await apiService.saveContextStack(contextStackData);
      const newSlug = savedContext.slug;
      setContextSlug(newSlug);
      
      if (onContextSaved) {
        onContextSaved(newSlug);
      }
      
      return newSlug;
    } catch (error) {
      console.error('Error saving context stack:', error);
      return undefined;
    } finally {
      setIsSavingContext(false);
    }
  };

  const openInChatGPT = async () => {
    let targetSlug = shareSlug;
    
    if (needsContextSave) {
      targetSlug = await saveContextStack();
    }
    
    if (targetSlug) {
      const chatGPTUrl = apiService.generateChatGPTLink(targetSlug);
      window.open(chatGPTUrl, '_blank');
    }
  };

  const openInClaude = async () => {
    let targetSlug = shareSlug;
    
    if (needsContextSave) {
      targetSlug = await saveContextStack();
    }
    
    if (targetSlug) {
      const claudeUrl = apiService.generateClaudeLink(targetSlug);
      window.open(claudeUrl, '_blank');
    }
  };

  const isSharingDisabled = isLoading || isSavingContext || (!shareSlug && !contextBlocks);

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {/* Copy Markdown Button */}
      <button
        onClick={handleCopyToClipboard}
        disabled={!copyableContent || isLoading}
        className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed rounded-lg transition-colors"
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

      {/* Send to ChatGPT Button */}
      <button
        onClick={openInChatGPT}
        disabled={isSharingDisabled}
        className="flex items-center space-x-2 px-4 py-2 bg-green-100 hover:bg-green-200 disabled:bg-gray-50 disabled:cursor-not-allowed rounded-lg transition-colors"
      >
        {isSavingContext ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
            <span>Saving...</span>
          </>
        ) : (
          <>
            <ExternalLink className="w-4 h-4" />
            <span>Send to ChatGPT</span>
          </>
        )}
      </button>

      {/* Send to Claude Button */}
      <button
        onClick={openInClaude}
        disabled={isSharingDisabled}
        className="flex items-center space-x-2 px-4 py-2 bg-orange-100 hover:bg-orange-200 disabled:bg-gray-50 disabled:cursor-not-allowed rounded-lg transition-colors"
      >
        {isSavingContext ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
            <span>Saving...</span>
          </>
        ) : (
          <>
            <ExternalLink className="w-4 h-4" />
            <span>Send to Claude</span>
          </>
        )}
      </button>

      {/* Add to Context Builder Button (only for single conversions) */}
      {onAddToContext && (
        <button
          onClick={onAddToContext}
          disabled={isLoading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 disabled:bg-gray-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <Layers className="w-4 h-4" />
          <span>Add to Context Builder</span>
        </button>
      )}
    </div>
  );
};

export default ActionButtons;