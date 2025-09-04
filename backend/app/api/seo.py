from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse, PlainTextResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from app.db.database import get_db
from app.models import Conversion, ContextStack
from app.services.bot_detection import bot_detector
from app.core.config import settings
import logging
from datetime import datetime
from urllib.parse import quote_plus
from xml.etree.ElementTree import Element, SubElement, tostring
import xml.etree.ElementTree as ET

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/read/{slug}")
async def get_seo_page(
    slug: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Serve SEO-optimized pages for conversions
    - Returns HTML for human users (browsers)
    - Returns raw markdown for bots/crawlers
    """
    
    # Get user agent from request headers
    user_agent = request.headers.get("user-agent", "")
    
    # Query conversion from database
    conversion = db.query(Conversion).filter(Conversion.slug == slug).first()
    
    if not conversion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversion with slug '{slug}' not found"
        )
    
    # Increment view count
    conversion.view_count += 1
    db.commit()
    
    # Detect if request is from a bot/crawler
    should_serve_markdown = bot_detector.should_serve_markdown(user_agent)
    
    # Log bot access for monitoring
    bot_detector.log_bot_access(user_agent, slug, should_serve_markdown)
    
    if should_serve_markdown:
        return await serve_markdown_content(conversion, request)
    else:
        return await serve_html_content(conversion, request)

async def serve_markdown_content(conversion: Conversion, request: Request) -> PlainTextResponse:
    """Serve raw markdown content for bots and crawlers"""
    
    # Add metadata header for markdown
    markdown_content = f"""# {conversion.title}

**Source:** {conversion.source_url}
**Domain:** {conversion.domain}
**Published:** {conversion.created_at.strftime('%Y-%m-%d')}
**Word Count:** {conversion.word_count}
**Reading Time:** {conversion.reading_time} minutes

---

{conversion.content}

---
*Converted by ctxt.help - The LLM Context Builder*
*Permanent link: https://ctxt.help/read/{conversion.slug}*
"""
    
    # Set appropriate headers for crawlers
    headers = {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        "X-Robots-Tag": "index, follow",
        "X-Content-Type": "markdown"
    }
    
    return PlainTextResponse(
        content=markdown_content,
        headers=headers,
        media_type="text/plain"
    )

async def serve_html_content(conversion: Conversion, request: Request) -> HTMLResponse:
    """Serve rich HTML content for human users"""
    
    # Calculate additional metadata
    estimated_read_time = max(1, conversion.word_count // 200)
    
    # Format publish date
    publish_date = conversion.created_at.strftime('%B %d, %Y')
    
    # Create meta description (truncated if needed)
    meta_description = conversion.meta_description or conversion.content[:155] + "..."
    if len(meta_description) > 155:
        meta_description = meta_description[:152] + "..."
    
    # Generate structured data for SEO
    structured_data = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": conversion.title,
        "description": meta_description,
        "url": f"https://ctxt.help/read/{conversion.slug}",
        "datePublished": conversion.created_at.isoformat(),
        "dateModified": conversion.updated_at.isoformat() if conversion.updated_at else conversion.created_at.isoformat(),
        "author": {
            "@type": "Organization",
            "name": "ctxt.help"
        },
        "publisher": {
            "@type": "Organization",
            "name": "ctxt.help",
            "url": "https://ctxt.help"
        },
        "wordCount": conversion.word_count,
        "articleBody": conversion.content[:500] + "...",
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": f"https://ctxt.help/read/{conversion.slug}"
        }
    }
    
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{conversion.title} | ctxt.help</title>
    
    <!-- SEO Meta Tags -->
    <meta name="description" content="{meta_description}">
    <meta name="keywords" content="markdown, converter, AI, LLM, context, {conversion.domain}">
    <meta name="author" content="ctxt.help">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://ctxt.help/read/{conversion.slug}">
    
    <!-- Open Graph Meta Tags -->
    <meta property="og:title" content="{conversion.title}">
    <meta property="og:description" content="{meta_description}">
    <meta property="og:url" content="https://ctxt.help/read/{conversion.slug}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="ctxt.help">
    <meta property="article:published_time" content="{conversion.created_at.isoformat()}">
    <meta property="article:author" content="ctxt.help">
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{conversion.title}">
    <meta name="twitter:description" content="{meta_description}">
    <meta name="twitter:url" content="https://ctxt.help/read/{conversion.slug}">
    
    <!-- Structured Data -->
    <script type="application/ld+json">
    {structured_data}
    </script>
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Custom Styles -->
    <style>
        .content-container {{
            max-width: 800px;
            margin: 0 auto;
            line-height: 1.7;
        }}
        .content-container h1, .content-container h2, .content-container h3 {{
            margin-top: 2rem;
            margin-bottom: 1rem;
        }}
        .content-container p {{
            margin-bottom: 1rem;
        }}
        .content-container ul, .content-container ol {{
            margin-bottom: 1rem;
            padding-left: 1.5rem;
        }}
        .content-container blockquote {{
            border-left: 4px solid #3b82f6;
            padding-left: 1rem;
            margin: 1rem 0;
            font-style: italic;
            background-color: #f8fafc;
        }}
        .content-container code {{
            background-color: #f1f5f9;
            padding: 0.2rem 0.4rem;
            border-radius: 0.25rem;
            font-family: 'Courier New', monospace;
        }}
        .content-container pre {{
            background-color: #1e293b;
            color: #f1f5f9;
            padding: 1rem;
            border-radius: 0.5rem;
            overflow-x: auto;
            margin: 1rem 0;
        }}
        .content-container pre code {{
            background-color: transparent;
            padding: 0;
        }}
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <!-- Header -->
    <header class="bg-white shadow-sm">
        <div class="max-w-6xl mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
                <a href="https://ctxt.help" class="text-2xl font-bold text-blue-600">ctxt.help</a>
                <div class="text-sm text-gray-600">
                    <span>{conversion.view_count} views</span>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-6xl mx-auto px-4 py-8">
        <article class="bg-white rounded-lg shadow-sm p-8">
            <!-- Article Header -->
            <header class="mb-8 pb-6 border-b border-gray-200">
                <h1 class="text-4xl font-bold text-gray-900 mb-4">{conversion.title}</h1>
                
                <div class="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                    <span>📅 {publish_date}</span>
                    <span>🌐 <a href="{conversion.source_url}" class="text-blue-600 hover:underline" target="_blank" rel="noopener">{conversion.domain}</a></span>
                    <span>📖 {conversion.word_count} words</span>
                    <span>⏱️ {estimated_read_time} min read</span>
                </div>
                
                <div class="flex flex-wrap gap-2">
                    <a href="{conversion.source_url}" 
                       class="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs hover:bg-blue-200 transition-colors"
                       target="_blank" rel="noopener">
                        🔗 View Original
                    </a>
                    <button onclick="copyToClipboard()" 
                            class="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs hover:bg-gray-200 transition-colors">
                        📋 Copy Link
                    </button>
                    <button onclick="shareContent()" 
                            class="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs hover:bg-gray-200 transition-colors">
                        📤 Share
                    </button>
                </div>
            </header>

            <!-- Article Content -->
            <div class="content-container prose prose-lg max-w-none">
                <div id="markdown-content">{conversion.content}</div>
            </div>
            
            <!-- Article Footer -->
            <footer class="mt-12 pt-8 border-t border-gray-200">
                <div class="text-sm text-gray-600">
                    <p>This content was converted from <a href="{conversion.source_url}" class="text-blue-600 hover:underline" target="_blank" rel="noopener">{conversion.source_url}</a> using <a href="https://ctxt.help" class="text-blue-600 hover:underline">ctxt.help</a> - The LLM Context Builder.</p>
                    <p class="mt-2">Permanent link: <span class="font-mono text-xs bg-gray-100 px-2 py-1 rounded">https://ctxt.help/read/{conversion.slug}</span></p>
                </div>
            </footer>
        </article>
        
        <!-- Call to Action -->
        <div class="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white text-center">
            <h3 class="text-xl font-bold mb-2">Convert Your Own URLs</h3>
            <p class="mb-4">Transform any webpage into clean markdown perfect for AI and LLM contexts</p>
            <a href="https://ctxt.help" class="inline-block bg-white text-blue-600 font-semibold px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                Try ctxt.help Free
            </a>
        </div>
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-gray-200 mt-16">
        <div class="max-w-6xl mx-auto px-4 py-8">
            <div class="text-center text-sm text-gray-600">
                <p>&copy; 2025 ctxt.help - The LLM Context Builder</p>
                <div class="mt-2 space-x-4">
                    <a href="https://ctxt.help" class="hover:text-blue-600">Home</a>
                    <a href="https://ctxt.help/about" class="hover:text-blue-600">About</a>
                    <a href="https://ctxt.help/privacy" class="hover:text-blue-600">Privacy</a>
                    <a href="https://ctxt.help/terms" class="hover:text-blue-600">Terms</a>
                </div>
            </div>
        </div>
    </footer>

    <!-- JavaScript -->
    <script>
        function copyToClipboard() {{
            navigator.clipboard.writeText(window.location.href).then(() => {{
                alert('Link copied to clipboard!');
            }}).catch(() => {{
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = window.location.href;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('Link copied to clipboard!');
            }});
        }}
        
        function shareContent() {{
            if (navigator.share) {{
                navigator.share({{
                    title: document.title,
                    url: window.location.href
                }});
            }} else {{
                copyToClipboard();
            }}
        }}
        
        // Simple markdown to HTML conversion for content
        document.addEventListener('DOMContentLoaded', function() {{
            const content = document.getElementById('markdown-content');
            let html = content.innerHTML;
            
            // Convert markdown headers
            html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
            html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
            html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
            
            // Convert bold
            html = html.replace(/\\*\\*(.*?)\\*\\*/gim, '<strong>$1</strong>');
            
            // Convert italic
            html = html.replace(/\\*(.*?)\\*/gim, '<em>$1</em>');
            
            // Convert links
            html = html.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/gim, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener">$1</a>');
            
            // Convert line breaks to paragraphs
            html = html.replace(/\n\n/gim, '</p><p>');
            html = '<p>' + html + '</p>';
            
            content.innerHTML = html;
        }});
    </script>
</body>
</html>"""
    
    return HTMLResponse(
        content=html_content,
        headers={
            "Cache-Control": "public, max-age=3600",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-Robots-Tag": "index, follow"
        }
    )

@router.get("/sitemap.xml")
async def get_sitemap(db: Session = Depends(get_db)):
    """
    Generate XML sitemap for all public conversions and context stacks
    """
    try:
        # Create the root urlset element
        urlset = Element('urlset')
        urlset.set('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9')
        
        # Add homepage
        homepage_url = SubElement(urlset, 'url')
        SubElement(homepage_url, 'loc').text = 'https://ctxt.help/'
        SubElement(homepage_url, 'changefreq').text = 'daily'
        SubElement(homepage_url, 'priority').text = '1.0'
        SubElement(homepage_url, 'lastmod').text = datetime.utcnow().strftime('%Y-%m-%d')
        
        # Get all public and indexed conversions
        conversions = db.query(Conversion).filter(
            and_(
                Conversion.is_public == True,
                Conversion.is_indexed == True
            )
        ).order_by(desc(Conversion.updated_at)).all()
        
        # Add conversion pages
        for conversion in conversions:
            # Calculate priority based on view count and recency
            priority = calculate_conversion_priority(conversion)
            
            # Add /read/{slug} SEO route
            read_url = SubElement(urlset, 'url')
            SubElement(read_url, 'loc').text = f'https://ctxt.help/read/{conversion.slug}'
            SubElement(read_url, 'lastmod').text = (conversion.updated_at or conversion.created_at).strftime('%Y-%m-%d')
            SubElement(read_url, 'changefreq').text = 'weekly'
            SubElement(read_url, 'priority').text = f'{priority:.1f}'
            
            # Add /page/{slug} route
            page_url = SubElement(urlset, 'url')
            SubElement(page_url, 'loc').text = f'https://ctxt.help/page/{conversion.slug}'
            SubElement(page_url, 'lastmod').text = (conversion.updated_at or conversion.created_at).strftime('%Y-%m-%d')
            SubElement(page_url, 'changefreq').text = 'weekly'
            SubElement(page_url, 'priority').text = f'{priority:.1f}'
            
            # Add /page/{slug}/markdown route
            markdown_url = SubElement(urlset, 'url')
            SubElement(markdown_url, 'loc').text = f'https://ctxt.help/page/{conversion.slug}/markdown'
            SubElement(markdown_url, 'lastmod').text = (conversion.updated_at or conversion.created_at).strftime('%Y-%m-%d')
            SubElement(markdown_url, 'changefreq').text = 'weekly'
            SubElement(markdown_url, 'priority').text = f'{max(priority - 0.1, 0.1):.1f}'
        
        # Get all public context stacks
        context_stacks = db.query(ContextStack).filter(
            ContextStack.is_public == True
        ).order_by(desc(ContextStack.updated_at)).all()
        
        # Add context stack pages
        for stack in context_stacks:
            # Calculate priority based on usage
            priority = calculate_context_stack_priority(stack)
            
            # Add /context/{id} route
            context_url = SubElement(urlset, 'url')
            SubElement(context_url, 'loc').text = f'https://ctxt.help/context/{stack.id}'
            SubElement(context_url, 'lastmod').text = (stack.updated_at or stack.created_at).strftime('%Y-%m-%d')
            SubElement(context_url, 'changefreq').text = 'weekly'
            SubElement(context_url, 'priority').text = f'{priority:.1f}'
            
            # Add /context/{id}/markdown route
            context_md_url = SubElement(urlset, 'url')
            SubElement(context_md_url, 'loc').text = f'https://ctxt.help/context/{stack.id}/markdown'
            SubElement(context_md_url, 'lastmod').text = (stack.updated_at or stack.created_at).strftime('%Y-%m-%d')
            SubElement(context_md_url, 'changefreq').text = 'weekly'
            SubElement(context_md_url, 'priority').text = f'{max(priority - 0.1, 0.1):.1f}'
            
            # Add /context/{id}/xml route
            context_xml_url = SubElement(urlset, 'url')
            SubElement(context_xml_url, 'loc').text = f'https://ctxt.help/context/{stack.id}/xml'
            SubElement(context_xml_url, 'lastmod').text = (stack.updated_at or stack.created_at).strftime('%Y-%m-%d')
            SubElement(context_xml_url, 'changefreq').text = 'weekly'
            SubElement(context_xml_url, 'priority').text = f'{max(priority - 0.1, 0.1):.1f}'
        
        # Convert to XML string
        xml_string = tostring(urlset, encoding='unicode', method='xml')
        
        # Add XML declaration
        sitemap_xml = f'<?xml version="1.0" encoding="UTF-8"?>\n{xml_string}'
        
        return Response(
            content=sitemap_xml,
            media_type="application/xml",
            headers={
                "Cache-Control": "public, max-age=86400",  # Cache for 24 hours
                "Content-Type": "application/xml; charset=utf-8"
            }
        )
        
    except Exception as e:
        logger.error(f"Error generating sitemap: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate sitemap"
        )

def calculate_conversion_priority(conversion: Conversion) -> float:
    """
    Calculate sitemap priority for a conversion based on view count and recency
    Returns a value between 0.1 and 0.9
    """
    # Base priority
    priority = 0.6
    
    # Boost for high view count
    if conversion.view_count > 1000:
        priority += 0.2
    elif conversion.view_count > 100:
        priority += 0.1
    elif conversion.view_count > 10:
        priority += 0.05
    
    # Boost for recent content
    if conversion.created_at:
        days_old = (datetime.utcnow() - conversion.created_at).days
        if days_old < 30:
            priority += 0.1
        elif days_old < 90:
            priority += 0.05
    
    # Ensure priority is within valid range
    return min(max(priority, 0.1), 0.9)

def calculate_context_stack_priority(stack: ContextStack) -> float:
    """
    Calculate sitemap priority for a context stack based on usage
    Returns a value between 0.1 and 0.8
    """
    # Base priority (slightly lower than conversions)
    priority = 0.5
    
    # Boost for high usage
    if stack.use_count > 50:
        priority += 0.2
    elif stack.use_count > 10:
        priority += 0.1
    elif stack.use_count > 1:
        priority += 0.05
    
    # Boost for templates
    if stack.is_template:
        priority += 0.1
    
    # Boost for recent activity
    if stack.last_used_at:
        days_since_use = (datetime.utcnow() - stack.last_used_at).days
        if days_since_use < 7:
            priority += 0.1
        elif days_since_use < 30:
            priority += 0.05
    
    # Ensure priority is within valid range
    return min(max(priority, 0.1), 0.8)

@router.get("/robots.txt")
async def get_robots_txt():
    """
    Generate robots.txt file that references the sitemap
    """
    robots_content = f"""User-agent: *
Allow: /

# Sitemap
Sitemap: https://ctxt.help/sitemap.xml

# Crawl-delay for politeness
Crawl-delay: 1

# Allow specific paths
Allow: /read/
Allow: /page/
Allow: /context/

# Disallow admin and api paths
Disallow: /api/
Disallow: /admin/
Disallow: /auth/
"""
    
    return Response(
        content=robots_content,
        media_type="text/plain",
        headers={
            "Cache-Control": "public, max-age=86400",  # Cache for 24 hours
            "Content-Type": "text/plain; charset=utf-8"
        }
    )