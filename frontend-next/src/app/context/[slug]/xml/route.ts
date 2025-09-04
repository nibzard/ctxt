// ABOUTME: Route handler for serving XML versions of context stack pages
// ABOUTME: Only serves XML for context stacks, returns 404 for single page conversions

import { NextRequest, NextResponse } from 'next/server';
import { Conversion } from '@/types/api';
import { parseContextBlocksFromContent, isContextStack } from '@/utils/contextParser';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  
  // Fetch conversion data from FastAPI backend
  const conversion = await getConversion(slug);
  
  if (!conversion) {
    // Return a helpful XML response for 404
    const notFoundXml = `<?xml version="1.0" encoding="UTF-8"?>
<error>
  <message>Context Stack Not Found</message>
  <slug>${slug}</slug>
  <description>The requested context stack could not be found. This could happen if the link is incorrect or expired, the backend service is temporarily unavailable, or the content was removed.</description>
  <powered_by>ctxt.help - The LLM Context Builder</powered_by>
  <homepage>https://ctxt.help</homepage>
</error>`;

    return new NextResponse(notFoundXml, {
      status: 404,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  }

  // Ensure this is a context stack - redirect single pages to markdown
  if (!isContextStack(conversion)) {
    const notContextXml = `<?xml version="1.0" encoding="UTF-8"?>
<error>
  <message>XML view is only available for Context Stacks</message>
  <slug>${slug}</slug>
  <description>This conversion is a single page, not a context stack. XML view is designed for multi-block context stacks.</description>
  <alternatives>
    <markdown>https://ctxt.help/page/${slug}.md</markdown>
    <html>https://ctxt.help/page/${slug}</html>
  </alternatives>
  <powered_by>ctxt.help - The LLM Context Builder</powered_by>
</error>`;

    return new NextResponse(notContextXml, {
      status: 400,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  }

  // Increment view count via API (fire-and-forget)
  incrementViewCount(slug).catch(() => {
    // Silently handle errors - view counting is not critical
  });

  // Generate XML content for context stack
  const xmlContent = formatXmlContent(conversion, true);
  
  return new NextResponse(xmlContent, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Robots-Tag': 'index, follow',
      'X-Content-Type': 'xml',
    },
  });
}

async function getConversion(slug: string): Promise<Conversion | null> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/conversions/slug/${slug}`, {
      cache: 'force-cache',
      next: { revalidate: 3600 }, // Revalidate every hour
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Conversion not found: ${slug}`);
      } else {
        console.warn(`Failed to fetch conversion with status: ${response.status}`);
      }
      return null;
    }
    
    return await response.json();
  } catch (error: unknown) {
    // Only log non-connection errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : '';
    if (errorName !== 'AbortError' && !errorMessage.includes('ECONNREFUSED')) {
      console.warn('Failed to fetch conversion:', errorMessage);
    }
    return null;
  }
}

async function incrementViewCount(slug: string): Promise<void> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/conversions/slug/${slug}/view`, {
      method: 'POST',
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    if (!response.ok) {
      console.warn(`View count increment failed with status: ${response.status}`);
    }
  } catch (error: unknown) {
    // Only log if it's not a connection refused error (backend down)
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : '';
    if (errorName !== 'AbortError' && !errorMessage.includes('ECONNREFUSED')) {
      console.warn('View count increment failed:', errorMessage);
    }
    // Silent fail for connection errors - backend may be temporarily down
  }
}

function formatXmlContent(conversion: Conversion, isExplicitRequest: boolean = false): string {
  const viewAsHtmlLink = isExplicitRequest ? 
    `    <view_as_html>https://ctxt.help/context/${conversion.slug}</view_as_html>\n    <view_as_markdown>https://ctxt.help/context/${conversion.slug}.md</view_as_markdown>\n` : '';
  
  // Parse the context blocks from the content
  const blocks = parseContextBlocksFromContent(conversion.content);
  
  // Generate XML blocks
  const xmlBlocks = blocks.map((block, index) => {
    const tagName = block.type === 'text' ? 'instruction' : 'context';
    const urlAttr = block.url ? ` source_url="${escapeXml(block.url)}"` : '';
    const titleAttr = block.title ? ` title="${escapeXml(block.title)}"` : '';
    
    return `  <${tagName}_${index + 1} type="${block.type}"${titleAttr}${urlAttr}>
    ${escapeXml(block.content).replace(/\n/g, '\n    ')}
  </${tagName}_${index + 1}>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Context Stack: ${conversion.title} -->
<!-- Generated by ctxt.help - The LLM Context Builder -->
<context>
  <metadata>
    <title>${escapeXml(conversion.title)}</title>
    <slug>${conversion.slug}</slug>
    <created_at>${conversion.created_at}</created_at>
    <block_count>${blocks.length}</block_count>
    <word_count>${conversion.word_count}</word_count>
    ${viewAsHtmlLink}    <powered_by>ctxt.help - The LLM Context Builder</powered_by>
    <permanent_link>https://ctxt.help/context/${conversion.slug}</permanent_link>
  </metadata>
${xmlBlocks}
</context>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}