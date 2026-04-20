import { NextResponse } from 'next/server';
import { voidTransaction } from '@/lib/db';
import { rateLimit, clientKey } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const rl = rateLimit('tx:write:' + clientKey(req), 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }
  const tx = voidTransaction(params.id);
  if (!tx) return NextResponse.json({ error: 'Transaction not found or cannot be voided' }, { status: 404 });
  return NextResponse.json({ ok: true, transaction: tx });
}
