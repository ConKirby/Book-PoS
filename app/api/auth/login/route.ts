import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/db';
import { rateLimit, clientKey } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rl = rateLimit('auth:' + clientKey(req), 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many attempts, try again shortly' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }
  const { username, pin } = (await req.json()) as { username: string; pin: string };
  const user = authenticate(username, pin);
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  return NextResponse.json({
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
  });
}
