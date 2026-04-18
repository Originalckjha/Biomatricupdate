import { NextRequest, NextResponse } from 'next/server';

// Server-side proxy to bypass CORS when fetching from LAN device
export async function GET(request: NextRequest) {
  const targetUrl = request.nextUrl.searchParams.get('url');
  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Could not reach device' }, { status: 502 });
  }
}
