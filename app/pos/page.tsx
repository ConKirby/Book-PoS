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

interface SessionUser {
  id: string;
  name: string;
  role: string;
}

export default function PosPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [message, setMessage] = useState('');
  const [lastReceipt, setLastReceipt] = useState<{
    id: string;
    total: number;
    items: CartItem[];
    paymentMethod: string;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
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
    scanRef.current?.focus();
  }, [cart.length, lastReceipt]);

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
      setCart((prev) => {
        const existingIdx = prev.findIndex((i) => i.bookId === book.id && !i.voided);
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
  }

  const activeItems = cart.filter((i) => !i.voided);
  const subtotal = activeItems.reduce((s, i) => s + i.unitPrice * i.qty, 0);

  async function finalise() {
    if (!user) return;
    if (!activeItems.length) {
      setMessage('Cart is empty');
      return;
    }
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staffId: user.id,
        staffName: user.name,
        paymentMethod,
        items: cart,
      }),
    });
    if (!res.ok) {
      setMessage('Failed to save transaction');
      return;
    }
    const data = await res.json();
    setLastReceipt({
      id: data.transaction.id,
      total: data.transaction.total,
      items: activeItems,
      paymentMethod,
    });
    setCart([]);
    setMessage('Sale complete');
  }

  function newSale() {
    setLastReceipt(null);
    setMessage('');
  }

  function logout() {
    localStorage.removeItem('user');
    router.push('/');
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Bookshop PoS · Till</h1>
        <nav className="text-sm flex items-center gap-4">
          <a href="/inventory" className="underline">
            Inventory
          </a>
          <span>{user.name}</span>
          <button onClick={logout} className="underline">
            Sign out
          </button>
        </nav>
      </header>
      <main className="p-4 max-w-6xl mx-auto grid md:grid-cols-5 gap-4">
        <section className="md:col-span-3 bg-white rounded-lg p-4 shadow">
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
              <p className="text-xs text-slate-500 mt-1 capitalize">Paid by {lastReceipt.paymentMethod}</p>
              <button onClick={newSale} className="mt-4 w-full bg-slate-900 text-white py-2 rounded">
                New sale
              </button>
            </div>
          ) : (
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
                <span>£{subtotal.toFixed(2)}</span>
              </div>
              <label className="text-sm block mb-1 font-medium">Payment</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border rounded px-2 py-2 mb-4"
              >
                <option value="card">Card</option>
                <option value="cash">Cash</option>
              </select>
              <button
                disabled={!activeItems.length}
                onClick={finalise}
                className="w-full bg-green-600 disabled:bg-slate-300 text-white py-3 rounded font-semibold hover:bg-green-700"
              >
                Finalise sale
              </button>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
