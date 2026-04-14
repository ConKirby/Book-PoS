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
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <form onSubmit={handleLogin} className="bg-white rounded-lg shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1">Bookshop PoS</h1>
        <p className="text-slate-500 mb-6 text-sm">Sign in to continue</p>
        <label className="block mb-3">
          <span className="text-sm font-medium">Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
            autoFocus
            required
          />
        </label>
        <label className="block mb-4">
          <span className="text-sm font-medium">PIN</span>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
            required
          />
        </label>
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <button
          disabled={loading}
          className="w-full bg-slate-900 text-white py-2 rounded font-medium hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        <div className="text-xs text-slate-400 mt-4 space-y-1">
          <p>Demo accounts:</p>
          <p>staff / 1234 · alex / 1111 · manager / 9999</p>
        </div>
      </form>
    </div>
  );
}
