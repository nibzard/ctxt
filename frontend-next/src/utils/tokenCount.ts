// ABOUTME: Frontend token counting utilities for estimating LLM context usage
// ABOUTME: Provides approximate token counts without requiring server-side tiktoken

/**
 * Estimates token count for text content
 * This is an approximation since we don't have tiktoken in the browser
 * Based on the average of ~4 characters per token for English text
 */
export function estimateTokenCount(text: string): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  // More accurate estimation based on OpenAI's guidelines
  // - Remove excessive whitespace
  // - Account for punctuation and special characters
  // - Use 3.5-4.5 characters per token as average
  
  const cleanText = text.trim().replace(/\s+/g, ' ');
  const charCount = cleanText.length;
  
  // Use 4 characters per token as baseline
  // Adjust based on content characteristics
  let tokensPerChar = 0.25; // 1 token per 4 characters
  
  // Text with lots of code/punctuation has fewer chars per token
  const specialCharRatio = (cleanText.match(/[^\w\s]/g) || []).length / charCount;
  if (specialCharRatio > 0.2) {
    tokensPerChar = 0.3; // More tokens for special chars
  }
  
  // Text with lots of spaces has more chars per token
  const spaceRatio = (cleanText.match(/\s/g) || []).length / charCount;
  if (spaceRatio > 0.15) {
    tokensPerChar = 0.2; // Fewer tokens for space-heavy text
  }
  
  return Math.max(1, Math.round(charCount * tokensPerChar));
}

/**
 * Format token count for display
 */
export function formatTokenCount(tokenCount: number): string {
  if (tokenCount < 1000) {
    return `${tokenCount} tokens`;
  } else if (tokenCount < 1000000) {
    return `${(tokenCount / 1000).toFixed(1)}K tokens`;
  } else {
    return `${(tokenCount / 1000000).toFixed(1)}M tokens`;
  }
}

/**
 * Get context usage information for common models
 */
export function getContextUsage(tokenCount: number, model: string = 'gpt-4'): {
  tokenCount: number;
  model: string;
  contextLimit: number;
  usagePercentage: number;
  remainingTokens: number;
  canFit: boolean;
  warningLevel: 'low' | 'medium' | 'high' | 'critical';
} {
  // Common model context limits
  const contextLimits: Record<string, number> = {
    'gpt-4': 8192,
    'gpt-4-32k': 32768,
    'gpt-4-turbo': 128000,
    'gpt-3.5-turbo': 4096,
    'gpt-3.5-turbo-16k': 16384,
    'claude-3-sonnet': 200000,
    'claude-3-opus': 200000,
    'claude-3-haiku': 200000,
    'claude-3.5-sonnet': 200000,
  };

  const limit = contextLimits[model] || contextLimits['gpt-4'];
  const usagePercentage = (tokenCount / limit) * 100;
  const remainingTokens = Math.max(0, limit - tokenCount);
  const canFit = tokenCount <= limit;

  let warningLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (usagePercentage >= 95) {
    warningLevel = 'critical';
  } else if (usagePercentage >= 80) {
    warningLevel = 'high';
  } else if (usagePercentage >= 60) {
    warningLevel = 'medium';
  }

  return {
    tokenCount,
    model,
    contextLimit: limit,
    usagePercentage: Math.round(usagePercentage * 10) / 10,
    remainingTokens,
    canFit,
    warningLevel,
  };
}

/**
 * Get CSS classes for token count display based on usage level
 */
export function getTokenCountClasses(usagePercentage: number): string {
  if (usagePercentage >= 95) {
    return 'text-red-600 font-semibold';
  } else if (usagePercentage >= 80) {
    return 'text-orange-600 font-medium';
  } else if (usagePercentage >= 60) {
    return 'text-yellow-600';
  } else {
    return 'text-gray-600';
  }
}