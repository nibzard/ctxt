// ABOUTME: Next.js middleware for bot detection and request handling
// ABOUTME: Determines content serving strategy based on user agent analysis

import { NextRequest, NextResponse } from 'next/server';
import { botDetector } from './lib/bot-detection';

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  const pathname = request.nextUrl.pathname;
  
  // Handle semantic routes (/page/ and /context/) and legacy /read/ routes
  const isSemanticRoute = pathname.startsWith('/page/') || pathname.startsWith('/context/');
  const isLegacyRoute = pathname.startsWith('/read/');
  
  if (!isSemanticRoute && !isLegacyRoute) {
    return NextResponse.next();
  }

  // Handle legacy /read/ routes - redirect to semantic routes
  if (isLegacyRoute) {
    const legacyMatch = pathname.match(/^\/read\/(.+?)(\.(md|xml))?$/);
    if (legacyMatch) {
      const [, slug, , extension] = legacyMatch;
      const url = request.nextUrl.clone();
      
      // For now, redirect to /page/ and let the route component handle context stacks
      // The page component will redirect to /context/ if it detects a context stack
      if (extension === 'md') {
        url.pathname = `/page/${slug}.md`;
      } else if (extension === 'xml') {
        url.pathname = `/context/${slug}.xml`;
      } else {
        url.pathname = `/page/${slug}`;
      }
      
      return NextResponse.redirect(url, 301);
    }
  }

  // Handle file extension URLs for semantic routes (e.g., /page/slug.md, /context/slug.xml)
  const extensionMatch = pathname.match(/^\/(page|context)\/(.+?)\.(md|xml)$/);
  
  if (extensionMatch) {
    const [, routeType, slug, extension] = extensionMatch;
    let newPath;
    
    // Rewrite based on extension and route type
    if (extension === 'md') {
      newPath = `/${routeType}/${slug}/markdown`;
    } else if (extension === 'xml') {
      // Only allow XML for context routes
      if (routeType === 'context') {
        newPath = `/context/${slug}/xml`;
      } else {
        // Redirect page XML requests to markdown
        const url = request.nextUrl.clone();
        url.pathname = `/page/${slug}.md`;
        return NextResponse.redirect(url, 301);
      }
    }
    
    if (newPath) {
      const url = request.nextUrl.clone();
      url.pathname = newPath;
      return NextResponse.rewrite(url);
    }
  }

  // Add custom headers for bot detection
  const response = NextResponse.next();
  
  // Identify bot type and add headers
  const botInfo = botDetector.identifyBot(userAgent);
  
  if (botInfo.isBot) {
    response.headers.set('X-Is-Bot', 'true');
    response.headers.set('X-Bot-Name', botInfo.botName || 'unknown');
    response.headers.set('X-Bot-Type', botInfo.botType || 'generic');
    response.headers.set('X-Bot-Confidence', botInfo.confidence.toString());
    
    // Add appropriate caching headers for bots
    if (botDetector.shouldServeMarkdown(userAgent)) {
      response.headers.set('X-Serve-Format', 'markdown');
      response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    } else {
      response.headers.set('X-Serve-Format', 'html');
      response.headers.set('Cache-Control', 'public, max-age=1800');
    }
  } else {
    response.headers.set('X-Is-Bot', 'false');
    response.headers.set('X-Serve-Format', 'html');
    response.headers.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=1800');
  }

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Robots-Tag', 'index, follow');

  return response;
}

export const config = {
  matcher: [
    '/page/:path*',
    '/context/:path*',
    '/read/:path*',
  ],
};