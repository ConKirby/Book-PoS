import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bookshop PoS',
  description: 'Point of Sale system for a collectable bookshop',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased text-slate-900" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
