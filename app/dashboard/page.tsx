'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Transaction, TransactionItem } from '@/lib/types';

interface SessionUser {
  id: string;
  name: string;
  role: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [data, setData] = useState<{ transactions: Transaction[]; items: TransactionItem[] } | null>(null);
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
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const res = await fetch('/api/transactions');
      if (cancelled) return;
      setData(await res.json());
    };
    load();
    const int = setInterval(load, 3000);
    return () => {
      cancelled = true;
      clearInterval(int);
    };
  }, [user]);

  function logout() {
    localStorage.removeItem('user');
    router.push('/');
  }

  if (!user || !data) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const allSales = data.transactions.filter((t) => t.type === 'sale' && t.status !== 'voided');
  const allRefunds = data.transactions.filter((t) => t.type === 'refund');
  const todayTx = data.transactions.filter((t) => t.timestamp.startsWith(today));
  const todaySales = todayTx.filter((t) => t.type === 'sale' && t.status !== 'voided');
  const todayRevenue = todaySales.reduce((s, t) => s + t.total, 0);
  const todayItems = todaySales.reduce((s, t) => s + t.itemCount, 0);
  const allRevenue = allSales.reduce((s, t) => s + t.total, 0) - allRefunds.reduce((s, t) => s + t.total, 0);
  const avgSale = todaySales.length > 0 ? todayRevenue / todaySales.length : 0;

  const activeItems = data.items.filter((i) => !i.voided);
  const byCategory: Record<string, number> = {};
  for (const i of activeItems) {
    const rev = i.unitPrice * i.qty;
    byCategory[i.category] = (byCategory[i.category] || 0) + rev;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Bookshop PoS</h1>
          <nav className="flex gap-1 bg-slate-800 rounded-md p-1 text-sm">
            <a href="/dashboard" className="px-3 py-1 rounded bg-slate-700 font-medium">
              Dashboard
            </a>
            <a href="/inventory" className="px-3 py-1 rounded hover:bg-slate-700">
              Inventory
            </a>
            <a href="/pos" className="px-3 py-1 rounded hover:bg-slate-700">
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
      <main className="p-4 max-w-6xl mx-auto">
        <p className="text-xs text-slate-500 mb-4">Live · auto-refresh every 3s</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card label="Today's revenue" value={`€${todayRevenue.toFixed(2)}`} />
          <Card label="Today's sales" value={todaySales.length.toString()} />
          <Card label="Today's items sold" value={todayItems.toString()} />
          <Card label="All-time net revenue" value={`€${allRevenue.toFixed(2)}`} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card label="Avg sale today" value={todaySales.length > 0 ? `€${avgSale.toFixed(2)}` : '—'} />
          <Card label="Refunds today" value={todayTx.filter((t) => t.type === 'refund').length.toString()} />
          <Card label="Voided today" value={todayTx.filter((t) => t.status === 'voided').length.toString()} />
          <Card label="Total transactions" value={data.transactions.length.toString()} />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <section className="bg-white rounded-lg p-4 shadow">
            <h2 className="font-semibold mb-2">Revenue by category</h2>
            {Object.keys(byCategory).length === 0 ? (
              <p className="text-slate-400 text-sm">No sales yet</p>
            ) : (
              <ul>
                {Object.entries(byCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, rev]) => (
                    <li key={cat} className="flex justify-between py-1 text-sm">
                      <span className="capitalize">{cat.replace('-', ' ')}</span>
                      <span className="font-medium">€{rev.toFixed(2)}</span>
                    </li>
                  ))}
              </ul>
            )}
          </section>
          <section className="bg-white rounded-lg p-4 shadow">
            <h2 className="font-semibold mb-2">Recent transactions</h2>
            {data.transactions.length === 0 ? (
              <p className="text-slate-400 text-sm">No transactions yet</p>
            ) : (
              <ul className="divide-y text-sm">
                {[...data.transactions].reverse().slice(0, 10).map((t) => {
                  const isToday = t.timestamp.startsWith(today);
                  const dateStr = isToday
                    ? new Date(t.timestamp).toLocaleTimeString()
                    : new Date(t.timestamp).toLocaleDateString();
                  const isRefund = t.type === 'refund';
                  const isVoided = t.status === 'voided';
                  return (
                    <li key={t.id} className="py-2 flex justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium flex items-center gap-2">
                          {dateStr}
                          {isRefund && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">refund</span>}
                          {isVoided && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">voided</span>}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {t.staffName} · {t.paymentMethod} · {t.itemCount} items
                          {t.voidedItemCount > 0 ? ` · ${t.voidedItemCount} voided` : ''}
                        </p>
                      </div>
                      <span className={`font-semibold whitespace-nowrap ${isRefund ? 'text-orange-600' : isVoided ? 'text-slate-400 line-through' : ''}`}>
                        {isRefund ? '-' : ''}€{t.total.toFixed(2)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg p-4 shadow">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
