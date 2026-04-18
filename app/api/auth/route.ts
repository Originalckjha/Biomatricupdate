import { NextRequest, NextResponse } from 'next/server';

// POST /api/auth  { password: string }
// Returns 200 + sets httpOnly session cookie on success
export async function POST(request: NextRequest) {
  const { password } = await request.json().catch(() => ({ password: '' }));
  const required = process.env.DASHBOARD_PASSWORD;

  // If no password is configured, let anyone in
  if (!required || password === required) {
    const res = NextResponse.json({ success: true });
    res.cookies.set('bio-session', required ?? 'open', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return res;
  }

  return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
}

// DELETE /api/auth  — logout
export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete('bio-session');
  return res;
}
