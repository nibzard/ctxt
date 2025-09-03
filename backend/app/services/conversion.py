import httpx
import re
import hashlib
from urllib.parse import urlparse
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models import Conversion
from app.schemas import ConversionRequest, ConversionOptions
from app.services.token_counter import count_tokens
import logging

logger = logging.getLogger(__name__)

class ConversionService:
    """Service for handling URL conversions using Jina Reader API"""
    
    def __init__(self):
        self.jina_base_url = settings.jina_reader_base_url
        self.timeout = 30
        
    async def convert_url(
        self, 
        url: str, 
        options: Optional[ConversionOptions] = None
    ) -> Dict[str, Any]:
        """Convert URL to markdown using Jina Reader API"""
        try:
            # Construct Jina Reader URL
            jina_url = f"{self.jina_base_url}/{url}"
            
            logger.info(f"Converting URL: {url}")
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(jina_url)
                response.raise_for_status()
                
                markdown_content = response.text
                
                # Extract metadata
                title = self._extract_title(markdown_content)
                word_count = self._count_words(markdown_content)
                reading_time = self._calculate_reading_time(word_count)
                token_count = count_tokens(markdown_content)
                domain = self._extract_domain(url)
                
                return {
                    "source_url": url,
                    "title": title,
                    "content": markdown_content,
                    "domain": domain,
                    "word_count": word_count,
                    "reading_time": reading_time,
                    "token_count": token_count,
                    "meta_description": self._generate_description(markdown_content, title)
                }
                
        except httpx.TimeoutException:
            logger.error(f"Timeout converting URL: {url}")
            raise Exception("Conversion timeout - the webpage took too long to process")
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error converting URL {url}: {e.response.status_code}")
            raise Exception(f"Failed to convert URL: HTTP {e.response.status_code}")
            
        except Exception as e:
            logger.error(f"Error converting URL {url}: {str(e)}")
            raise Exception(f"Conversion failed: {str(e)}")
    
    def generate_slug(self, url: str, title: Optional[str] = None) -> str:
        """Generate SEO-friendly slug for conversion"""
        if title and len(title.strip()) > 10:
            # Use title for slug
            slug = title.lower()
            # Remove special characters and normalize
            slug = re.sub(r'[^a-z0-9\s\-]', '', slug)
            slug = re.sub(r'\s+', '-', slug)
            slug = re.sub(r'-+', '-', slug)
            # Leave room for unique suffix (max 80 chars for base + 20 for suffix)
            slug = slug[:80].strip('-')
        else:
            # Extract from URL path
            parsed = urlparse(url)
            slug = parsed.path.strip('/').replace('/', '-')
            slug = re.sub(r'[^a-z0-9\-]', '', slug.lower())
            slug = slug[:80].strip('-')
            
        # Ensure we have something
        if not slug or len(slug) < 3:
            slug = f"conversion-{hashlib.md5(url.encode()).hexdigest()[:8]}"
            
        return slug
    
    def ensure_unique_slug(self, db: Session, base_slug: str) -> str:
        """Ensure slug is unique by adding suffix if needed"""
        slug = base_slug
        counter = 1
        
        while db.query(Conversion).filter(Conversion.slug == slug).first():
            # Ensure total length stays under 100 chars
            suffix = f"-{counter}"
            if len(base_slug) + len(suffix) > 100:
                # Truncate base_slug to make room for suffix
                truncated_base = base_slug[:100 - len(suffix)]
                slug = f"{truncated_base}{suffix}"
            else:
                slug = f"{base_slug}{suffix}"
            counter += 1
            
        return slug
    
    def _extract_title(self, markdown: str) -> Optional[str]:
        """Extract title from markdown content"""
        lines = markdown.split('\n')
        for line in lines[:10]:  # Check first 10 lines
            line = line.strip()
            if line.startswith('# '):
                return line[2:].strip()
        return None
    
    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL"""
        try:
            parsed = urlparse(url)
            return parsed.netloc
        except:
            return "unknown"
    
    def _count_words(self, text: str) -> int:
        """Count words in text"""
        # Remove markdown formatting and count words
        clean_text = re.sub(r'[#*`_\[\]()]+', '', text)
        words = clean_text.split()
        return len(words)
    
    def _calculate_reading_time(self, word_count: int) -> int:
        """Calculate reading time in minutes (average 200 words per minute)"""
        return max(1, round(word_count / 200))
    
    def _generate_description(self, content: str, title: Optional[str] = None) -> str:
        """Generate meta description from content"""
        # Remove markdown formatting
        clean_content = re.sub(r'[#*`_\[\]()]+', '', content)
        lines = clean_content.split('\n')
        
        # Find first substantial paragraph
        description = ""
        for line in lines:
            line = line.strip()
            if len(line) > 50 and not line.startswith(title or ""):
                description = line
                break
        
        # Ensure we have a fallback description
        if not description:
            description = "Clean markdown conversion from webpage"
            
        # Truncate to 197 characters to fit database limit (200 chars)
        # Leave room for "..." if truncation is needed
        if len(description) > 197:
            description = description[:194] + "..."
            
        return description

class SEOService:
    """Service for generating SEO-optimized pages"""
    
    def generate_seo_page(self, conversion: Conversion) -> str:
        """Generate SEO-optimized HTML page for conversion"""
        title = conversion.title or "Converted Content"
        description = conversion.meta_description or "Clean markdown conversion"
        
        # Generate schema.org structured data
        schema_data = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": title,
            "description": description,
            "url": f"https://ctxt.help/read/{conversion.slug}",
            "datePublished": conversion.created_at.isoformat(),
            "wordCount": conversion.word_count,
            "publisher": {
                "@type": "Organization",
                "name": "ctxt.help"
            }
        }
        
        # Convert markdown to HTML (simplified)
        html_content = self._markdown_to_html(conversion.content)
        
        html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - Clean Markdown | ctxt.help</title>
    <meta name="description" content="{description}">
    
    <!-- Open Graph -->
    <meta property="og:title" content="{title} - Clean Markdown">
    <meta property="og:description" content="{description}">
    <meta property="og:url" content="https://ctxt.help/read/{conversion.slug}">
    <meta property="og:type" content="article">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="{title}">
    <meta name="twitter:description" content="{description}">
    
    <!-- Schema.org -->
    <script type="application/ld+json">
        {schema_data}
    </script>
    
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }}
        .header {{ border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }}
        .meta {{ color: #666; font-size: 14px; }}
        .actions {{ margin: 20px 0; }}
        .btn {{ background: #007bff; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; margin-right: 10px; }}
        .content {{ line-height: 1.8; }}
        pre {{ background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; }}
        code {{ background: #f8f9fa; padding: 2px 4px; border-radius: 3px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>{title}</h1>
        <div class="meta">
            Source: <a href="{conversion.source_url}" target="_blank">{conversion.domain}</a>
            • {conversion.reading_time} min read 
            • Converted {conversion.created_at.strftime('%B %d, %Y')}
            • {conversion.view_count} views
        </div>
    </div>
    
    <div class="actions">
        <a href="#" class="btn" onclick="copyToClipboard()">Copy Markdown</a>
        <a href="https://chatgpt.com/?q={conversion.content}" class="btn" target="_blank">Send to ChatGPT</a>
        <a href="https://claude.ai/new?q={conversion.content}" class="btn" target="_blank">Send to Claude</a>
    </div>
    
    <div class="content">
        {html_content}
    </div>
    
    <script>
        function copyToClipboard() {{
            navigator.clipboard.writeText(`{conversion.content}`);
            alert('Markdown copied to clipboard!');
        }}
    </script>
</body>
</html>"""
        
        return html_template
    
    def _markdown_to_html(self, markdown: str) -> str:
        """Simple markdown to HTML conversion"""
        html = markdown
        
        # Headers
        html = re.sub(r'^### (.*$)', r'<h3>\1</h3>', html, flags=re.MULTILINE)
        html = re.sub(r'^## (.*$)', r'<h2>\1</h2>', html, flags=re.MULTILINE)
        html = re.sub(r'^# (.*$)', r'<h1>\1</h1>', html, flags=re.MULTILINE)
        
        # Bold and italic
        html = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', html)
        html = re.sub(r'\*(.*?)\*', r'<em>\1</em>', html)
        
        # Code blocks
        html = re.sub(r'```(.*?)```', r'<pre><code>\1</code></pre>', html, flags=re.DOTALL)
        html = re.sub(r'`(.*?)`', r'<code>\1</code>', html)
        
        # Links
        html = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', html)
        
        # Paragraphs
        paragraphs = html.split('\n\n')
        html = '</p><p>'.join(paragraphs)
        html = f'<p>{html}</p>'
        
        return html

# Service instances
conversion_service = ConversionService()
seo_service = SEOService()