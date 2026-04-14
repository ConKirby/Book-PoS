import { NextResponse } from 'next/server';
import { createTransaction, getTransactions, getTransactionItems } from '@/lib/db';
import type { Transaction, TransactionItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
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
}

export async function POST(req: Request) {
  const body = (await req.json()) as IncomingBody;
  const { staffId, staffName, items, paymentMethod } = body;

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'No items supplied' }, { status: 400 });
  }

  const activeItems = items.filter((i) => !i.voided);
  if (activeItems.length === 0) {
    return NextResponse.json({ error: 'All items voided' }, { status: 400 });
  }

  const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const timestamp = new Date().toISOString();
  const subtotal = activeItems.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const voidedItemCount = items.filter((i) => i.voided).length;

  const tx: Transaction = {
    id: txId,
    timestamp,
    staffId,
    staffName,
    subtotal: Math.round(subtotal * 100) / 100,
    total: Math.round(subtotal * 100) / 100,
    status: 'finalised',
    paymentMethod,
    itemCount: activeItems.reduce((s, i) => s + i.qty, 0),
    voidedItemCount,
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
