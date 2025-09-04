// ABOUTME: Route handler for serving markdown versions of conversion pages
// ABOUTME: Provides explicit markdown endpoint for user access

import { NextRequest, NextResponse } from 'next/server';
import { Conversion } from '@/types/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  
  // Fetch conversion data from FastAPI backend
  const conversion = await getConversion(slug);
  
  if (!conversion) {
    // Return a helpful markdown response for 404
    const notFoundMarkdown = `# Conversion Not Found

The requested conversion \`${slug}\` could not be found.

This could happen if:
- The link is incorrect or expired
- The backend service is temporarily unavailable
- The content was removed

Please check the URL or try again later.

---
*Powered by ctxt.help - The LLM Context Builder*
*Return to homepage: https://ctxt.help*`;

    return new NextResponse(notFoundMarkdown, {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  }

  // Increment view count via API (fire-and-forget)
  incrementViewCount(slug).catch(() => {
    // Silently handle errors - view counting is not critical
  });

  // Generate markdown content
  const markdownContent = formatMarkdownContent(conversion, true);
  
  return new NextResponse(markdownContent, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Robots-Tag': 'index, follow',
      'X-Content-Type': 'markdown',
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

function formatMarkdownContent(conversion: Conversion, isExplicitRequest: boolean = false): string {
  const viewAsHtmlLink = isExplicitRequest ? 
    `*View as HTML: https://ctxt.help/read/${conversion.slug}*\n` : '';
  
  return `# ${conversion.title}

**Source:** ${conversion.source_url}
**Domain:** ${conversion.domain}
**Published:** ${new Date(conversion.created_at).toISOString().split('T')[0]}
**Word Count:** ${conversion.word_count}
**Reading Time:** ${Math.max(1, Math.floor(conversion.word_count / 200))} minutes

---

${conversion.content}

---
*Converted by ctxt.help - The LLM Context Builder*
*Permanent link: https://ctxt.help/read/${conversion.slug}*
${viewAsHtmlLink}`;
}