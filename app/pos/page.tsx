'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Book } from '@/lib/types';

type CartItem = {
  bookId: string;
  isbn: string;
  title: string;
  category: string;
  unitPrice: number;
  qty: number;
  voided: boolean;
};

type Receipt = {
  id: string;
  total: number;
  items: CartItem[];
  paymentMethod: string;
  tendered: number;
  change: number;
};

interface SessionUser {
  id: string;
  name: string;
  role: string;
}

function newIdempotencyKey(): string {
  return 'idem_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
}

export default function PosPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [message, setMessage] = useState('');
  const [lastReceipt, setLastReceipt] = useState<Receipt | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [tenderedInput, setTenderedInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'sale' | 'refund'>('sale');
  const [refundLookupId, setRefundLookupId] = useState('');
  const idempotencyKeyRef = useRef<string>(newIdempotencyKey());
  const scanRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(u));
  }, [router]);

  useEffect(() => {
    if (mode === 'sale') scanRef.current?.focus();
  }, [cart.length, lastReceipt, mode]);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    const isbn = scanInput.trim();
    if (!isbn) return;
    setScanInput('');
    setMessage('');
    try {
      const res = await fetch('/api/books?isbn=' + encodeURIComponent(isbn));
      const books: Book[] = await res.json();
      if (!books.length) {
        setMessage('No book found for ISBN ' + isbn);
        return;
      }
      const book = books[0];
      if (book.stock <= 0) {
        setMessage(`"${book.title}" is out of stock`);
        return;
      }
      setCart((prev) => {
        const existingIdx = prev.findIndex((i) => i.bookId === book.id && !i.voided);
        const alreadyInCart = existingIdx === -1 ? 0 : prev[existingIdx].qty;
        if (alreadyInCart + 1 > book.stock) {
          setMessage(`Only ${book.stock} of "${book.title}" in stock`);
          return prev;
        }
        if (existingIdx !== -1) {
          return prev.map((i, idx) => (idx === existingIdx ? { ...i, qty: i.qty + 1 } : i));
        }
        return [
          ...prev,
          {
            bookId: book.id,
            isbn: book.isbn,
            title: book.title,
            category: book.category,
            unitPrice: book.price,
            qty: 1,
            voided: false,
          },
        ];
      });
    } catch {
      setMessage('Lookup failed');
    }
  }

  function voidItem(idx: number) {
    setCart((prev) => prev.map((item, i) => (i === idx ? { ...item, voided: true } : item)));
    setMessage('Item voided before finalising');
  }

  function changeQty(idx: number, delta: number) {
    setCart((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const q = item.qty + delta;
        if (q <= 0) return { ...item, voided: true };
        return { ...item, qty: q };
      })
    );
  }

  function clearCart() {
    setCart([]);
    setMessage('');
    idempotencyKeyRef.current = newIdempotencyKey();
  }

  const activeItems = cart.filter((i) => !i.voided);
  const subtotal = activeItems.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const total = Math.round(subtotal * 100) / 100;
  const tenderedNum = parseFloat(tenderedInput);
  const tenderedValid = Number.isFinite(tenderedNum) && tenderedNum >= total;
  const change = tenderedValid ? Math.round((tenderedNum - total) * 100) / 100 : 0;
  const canFinalise =
    !submitting &&
    activeItems.length > 0 &&
    (paymentMethod !== 'cash' || tenderedValid);

  async function finalise() {
    if (!user) return;
    if (!activeItems.length) {
      setMessage('Cart is empty');
      return;
    }
    if (paymentMethod === 'cash' && !tenderedValid) {
      setMessage('Enter cash received at or above total');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: user.id,
          staffName: user.name,
          paymentMethod,
          items: cart,
          idempotencyKey: idempotencyKeyRef.current,
          tendered: paymentMethod === 'cash' ? tenderedNum : total,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.error || 'Failed to save transaction');
        return;
      }
      setLastReceipt({
        id: data.transaction.id,
        total: data.transaction.total,
        items: activeItems,
        paymentMethod,
        tendered: data.transaction.tendered,
        change: data.transaction.change,
      });
      setCart([]);
      setTenderedInput('');
      setMessage(data.duplicate ? 'Duplicate submission ignored (already recorded)' : 'Sale complete');
    } catch {
      setMessage('Network error — please retry');
    } finally {
      setSubmitting(false);
    }
  }

  async function voidLastSale() {
    if (!lastReceipt) return;
    if (!confirm('Void this entire transaction and restore stock?')) return;
    const res = await fetch('/api/transactions/' + encodeURIComponent(lastReceipt.id) + '/void', {
      method: 'POST',
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setMessage(d?.error || 'Void failed');
      return;
    }
    setMessage('Transaction voided and stock restored');
    setLastReceipt(null);
    idempotencyKeyRef.current = newIdempotencyKey();
  }

  function newSale() {
    setLastReceipt(null);
    setMessage('');
    setTenderedInput('');
    idempotencyKeyRef.current = newIdempotencyKey();
  }

  function logout() {
    localStorage.removeItem('user');
    router.push('/');
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Bookshop PoS</h1>
          <nav className="flex gap-1 bg-slate-800 rounded-md p-1 text-sm">
            {user.role === 'manager' && (
              <a href="/dashboard" className="px-3 py-1 rounded hover:bg-slate-700">
                Dashboard
              </a>
            )}
            <a href="/inventory" className="px-3 py-1 rounded hover:bg-slate-700">
              Inventory
            </a>
            <a href="/pos" className="px-3 py-1 rounded bg-slate-700 font-medium">
              Till
            </a>
          </nav>
        </div>
        <div className="text-sm flex items-center gap-4">
          <span>{user.name}</span>
          <button onClick={logout} className="underline">
            Sign out
          </button>
        </div>
      </header>
      <main className="p-4 max-w-6xl mx-auto grid md:grid-cols-5 gap-4">
        <section className="md:col-span-3 bg-white rounded-lg p-4 shadow">
          <div className="flex gap-1 mb-3 bg-slate-100 p-1 rounded-md text-sm w-fit">
            <button
              onClick={() => setMode('sale')}
              className={`px-3 py-1 rounded ${mode === 'sale' ? 'bg-white shadow font-medium' : 'text-slate-600'}`}
            >
              Sale
            </button>
            <button
              onClick={() => setMode('refund')}
              className={`px-3 py-1 rounded ${mode === 'refund' ? 'bg-white shadow font-medium' : 'text-slate-600'}`}
            >
              Refund / Return
            </button>
          </div>
          {mode === 'sale' ? (
            <>
              <form onSubmit={handleScan} className="flex gap-2 mb-4">
                <input
                  ref={scanRef}
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="Scan or type ISBN and press Enter"
                  className="flex-1 border rounded px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
                  autoFocus
                />
                <button className="px-4 bg-slate-900 text-white rounded">Add</button>
              </form>
              {message && <p className="text-sm text-amber-700 mb-2">{message}</p>}
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold">Cart</h2>
                {cart.length > 0 && !lastReceipt && (
                  <button onClick={clearCart} className="text-xs text-slate-500 underline">
                    Clear all
                  </button>
                )}
              </div>
              {cart.length === 0 ? (
                <p className="text-slate-400 text-sm">No items scanned yet</p>
              ) : (
                <ul className="divide-y">
                  {cart.map((item, idx) => (
                    <li
                      key={idx}
                      className={`py-2 flex items-center gap-2 ${item.voided ? 'opacity-40 line-through' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.title}</p>
                        <p className="text-xs text-slate-500">
                          {item.isbn} · <span className="capitalize">{item.category.replace('-', ' ')}</span> · £
                          {item.unitPrice.toFixed(2)}
                        </p>
                      </div>
                      {!item.voided ? (
                        <>
                          <button
                            onClick={() => changeQty(idx, -1)}
                            className="w-7 h-7 rounded border hover:bg-slate-50"
                          >
                            −
                          </button>
                          <span className="w-6 text-center">{item.qty}</span>
                          <button
                            onClick={() => changeQty(idx, 1)}
                            className="w-7 h-7 rounded border hover:bg-slate-50"
                          >
                            +
                          </button>
                          <span className="w-20 text-right font-medium">
                            £{(item.unitPrice * item.qty).toFixed(2)}
                          </span>
                          <button onClick={() => voidItem(idx)} className="text-red-600 text-xs ml-2">
                            Void
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-500">voided</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <RefundPanel
              user={user}
              refundLookupId={refundLookupId}
              setRefundLookupId={setRefundLookupId}
              onComplete={(rec) => {
                setLastReceipt(rec);
                setMode('sale');
              }}
              setMessage={setMessage}
            />
          )}
        </section>
        <aside className="md:col-span-2 bg-white rounded-lg p-4 shadow">
          {lastReceipt ? (
            <div>
              <h2 className="font-semibold mb-1">Receipt</h2>
              <p className="text-xs text-slate-500 break-all mb-3">{lastReceipt.id}</p>
              <ul className="text-sm mb-3 space-y-1">
                {lastReceipt.items.map((i, idx) => (
                  <li key={idx} className="flex justify-between gap-2">
                    <span className="truncate">
                      {i.title} × {i.qty}
                    </span>
                    <span>£{(i.unitPrice * i.qty).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>£{lastReceipt.total.toFixed(2)}</span>
              </div>
              {lastReceipt.paymentMethod === 'cash' && (
                <>
                  <div className="flex justify-between text-sm mt-1">
                    <span>Tendered</span>
                    <span>£{lastReceipt.tendered.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>Change</span>
                    <span>£{lastReceipt.change.toFixed(2)}</span>
                  </div>
                </>
              )}
              <p className="text-xs text-slate-500 mt-1 capitalize">Paid by {lastReceipt.paymentMethod}</p>
              <button onClick={newSale} className="mt-4 w-full bg-slate-900 text-white py-2 rounded">
                New sale
              </button>
              {lastReceipt.id.startsWith('tx_') && (
                <button
                  onClick={voidLastSale}
                  className="mt-2 w-full border border-red-300 text-red-700 py-2 rounded hover:bg-red-50 text-sm"
                >
                  Void this transaction
                </button>
              )}
            </div>
          ) : mode === 'sale' ? (
            <div>
              <h2 className="font-semibold mb-2">Summary</h2>
              <div className="flex justify-between text-sm mb-1">
                <span>Items</span>
                <span>{activeItems.reduce((s, i) => s + i.qty, 0)}</span>
              </div>
              <div className="flex justify-between text-sm mb-4">
                <span>Voided items</span>
                <span>{cart.filter((i) => i.voided).length}</span>
              </div>
              <div className="flex justify-between text-2xl font-bold mb-4">
                <span>Total</span>
                <span>£{total.toFixed(2)}</span>
              </div>
              <label className="text-sm block mb-1 font-medium">Payment</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border rounded px-2 py-2 mb-3"
              >
                <option value="card">Card</option>
                <option value="cash">Cash</option>
              </select>
              {paymentMethod === 'cash' && (
                <div className="mb-4">
                  <label className="text-sm block mb-1 font-medium">Cash received</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={tenderedInput}
                    onChange={(e) => setTenderedInput(e.target.value)}
                    placeholder={total.toFixed(2)}
                    className="w-full border rounded px-2 py-2"
                  />
                  <div className="flex justify-between text-sm mt-2">
                    <span>Change</span>
                    <span className={tenderedValid ? 'font-medium' : 'text-slate-400'}>
                      £{tenderedValid ? change.toFixed(2) : '—'}
                    </span>
                  </div>
                  {tenderedInput && !tenderedValid && (
                    <p className="text-xs text-red-600 mt-1">Must be at least the total</p>
                  )}
                </div>
              )}
              <button
                disabled={!canFinalise}
                onClick={finalise}
                className="w-full bg-green-600 disabled:bg-slate-300 text-white py-3 rounded font-semibold hover:bg-green-700"
              >
                {submitting ? 'Processing…' : 'Finalise sale'}
              </button>
            </div>
          ) : (
            <div className="text-sm text-slate-500">
              Look up a past transaction on the left to process a return.
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

interface OriginalItem {
  bookId: string;
  title: string;
  category: string;
  unitPrice: number;
  qty: number;
  voided: boolean;
}

function RefundPanel({
  user,
  refundLookupId,
  setRefundLookupId,
  onComplete,
  setMessage,
}: {
  user: SessionUser;
  refundLookupId: string;
  setRefundLookupId: (v: string) => void;
  onComplete: (rec: Receipt) => void;
  setMessage: (s: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [original, setOriginal] = useState<{
    id: string;
    items: OriginalItem[];
    paymentMethod: string;
    status: string;
    type: string;
  } | null>(null);
  const [qtyByBook, setQtyByBook] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  async function lookup() {
    setLoading(true);
    setOriginal(null);
    try {
      const res = await fetch('/api/transactions');
      const data = await res.json();
      const tx = data.transactions.find(
        (t: { id: string }) => t.id.trim() === refundLookupId.trim()
      );
      if (!tx) {
        setMessage('Transaction not found');
        return;
      }
      if (tx.status !== 'finalised' || tx.type !== 'sale') {
        setMessage('Only finalised sales can be refunded');
        return;
      }
      const items: OriginalItem[] = data.items.filter(
        (i: { transactionId: string; voided: boolean }) => i.transactionId === tx.id && !i.voided
      );
      if (!items.length) {
        setMessage('Transaction has no refundable items');
        return;
      }
      setOriginal({ id: tx.id, items, paymentMethod: tx.paymentMethod, status: tx.status, type: tx.type });
      const initial: Record<string, number> = {};
      for (const it of items) initial[it.bookId] = 0;
      setQtyByBook(initial);
      setMessage('');
    } finally {
      setLoading(false);
    }
  }

  async function submitRefund() {
    if (!original) return;
    const refundItems = Object.entries(qtyByBook)
      .filter(([, q]) => q > 0)
      .map(([bookId, qty]) => ({ bookId, qty }));
    if (!refundItems.length) {
      setMessage('Choose at least one book to return');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: user.id,
          staffName: user.name,
          paymentMethod: original.paymentMethod,
          mode: 'refund',
          refundOfId: original.id,
          refundItems,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.error || 'Refund failed');
        return;
      }
      const receiptItems: CartItem[] = refundItems.map((ri) => {
        const src = original.items.find((o) => o.bookId === ri.bookId)!;
        return {
          bookId: ri.bookId,
          isbn: '',
          title: src.title,
          category: src.category,
          unitPrice: src.unitPrice,
          qty: ri.qty,
          voided: false,
        };
      });
      onComplete({
        id: data.transaction.id,
        total: data.transaction.total,
        items: receiptItems,
        paymentMethod: original.paymentMethod,
        tendered: 0,
        change: 0,
      });
      setRefundLookupId('');
      setOriginal(null);
      setMessage('Refund processed and stock restored');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2 className="font-semibold mb-2">Return / Refund</h2>
      <p className="text-xs text-slate-500 mb-3">
        Enter the transaction ID from the receipt. Choose how many of each item the customer is returning.
      </p>
      <div className="flex gap-2 mb-3">
        <input
          value={refundLookupId}
          onChange={(e) => setRefundLookupId(e.target.value)}
          placeholder="tx_..."
          className="flex-1 border rounded px-3 py-2 font-mono text-sm"
        />
        <button
          onClick={lookup}
          disabled={loading || !refundLookupId.trim()}
          className="px-4 bg-slate-900 text-white rounded disabled:bg-slate-400"
        >
          {loading ? '…' : 'Look up'}
        </button>
      </div>
      {original && (
        <div>
          <ul className="divide-y mb-3">
            {original.items.map((it) => {
              const q = qtyByBook[it.bookId] ?? 0;
              return (
                <li key={it.bookId} className="py-2 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{it.title}</p>
                    <p className="text-xs text-slate-500">
                      Sold: {it.qty} · £{it.unitPrice.toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setQtyByBook((p) => ({ ...p, [it.bookId]: Math.max(0, (p[it.bookId] ?? 0) - 1) }))
                    }
                    className="w-7 h-7 rounded border hover:bg-slate-50"
                  >
                    −
                  </button>
                  <span className="w-6 text-center">{q}</span>
                  <button
                    onClick={() =>
                      setQtyByBook((p) => ({ ...p, [it.bookId]: Math.min(it.qty, (p[it.bookId] ?? 0) + 1) }))
                    }
                    className="w-7 h-7 rounded border hover:bg-slate-50"
                  >
                    +
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            onClick={submitRefund}
            disabled={submitting}
            className="w-full bg-red-600 disabled:bg-slate-300 text-white py-2 rounded font-semibold hover:bg-red-700"
          >
            {submitting ? 'Processing…' : 'Process refund'}
          </button>
        </div>
      )}
    </div>
  );
}
