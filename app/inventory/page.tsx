'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Book } from '@/lib/types';
import { isValidIsbn } from '@/lib/isbn';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'general', label: 'General' },
  { key: 'travel', label: 'Travel' },
  { key: 'first-edition', label: 'First Edition' },
  { key: 'collectable', label: 'Collectable' },
];

interface SessionUser {
  id: string;
  name: string;
  role: string;
}

const BLANK_NEW_BOOK = {
  isbn: '',
  title: '',
  author: '',
  category: 'general',
  price: '',
  stock: '',
  condition: 'new',
  year: '',
  firstEdition: false,
};

export default function InventoryPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [showNewBook, setShowNewBook] = useState(false);
  const [newBook, setNewBook] = useState(BLANK_NEW_BOOK);
  const [creating, setCreating] = useState(false);
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
    fetch('/api/books?category=' + category)
      .then((r) => r.json())
      .then(setBooks);
  }, [category]);

  const filtered = books.filter((b) => {
    const q = query.toLowerCase();
    return (
      !q ||
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.isbn.includes(query)
    );
  });

  function logout() {
    localStorage.removeItem('user');
    router.push('/');
  }

  async function saveStock(id: string) {
    const raw = stockDrafts[id];
    const value = parseInt(raw, 10);
    if (!Number.isFinite(value) || value < 0) {
      setMessage('Stock must be a non-negative integer');
      return;
    }
    setSavingId(id);
    setMessage('');
    try {
      const res = await fetch('/api/books', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, stock: value }),
      });
      if (!res.ok) throw new Error('save failed');
      const updated: Book = await res.json();
      setBooks((prev) => prev.map((b) => (b.id === id ? updated : b)));
      setStockDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setMessage('Stock updated');
    } catch {
      setMessage('Failed to save stock');
    } finally {
      setSavingId(null);
    }
  }

  async function createNewBook() {
    const price = parseFloat(newBook.price);
    const stock = parseInt(newBook.stock, 10);
    const year = newBook.year ? parseInt(newBook.year, 10) : 0;

    if (!isValidIsbn(newBook.isbn)) {
      setMessage('Invalid ISBN (check digit must verify)');
      return;
    }
    if (!newBook.title.trim() || !newBook.author.trim()) {
      setMessage('Title and author are required');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setMessage('Price must be a positive number');
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      setMessage('Stock must be a non-negative integer');
      return;
    }

    setCreating(true);
    setMessage('');
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isbn: newBook.isbn,
          title: newBook.title,
          author: newBook.author,
          category: newBook.category,
          price,
          stock,
          condition: newBook.condition,
          year,
          firstEdition: newBook.firstEdition,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.error || 'Failed to create book');
        return;
      }
      setBooks((prev) => [...prev, data as Book]);
      setNewBook(BLANK_NEW_BOOK);
      setShowNewBook(false);
      setMessage(`Added "${data.title}" to inventory`);
    } catch {
      setMessage('Failed to create book');
    } finally {
      setCreating(false);
    }
  }

  if (!user) return null;
  const isManager = user.role === 'manager';

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-emerald-900 text-white px-6 py-3.5 flex items-center justify-between gap-4 flex-wrap shadow-md">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📚</span>
            <h1 className="text-base font-semibold tracking-tight">Bookshop PoS</h1>
          </div>
          <nav className="flex gap-1 bg-emerald-950/60 rounded-lg p-1 text-sm">
            {isManager && (
              <a href="/dashboard" className="px-3 py-1.5 rounded-md transition-colors hover:bg-emerald-800/60">
                Dashboard
              </a>
            )}
            <a href="/inventory" className="px-3 py-1.5 rounded-md transition-colors bg-emerald-700 font-medium">
              Inventory
            </a>
            <a href="/pos" className="px-3 py-1.5 rounded-md transition-colors hover:bg-emerald-800/60">
              Till
            </a>
          </nav>
        </div>
        <div className="text-sm flex items-center gap-4">
          <span className="text-emerald-200">{user.name}</span>
          <button onClick={logout} className="text-emerald-300 hover:text-white transition-colors underline underline-offset-2">
            Sign out
          </button>
        </div>
      </header>
      <main className="p-5 max-w-6xl mx-auto">
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                category === c.key
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50'
              }`}
            >
              {c.label}
            </button>
          ))}
          {isManager && (
            <button
              onClick={() => setShowNewBook((v) => !v)}
              className="ml-auto px-3.5 py-1.5 rounded-lg text-sm font-medium bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-sm"
            >
              {showNewBook ? 'Cancel' : '+ New book'}
            </button>
          )}
        </div>
        {isManager && showNewBook && (
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-stone-100 p-5 mb-4 grid md:grid-cols-3 gap-3">
            <label className="text-sm">
              <span className="block mb-1.5 font-medium text-stone-700">ISBN</span>
              <input
                value={newBook.isbn}
                onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm"
                placeholder="978..."
              />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="block mb-1.5 font-medium text-stone-700">Title</span>
              <input
                value={newBook.title}
                onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm"
              />
            </label>
            <label className="text-sm">
              <span className="block mb-1.5 font-medium text-stone-700">Author</span>
              <input
                value={newBook.author}
                onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm"
              />
            </label>
            <label className="text-sm">
              <span className="block mb-1.5 font-medium text-stone-700">Category</span>
              <select
                value={newBook.category}
                onChange={(e) => setNewBook({ ...newBook, category: e.target.value })}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm"
              >
                <option value="general">General</option>
                <option value="travel">Travel</option>
                <option value="first-edition">First edition</option>
                <option value="collectable">Collectable</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="block mb-1.5 font-medium text-stone-700">Condition</span>
              <select
                value={newBook.condition}
                onChange={(e) => setNewBook({ ...newBook, condition: e.target.value })}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm"
              >
                <option value="new">New</option>
                <option value="fine">Fine</option>
                <option value="very good">Very good</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="block mb-1.5 font-medium text-stone-700">Price (€)</span>
              <input
                type="number"
                step="0.01"
                min={0}
                value={newBook.price}
                onChange={(e) => setNewBook({ ...newBook, price: e.target.value })}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm"
              />
            </label>
            <label className="text-sm">
              <span className="block mb-1.5 font-medium text-stone-700">Stock</span>
              <input
                type="number"
                min={0}
                value={newBook.stock}
                onChange={(e) => setNewBook({ ...newBook, stock: e.target.value })}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm"
              />
            </label>
            <label className="text-sm">
              <span className="block mb-1.5 font-medium text-stone-700">Year</span>
              <input
                type="number"
                value={newBook.year}
                onChange={(e) => setNewBook({ ...newBook, year: e.target.value })}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm"
              />
            </label>
            <label className="text-sm flex items-center gap-2 mt-5">
              <input
                type="checkbox"
                checked={newBook.firstEdition}
                onChange={(e) => setNewBook({ ...newBook, firstEdition: e.target.checked })}
                className="accent-emerald-700"
              />
              <span className="text-stone-700">First edition</span>
            </label>
            <div className="md:col-span-3 flex justify-end">
              <button
                onClick={createNewBook}
                disabled={creating}
                className="px-5 py-2 bg-emerald-700 text-white rounded-xl font-semibold hover:bg-emerald-800 transition-colors shadow-sm disabled:bg-stone-200 disabled:text-stone-400"
              >
                {creating ? 'Adding…' : 'Add book'}
              </button>
            </div>
          </div>
        )}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, author, or ISBN"
          className="w-full border border-stone-200 rounded-xl px-4 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm"
        />
        {message && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-2.5 rounded-lg mb-3">
            {message}
          </div>
        )}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-stone-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left border-b border-stone-100">
              <tr>
                <th className="px-4 py-3 font-medium text-stone-500">Title</th>
                <th className="px-4 py-3 font-medium text-stone-500">Author</th>
                <th className="px-4 py-3 font-medium text-stone-500">ISBN</th>
                <th className="px-4 py-3 font-medium text-stone-500">Category</th>
                <th className="px-4 py-3 font-medium text-stone-500">Condition</th>
                <th className="px-4 py-3 font-medium text-stone-500 text-right">Year</th>
                <th className="px-4 py-3 font-medium text-stone-500 text-right">Price</th>
                <th className="px-4 py-3 font-medium text-stone-500 text-right">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((b) => {
                const draft = stockDrafts[b.id];
                const draftNum = draft === undefined ? b.stock : parseInt(draft, 10);
                const dirty = draft !== undefined && draftNum !== b.stock;
                return (
                  <tr key={b.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-4 py-3 text-stone-900">
                      {b.title}
                      {b.firstEdition && (
                        <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          1st ed.
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-700">{b.author}</td>
                    <td className="px-4 py-3 font-mono text-xs text-stone-500">{b.isbn}</td>
                    <td className="px-4 py-3 capitalize text-stone-600">{b.category.replace('-', ' ')}</td>
                    <td className="px-4 py-3 capitalize text-stone-500">{b.condition}</td>
                    <td className="px-4 py-3 text-right text-stone-400">{b.year || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-stone-900">€{b.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      {isManager ? (
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            min={0}
                            aria-label="Stock quantity"
                            value={draft === undefined ? b.stock : draft}
                            onChange={(e) =>
                              setStockDrafts((prev) => ({ ...prev, [b.id]: e.target.value }))
                            }
                            className={`w-20 border rounded-lg px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm ${b.stock <= 2 ? 'border-amber-300 bg-amber-50' : 'border-stone-200'}`}
                          />
                          {dirty && (
                            <button
                              type="button"
                              onClick={() => saveStock(b.id)}
                              disabled={savingId === b.id}
                              className="text-xs px-2.5 py-1 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors disabled:bg-stone-200 disabled:text-stone-400 shadow-sm"
                            >
                              {savingId === b.id ? '…' : 'Save'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className={b.stock <= 2 ? 'text-amber-600 font-semibold' : 'text-stone-900'}>{b.stock}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="p-8 text-center text-stone-400 text-sm">No books found</p>
          )}
        </div>
      </main>
    </div>
  );
}
