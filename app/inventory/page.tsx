'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Book } from '@/lib/types';

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

export default function InventoryPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Inventory</h1>
        <nav className="text-sm flex items-center gap-4">
          <a href={user.role === 'manager' ? '/dashboard' : '/pos'} className="underline">
            Back
          </a>
          <span>{user.name}</span>
          <button onClick={logout} className="underline">
            Sign out
          </button>
        </nav>
      </header>
      <main className="p-4 max-w-6xl mx-auto">
        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`px-3 py-1 rounded-full text-sm ${
                category === c.key ? 'bg-slate-900 text-white' : 'bg-white border hover:bg-slate-50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, author, or ISBN"
          className="w-full border rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Author</th>
                <th className="px-3 py-2">ISBN</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2 text-right">Price</th>
                <th className="px-3 py-2 text-right">Stock</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="px-3 py-2">
                    {b.title}
                    {b.firstEdition && (
                      <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                        1st ed.
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{b.author}</td>
                  <td className="px-3 py-2 font-mono text-xs">{b.isbn}</td>
                  <td className="px-3 py-2 capitalize">{b.category.replace('-', ' ')}</td>
                  <td className="px-3 py-2 text-right">£{b.price.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{b.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="p-4 text-center text-slate-400 text-sm">No books found</p>
          )}
        </div>
      </main>
    </div>
  );
}
