// ABOUTME: SSR page component for serving SEO-optimized conversion pages
// ABOUTME: Handles bot detection and serves markdown vs HTML based on user agent

import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { botDetector } from '@/lib/bot-detection';
import { Conversion } from '@/types/api';

interface ConversionPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ConversionPage({ params }: ConversionPageProps) {
  const { slug } = await params;
  
  // Fetch conversion data from FastAPI backend
  const conversion = await getConversion(slug);
  
  if (!conversion) {
    notFound();
  }

  // Increment view count via API
  await incrementViewCount(slug);

  // Get user agent from headers
  const headersList = headers();
  const userAgent = headersList.get('user-agent') || '';

  // Determine if this is a bot request
  const shouldServeMarkdown = botDetector.shouldServeMarkdown(userAgent);

  // Log bot access for monitoring
  botDetector.logBotAccess(userAgent, slug, shouldServeMarkdown);

  if (shouldServeMarkdown) {
    // Return plain text response for bots
    const markdownContent = formatMarkdownContent(conversion);
    
    return new Response(markdownContent, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'X-Robots-Tag': 'index, follow',
        'X-Content-Type': 'markdown',
      },
    });
  }

  // Serve HTML for humans
  return (
    <div className="min-h-screen bg-gray-50">
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
            </div>
          </header>

          <div className="prose prose-lg max-w-none">
            <div dangerouslySetInnerHTML={{ __html: formatHtmlContent(conversion.content) }} />
          </div>
          
          <footer className="mt-12 pt-8 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              <p>This content was converted from <a href={conversion.source_url} className="text-blue-600 hover:underline" target="_blank" rel="noopener">{conversion.source_url}</a> using <a href="/" className="text-blue-600 hover:underline">ctxt.help</a> - The LLM Context Builder.</p>
              <p className="mt-2">Permanent link: <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">https://ctxt.help/read/{conversion.slug}</span></p>
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
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch conversion:', error);
    return null;
  }
}

async function incrementViewCount(slug: string): Promise<void> {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/conversions/slug/${slug}/view`, {
      method: 'POST',
      cache: 'no-cache',
    });
  } catch (error) {
    console.error('Failed to increment view count:', error);
  }
}

function formatMarkdownContent(conversion: Conversion): string {
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
*Permanent link: https://ctxt.help/read/${conversion.slug}*`;
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

export async function generateMetadata({ params }: ConversionPageProps) {
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
      url: `https://ctxt.help/read/${conversion.slug}`,
      type: 'article',
      publishedTime: conversion.created_at,
      authors: ['ctxt.help'],
    },
    twitter: {
      card: 'summary_large_image',
      title: conversion.title,
      description: metaDescription,
    },
    canonical: `https://ctxt.help/read/${conversion.slug}`,
  };
}