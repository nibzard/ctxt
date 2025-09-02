// ABOUTME: Next.js middleware for bot detection and request handling
// ABOUTME: Determines content serving strategy based on user agent analysis

import { NextRequest, NextResponse } from 'next/server';
import { botDetector } from './lib/bot-detection';

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  
  // Only handle /read/* routes
  if (!request.nextUrl.pathname.startsWith('/read/')) {
    return NextResponse.next();
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
    '/read/:path*',
  ],
};