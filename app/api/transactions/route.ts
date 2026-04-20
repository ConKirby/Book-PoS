import { NextResponse } from 'next/server';
import {
  createTransaction,
  getTransactions,
  getTransactionItems,
  findTransactionByIdempotencyKey,
  getBooks,
  refundTransaction,
} from '@/lib/db';
import { rateLimit, clientKey } from '@/lib/rateLimit';
import type { Transaction, TransactionItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const rl = rateLimit('tx:get:' + clientKey(req), 120, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }
  const transactions = getTransactions().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const items = getTransactionItems();
  return NextResponse.json({ transactions, items });
}

interface IncomingItem {
  bookId: string;
  isbn: string;
  title: string;
  category: string;
  unitPrice: number;
  qty: number;
  voided: boolean;
}

interface IncomingBody {
  staffId: string;
  staffName: string;
  paymentMethod: string;
  items: IncomingItem[];
  idempotencyKey?: string;
  tendered?: number;
  mode?: 'sale' | 'refund';
  refundOfId?: string;
  refundItems?: { bookId: string; qty: number }[];
}

export async function POST(req: Request) {
  const rl = rateLimit('tx:write:' + clientKey(req), 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  const body = (await req.json().catch(() => null)) as IncomingBody | null;
  if (!body) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  const { staffId, staffName, paymentMethod } = body;
  if (typeof staffId !== 'string' || typeof staffName !== 'string') {
    return NextResponse.json({ error: 'Missing staff identity' }, { status: 400 });
  }

  if (body.mode === 'refund') {
    if (!body.refundOfId || !Array.isArray(body.refundItems) || body.refundItems.length === 0) {
      return NextResponse.json({ error: 'Refund requires refundOfId and refundItems' }, { status: 400 });
    }
    const result = refundTransaction(body.refundOfId, staffId, staffName, body.refundItems);
    if (!result) {
      return NextResponse.json({ error: 'Refund not permitted for this transaction' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, transactionId: result.transaction.id, transaction: result.transaction });
  }

  const items = body.items;
  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'No items supplied' }, { status: 400 });
  }
  const activeItems = items.filter((i) => !i.voided);
  if (activeItems.length === 0) {
    return NextResponse.json({ error: 'All items voided' }, { status: 400 });
  }

  if (body.idempotencyKey) {
    const existing = findTransactionByIdempotencyKey(body.idempotencyKey);
    if (existing) {
      return NextResponse.json({ ok: true, transactionId: existing.id, transaction: existing, duplicate: true });
    }
  }

  const books = getBooks();
  for (const it of activeItems) {
    const b = books.find((x) => x.id === it.bookId);
    if (!b) return NextResponse.json({ error: `Unknown book ${it.bookId}` }, { status: 400 });
    if (it.qty <= 0) return NextResponse.json({ error: 'Quantity must be positive' }, { status: 400 });
    if (b.stock < it.qty) {
      return NextResponse.json({ error: `Insufficient stock for ${b.title}` }, { status: 409 });
    }
    if (Math.abs(b.price - it.unitPrice) > 0.001) {
      return NextResponse.json({ error: `Price mismatch for ${b.title}` }, { status: 409 });
    }
  }

  const subtotal = activeItems.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const total = Math.round(subtotal * 100) / 100;

  let tendered = 0;
  let change = 0;
  if (paymentMethod === 'cash') {
    tendered = typeof body.tendered === 'number' && Number.isFinite(body.tendered) ? body.tendered : 0;
    if (tendered < total) {
      return NextResponse.json(
        { error: 'Amount tendered is less than the total owed' },
        { status: 400 }
      );
    }
    change = Math.round((tendered - total) * 100) / 100;
  } else if (paymentMethod === 'card') {
    tendered = total;
    change = 0;
  } else {
    return NextResponse.json({ error: 'Unsupported payment method' }, { status: 400 });
  }

  const voidedItemCount = items.filter((i) => i.voided).length;
  const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

  const tx: Transaction = {
    id: txId,
    timestamp: new Date().toISOString(),
    staffId,
    staffName,
    subtotal: total,
    total,
    status: 'finalised',
    paymentMethod,
    itemCount: activeItems.reduce((s, i) => s + i.qty, 0),
    voidedItemCount,
    type: 'sale',
    tendered,
    change,
    idempotencyKey: body.idempotencyKey || '',
    refundOfId: '',
  };

  const txItems: TransactionItem[] = items.map((i, idx) => ({
    id: txId + '_' + idx,
    transactionId: txId,
    bookId: i.bookId,
    title: i.title,
    category: i.category,
    unitPrice: i.unitPrice,
    qty: i.qty,
    voided: i.voided,
  }));

  createTransaction(tx, txItems);
  return NextResponse.json({ ok: true, transactionId: txId, transaction: tx });
}
