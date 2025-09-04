// ABOUTME: SSR page component for serving single page conversions with SEO optimization
// ABOUTME: Handles bot detection and serves markdown vs HTML based on user agent

import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { botDetector } from '@/lib/bot-detection';
import { Conversion } from '@/types/api';
import { isContextStack } from '@/utils/contextParser';

interface PageConversionProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PageConversion({ params, searchParams }: PageConversionProps) {
  const { slug } = await params;
  const search = await searchParams || {};
  
  // Fetch conversion data from FastAPI backend
  const conversion = await getConversion(slug);
  
  if (!conversion) {
    notFound();
  }

  // Ensure this is a single page conversion, not a context stack
  if (isContextStack(conversion)) {
    // Redirect context stacks to the /context/ route
    redirect(`/context/${slug}`);
  }

  // Check backend health and increment view count
  const backendHealthy = await checkBackendHealth();
  if (backendHealthy) {
    incrementViewCount(slug).catch(() => {
      // Silently handle errors - view counting is not critical for page functionality
    });
  }

  // Get user agent and accept header
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';
  const acceptHeader = headersList.get('accept') || '';

  // Check if user explicitly requested markdown
  const formatParam = search.format;
  const requestsMarkdown = formatParam === 'markdown' || 
                          acceptHeader.includes('text/plain') || 
                          acceptHeader.includes('text/markdown');

  // Determine if this is a bot request or explicit markdown request
  const shouldServeMarkdown = requestsMarkdown || botDetector.shouldServeMarkdown(userAgent);

  // Log bot access for monitoring
  botDetector.logBotAccess(userAgent, slug, shouldServeMarkdown);

  // Redirect to markdown route if explicitly requested
  if (requestsMarkdown) {
    redirect(`/page/${slug}.md`);
  }
  
  // For bots, we'll handle them differently - they should get the .md route too
  if (botDetector.shouldServeMarkdown(userAgent)) {
    redirect(`/page/${slug}.md`);
  }

  // Serve HTML for humans
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Backend status banner */}
      {!backendHealthy && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-3">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-2">
                <p className="text-sm text-amber-700">
                  Some features may be temporarily unavailable. Content is served from cache.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="text-2xl font-bold text-blue-600">ctxt.help</a>
            <div className="text-sm text-gray-600">
              <span>{conversion.view_count + 1} views</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <article className="bg-white rounded-lg shadow-sm p-8">
          <header className="mb-8 pb-6 border-b border-gray-200">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{conversion.title}</h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
              <span>📅 {new Date(conversion.created_at).toLocaleDateString()}</span>
              <span>🌐 <a href={conversion.source_url} className="text-blue-600 hover:underline" target="_blank" rel="noopener">{conversion.domain}</a></span>
              <span>📖 {conversion.word_count} words</span>
              <span>⏱️ {Math.max(1, Math.floor(conversion.word_count / 200))} min read</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <a href={conversion.source_url} 
                 className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs hover:bg-blue-200 transition-colors"
                 target="_blank" rel="noopener">
                🔗 View Original
              </a>
              
              <a href={`/page/${conversion.slug}.md`}
                 className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs hover:bg-gray-200 transition-colors">
                📄 View as Markdown
              </a>
            </div>
          </header>

          <div className="prose prose-lg max-w-none">
            <div dangerouslySetInnerHTML={{ __html: formatHtmlContent(conversion.content) }} />
          </div>
          
          <footer className="mt-12 pt-8 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              <p>This content was converted from <a href={conversion.source_url} className="text-blue-600 hover:underline" target="_blank" rel="noopener">{conversion.source_url}</a> using <a href="/" className="text-blue-600 hover:underline">ctxt.help</a> - The LLM Context Builder.</p>
              <p className="mt-2">Permanent link: <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">https://ctxt.help/page/{conversion.slug}</span></p>
            </div>
          </footer>
        </article>
        
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white text-center">
          <h3 className="text-xl font-bold mb-2">Convert Your Own URLs</h3>
          <p className="mb-4">Transform any webpage into clean markdown perfect for AI and LLM contexts</p>
          <a href="/" className="inline-block bg-white text-blue-600 font-semibold px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            Try ctxt.help Free
          </a>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center text-sm text-gray-600">
            <p>&copy; 2025 ctxt.help - The LLM Context Builder</p>
            <div className="mt-2 space-x-4">
              <a href="/" className="hover:text-blue-600">Home</a>
              <a href="/about" className="hover:text-blue-600">About</a>
              <a href="/privacy" className="hover:text-blue-600">Privacy</a>
              <a href="/terms" className="hover:text-blue-600">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
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

async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/health`, {
      cache: 'no-cache',
      signal: AbortSignal.timeout(3000), // Quick 3 second check
    });
    return response.ok;
  } catch {
    // Backend is unavailable
    return false;
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
      // Log only non-connection errors
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

function formatHtmlContent(content: string): string {
  // Simple markdown to HTML conversion
  let html = content;
  
  // Convert headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Convert bold and italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Convert links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener">$1</a>');
  
  // Convert line breaks to paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = `<p>${html}</p>`;
  
  return html;
}

export async function generateMetadata({ params }: PageConversionProps) {
  const { slug } = await params;
  const conversion = await getConversion(slug);
  
  if (!conversion) {
    return {
      title: 'Page Not Found | ctxt.help',
    };
  }

  const metaDescription = conversion.meta_description || conversion.content.substring(0, 155) + '...';
  
  return {
    title: `${conversion.title} | ctxt.help`,
    description: metaDescription,
    openGraph: {
      title: conversion.title,
      description: metaDescription,
      url: `https://ctxt.help/page/${conversion.slug}`,
      type: 'article',
      publishedTime: conversion.created_at,
      authors: ['ctxt.help'],
    },
    twitter: {
      card: 'summary_large_image',
      title: conversion.title,
      description: metaDescription,
    },
    canonical: `https://ctxt.help/page/${conversion.slug}`,
  };
}