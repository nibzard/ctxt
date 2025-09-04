// ABOUTME: API proxy routes that forward requests to FastAPI backend
// ABOUTME: Handles all /api/* requests and maintains authentication headers

import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest('GET', request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest('POST', request, path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest('PUT', request, path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest('DELETE', request, path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest('PATCH', request, path);
}

async function proxyRequest(
  method: string,
  request: NextRequest,
  pathSegments: string[]
): Promise<NextResponse> {
  try {
    const path = pathSegments.join('/');
    const url = new URL(request.url);
    const targetUrl = `${API_BASE_URL}/api/${path}${url.search}`;

    // Get request body for non-GET requests
    const body = ['GET', 'HEAD'].includes(method) ? undefined : await request.text();

    // Forward headers, particularly Authorization
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      // Forward important headers but skip Next.js specific ones
      if (!key.startsWith('x-forwarded-') && 
          !key.startsWith('cf-') && 
          key !== 'host' &&
          key !== 'connection') {
        headers[key] = value;
      }
    });

    // Make request to FastAPI backend
    const response = await fetch(targetUrl, {
      method,
      headers: {
        ...headers,
        'Content-Type': headers['content-type'] || 'application/json',
      },
      body,
    });

    // Get response data
    const data = await response.text();
    
    // Create Next.js response
    const nextResponse = new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
    });

    // Forward response headers
    response.headers.forEach((value, key) => {
      // Skip headers that Next.js manages
      if (!key.startsWith('content-encoding') && 
          !key.startsWith('transfer-encoding') &&
          key !== 'connection') {
        nextResponse.headers.set(key, value);
      }
    });

    return nextResponse;
  } catch (error) {
    console.error('Proxy request failed:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request' },
      { status: 500 }
    );
  }
}