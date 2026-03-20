import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
  'https://www.builtattic.com',
  'https://builtattic.com',
  process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean) as string[];

function getCorsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else if (origin && process.env.NODE_ENV === 'development') {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get('origin');

  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }

  const response = NextResponse.next();
  const corsHeaders = getCorsHeaders(origin);
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: ['/api/:path*', '/'],
};
