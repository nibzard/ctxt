// ABOUTME: Utility functions for parsing and reconstructing context blocks from saved content
// ABOUTME: Handles conversion between ContextBlock arrays and the unified content format used for storage

interface ContextBlock {
  id: string;
  type: 'url' | 'text';
  title?: string;
  content: string;
  url?: string;
  order: number;
}

/**
 * Parse context blocks from unified content string
 * Reconstructs the original ContextBlock array from the format saved by saveContextStack
 */
export function parseContextBlocksFromContent(content: string): ContextBlock[] {
  const blocks: ContextBlock[] = [];
  
  // Split content by the separator used between blocks
  const sections = content.split('\n\n---\n\n');
  
  sections.forEach((section, index) => {
    const trimmedSection = section.trim();
    if (!trimmedSection) return;
    
    // Check if this is a URL block (starts with # title and has "Source:" line)
    // URL blocks are formatted as: # Title\n\nSource: URL\n\n[content]
    const urlBlockMatch = trimmedSection.match(/^# (.+?)\n\nSource: (.+?)\n\n([\s\S]+)$/);
    
    if (urlBlockMatch) {
      // This is a URL block
      const [, title, url, blockContent] = urlBlockMatch;
      blocks.push({
        id: `block-${Date.now()}-${index}-${Math.random()}`,
        type: 'url',
        title: title.trim(),
        url: url.trim(),
        content: blockContent.trim(),
        order: index
      });
    } else {
      // This is a text block
      blocks.push({
        id: `block-${Date.now()}-${index}-${Math.random()}`,
        type: 'text',
        content: trimmedSection,
        order: index
      });
    }
  });
  
  return blocks;
}

/**
 * Check if a conversion is a context stack
 */
export function isContextStack(conversion: { source_url: string }): boolean {
  return conversion.source_url === 'context://stack';
}

/**
 * Generate a remix title for a context stack
 */
export function generateRemixTitle(originalTitle: string): string {
  const now = new Date();
  const timestamp = now.toLocaleDateString();
  return `${originalTitle} (Remix - ${timestamp})`;
}