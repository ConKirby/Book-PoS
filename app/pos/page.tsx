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

function NavHeader({ user, active, onLogout }: { user: SessionUser; active: string; onLogout: () => void }) {
  return (
    <header className="bg-emerald-900 text-white px-6 py-3.5 flex items-center justify-between gap-4 flex-wrap shadow-md">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">📚</span>
          <h1 className="text-base font-semibold tracking-tight">Bookshop PoS</h1>
        </div>
        <nav className="flex gap-1 bg-emerald-950/60 rounded-lg p-1 text-sm">
          {user.role === 'manager' && (
            <a href="/dashboard" className={`px-3 py-1.5 rounded-md transition-colors ${active === 'dashboard' ? 'bg-emerald-700 font-medium' : 'hover:bg-emerald-800/60'}`}>
              Dashboard
            </a>
          )}
          <a href="/inventory" className={`px-3 py-1.5 rounded-md transition-colors ${active === 'inventory' ? 'bg-emerald-700 font-medium' : 'hover:bg-emerald-800/60'}`}>
            Inventory
          </a>
          <a href="/pos" className={`px-3 py-1.5 rounded-md transition-colors ${active === 'pos' ? 'bg-emerald-700 font-medium' : 'hover:bg-emerald-800/60'}`}>
            Till
          </a>
        </nav>
      </div>
      <div className="text-sm flex items-center gap-4">
        <span className="text-emerald-200">{user.name}</span>
        <button type="button" onClick={onLogout} className="text-emerald-300 hover:text-white transition-colors underline underline-offset-2">
          Sign out
        </button>
      </div>
    </header>
  );
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
    <div className="min-h-screen bg-stone-50">
      <NavHeader user={user} active="pos" onLogout={logout} />
      <main className="p-5 max-w-6xl mx-auto grid md:grid-cols-5 gap-5">
        <section className="md:col-span-3 bg-white rounded-2xl shadow-sm ring-1 ring-stone-100 p-5">
          <div className="flex gap-1 mb-4 bg-stone-100 p-1 rounded-xl text-sm w-fit">
            <button
              type="button"
              onClick={() => setMode('sale')}
              className={`px-4 py-1.5 rounded-lg font-medium transition-all ${mode === 'sale' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Sale
            </button>
            <button
              type="button"
              onClick={() => setMode('refund')}
              className={`px-4 py-1.5 rounded-lg font-medium transition-all ${mode === 'refund' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
            >
              Refund / Return
            </button>
          </div>

          {mode === 'sale' ? (
            <>
              <form onSubmit={handleScan} className="flex gap-2 mb-5">
                <input
                  ref={scanRef}
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="Scan or type ISBN and press Enter…"
                  className="flex-1 border border-stone-200 rounded-xl px-4 py-3 text-base text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm"
                  autoFocus
                />
                <button type="submit" className="px-5 bg-emerald-700 text-white rounded-xl font-medium hover:bg-emerald-800 transition-colors shadow-sm">
                  Add
                </button>
              </form>

              {message && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-2.5 rounded-lg mb-4">
                  {message}
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-stone-900">
                  Cart
                  {activeItems.length > 0 && (
                    <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                      {activeItems.reduce((s, i) => s + i.qty, 0)} items
                    </span>
                  )}
                </h2>
                {cart.length > 0 && !lastReceipt && (
                  <button type="button" onClick={clearCart} className="text-xs text-stone-400 hover:text-red-500 transition-colors">
                    Clear all
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12 text-stone-400">
                  <p className="text-3xl mb-2">🛒</p>
                  <p className="text-sm">No items scanned yet</p>
                </div>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {cart.map((item, idx) => (
                    <li
                      key={idx}
                      className={`py-3 flex items-center gap-3 ${item.voided ? 'opacity-40' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-stone-900 truncate ${item.voided ? 'line-through' : ''}`}>{item.title}</p>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {item.isbn} · <span className="capitalize">{item.category.replace('-', ' ')}</span> · €{item.unitPrice.toFixed(2)} each
                        </p>
                      </div>
                      {!item.voided ? (
                        <>
                          <div className="flex items-center gap-1.5 bg-stone-100 rounded-lg p-1">
                            <button
                              type="button"
                              onClick={() => changeQty(idx, -1)}
                              className="w-7 h-7 rounded-md hover:bg-white hover:shadow-sm transition-all text-stone-600 font-medium flex items-center justify-center"
                            >
                              −
                            </button>
                            <span className="w-6 text-center text-sm font-medium text-stone-900">{item.qty}</span>
                            <button
                              type="button"
                              onClick={() => changeQty(idx, 1)}
                              className="w-7 h-7 rounded-md hover:bg-white hover:shadow-sm transition-all text-stone-600 font-medium flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                          <span className="w-20 text-right font-semibold text-stone-900">
                            €{(item.unitPrice * item.qty).toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => voidItem(idx)}
                            className="text-stone-300 hover:text-red-500 transition-colors text-lg leading-none"
                            title="Void item"
                          >
                            ×
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-stone-400 bg-stone-100 px-2 py-1 rounded">voided</span>
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

        <aside className="md:col-span-2 bg-white rounded-2xl shadow-sm ring-1 ring-stone-100 p-5">
          {lastReceipt ? (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🧾</span>
                <h2 className="font-semibold text-stone-900">Receipt</h2>
              </div>
              <p className="text-xs text-stone-400 font-mono break-all mb-4">{lastReceipt.id}</p>
              <ul className="text-sm mb-4 space-y-1.5">
                {lastReceipt.items.map((i, idx) => (
                  <li key={idx} className="flex justify-between gap-2 text-stone-700">
                    <span className="truncate">{i.title} × {i.qty}</span>
                    <span className="font-medium">€{(i.unitPrice * i.qty).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-stone-100 pt-3 flex justify-between font-bold text-xl text-stone-900">
                <span>Total</span>
                <span>€{lastReceipt.total.toFixed(2)}</span>
              </div>
              {lastReceipt.paymentMethod === 'cash' && (
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between text-stone-500">
                    <span>Tendered</span>
                    <span>€{lastReceipt.tendered.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-emerald-700">
                    <span>Change</span>
                    <span>€{lastReceipt.change.toFixed(2)}</span>
                  </div>
                </div>
              )}
              <p className="text-xs text-stone-400 mt-2 capitalize">Paid by {lastReceipt.paymentMethod}</p>
              <button
                type="button"
                onClick={newSale}
                className="mt-5 w-full bg-emerald-700 text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-800 transition-colors shadow-sm"
              >
                New sale
              </button>
              {lastReceipt.id.startsWith('tx_') && (
                <button
                  type="button"
                  onClick={voidLastSale}
                  className="mt-2 w-full border border-red-200 text-red-600 py-2 rounded-xl hover:bg-red-50 transition-colors text-sm font-medium"
                >
                  Void this transaction
                </button>
              )}
            </div>
          ) : mode === 'sale' ? (
            <div>
              <h2 className="font-semibold text-stone-900 mb-4">Summary</h2>
              <div className="space-y-2 mb-5">
                <div className="flex justify-between text-sm text-stone-500">
                  <span>Items</span>
                  <span className="font-medium text-stone-900">{activeItems.reduce((s, i) => s + i.qty, 0)}</span>
                </div>
                <div className="flex justify-between text-sm text-stone-500">
                  <span>Voided</span>
                  <span className="font-medium text-stone-900">{cart.filter((i) => i.voided).length}</span>
                </div>
              </div>
              <div className="bg-stone-50 rounded-xl p-4 flex justify-between items-center mb-5">
                <span className="text-stone-500 font-medium">Total</span>
                <span className="text-3xl font-bold text-stone-900">€{total.toFixed(2)}</span>
              </div>

              <label className="text-sm font-medium text-stone-700 block mb-1.5">Payment method</label>
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${paymentMethod === 'card' ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'}`}
                >
                  💳 Card
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${paymentMethod === 'cash' ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'}`}
                >
                  💵 Cash
                </button>
              </div>

              {paymentMethod === 'cash' && (
                <div className="mb-5">
                  <label className="text-sm font-medium text-stone-700 block mb-1.5">Cash received (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={tenderedInput}
                    onChange={(e) => setTenderedInput(e.target.value)}
                    placeholder={total.toFixed(2)}
                    className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm"
                  />
                  <div className="flex justify-between text-sm mt-2.5 px-1">
                    <span className="text-stone-500">Change due</span>
                    <span className={tenderedValid ? 'font-semibold text-emerald-700' : 'text-stone-300'}>
                      €{tenderedValid ? change.toFixed(2) : '—'}
                    </span>
                  </div>
                  {tenderedInput && !tenderedValid && (
                    <p className="text-xs text-red-500 mt-1 px-1">Must be at least the total</p>
                  )}
                </div>
              )}

              <button
                type="button"
                disabled={!canFinalise}
                onClick={finalise}
                className="w-full bg-emerald-600 disabled:bg-stone-200 disabled:text-stone-400 text-white py-3.5 rounded-xl font-bold text-base hover:bg-emerald-700 transition-colors shadow-sm"
              >
                {submitting ? 'Processing…' : 'Finalise sale'}
              </button>
            </div>
          ) : (
            <div className="text-center py-12 text-stone-400">
              <p className="text-3xl mb-2">↩️</p>
              <p className="text-sm">Look up a past transaction on the left to process a return.</p>
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
      <h2 className="font-semibold text-stone-900 mb-1">Return / Refund</h2>
      <p className="text-xs text-stone-400 mb-4">
        Enter the transaction ID from the receipt, then select how many of each item to return.
      </p>
      <div className="flex gap-2 mb-4">
        <input
          value={refundLookupId}
          onChange={(e) => setRefundLookupId(e.target.value)}
          placeholder="tx_..."
          className="flex-1 border border-stone-200 rounded-xl px-3.5 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm"
        />
        <button
          type="button"
          onClick={lookup}
          disabled={loading || !refundLookupId.trim()}
          className="px-5 bg-emerald-700 text-white rounded-xl font-medium hover:bg-emerald-800 disabled:bg-stone-200 disabled:text-stone-400 transition-colors shadow-sm"
        >
          {loading ? '…' : 'Look up'}
        </button>
      </div>
      {original && (
        <div>
          <ul className="divide-y divide-stone-100 mb-4">
            {original.items.map((it) => {
              const q = qtyByBook[it.bookId] ?? 0;
              return (
                <li key={it.bookId} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-900 truncate">{it.title}</p>
                    <p className="text-xs text-stone-400">
                      Sold: {it.qty} · €{it.unitPrice.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-stone-100 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() =>
                        setQtyByBook((p) => ({ ...p, [it.bookId]: Math.max(0, (p[it.bookId] ?? 0) - 1) }))
                      }
                      className="w-7 h-7 rounded-md hover:bg-white hover:shadow-sm transition-all flex items-center justify-center text-stone-600"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-medium text-stone-900">{q}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setQtyByBook((p) => ({ ...p, [it.bookId]: Math.min(it.qty, (p[it.bookId] ?? 0) + 1) }))
                      }
                      className="w-7 h-7 rounded-md hover:bg-white hover:shadow-sm transition-all flex items-center justify-center text-stone-600"
                    >
                      +
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={submitRefund}
            disabled={submitting}
            className="w-full bg-red-500 disabled:bg-stone-200 disabled:text-stone-400 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition-colors shadow-sm"
          >
            {submitting ? 'Processing…' : 'Process refund'}
          </button>
        </div>
      )}
    </div>
  );
}
