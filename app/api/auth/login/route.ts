import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
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
