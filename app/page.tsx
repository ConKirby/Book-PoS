'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const u = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (u) {
      try {
        const user = JSON.parse(u);
        router.push(user.role === 'manager' ? '/dashboard' : '/pos');
      } catch {
        localStorage.removeItem('user');
      }
    }
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin }),
      });
      if (!res.ok) {
        setError('Invalid username or PIN');
        return;
      }
      const user = await res.json();
      localStorage.setItem('user', JSON.stringify(user));
      router.push(user.role === 'manager' ? '/dashboard' : '/pos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-stone-50">
      <div className="hidden md:flex md:w-1/2 bg-emerald-900 flex-col justify-between p-12 text-white">
        <div className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <span className="text-3xl">📚</span>
          Bookshop PoS
        </div>
        <div>
          <blockquote className="text-emerald-100 text-lg italic leading-relaxed">
            &ldquo;A room without books is like a body without a soul.&rdquo;
          </blockquote>
          <p className="text-emerald-400 text-sm mt-2">— Marcus Tullius Cicero</p>
        </div>
        <p className="text-emerald-500 text-xs">Collectable & First Edition Booksellers</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="md:hidden text-center mb-8">
            <span className="text-4xl">📚</span>
            <h1 className="text-2xl font-bold text-stone-900 mt-2 tracking-tight">Bookshop PoS</h1>
          </div>

          <h2 className="text-2xl font-bold text-stone-900 tracking-tight mb-1">Welcome back</h2>
          <p className="text-stone-500 text-sm mb-8">Sign in with your username and PIN</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <label className="block">
              <span className="text-sm font-medium text-stone-700">Username</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1.5 w-full border border-stone-200 rounded-lg px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white shadow-sm"
                autoFocus
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-stone-700">PIN</span>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="mt-1.5 w-full border border-stone-200 rounded-lg px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white shadow-sm"
                required
              />
            </label>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-700 text-white py-2.5 rounded-lg font-semibold hover:bg-emerald-800 disabled:opacity-60 transition-colors shadow-sm"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-stone-100 text-xs text-stone-400 space-y-1">
            <p className="font-medium text-stone-500">Demo accounts</p>
            <p>staff / 1234 · alex / 1111 · manager / 9999</p>
          </div>
        </div>
      </div>
    </div>
  );
}
