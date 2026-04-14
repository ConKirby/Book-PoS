import { NextResponse } from 'next/server';
import { getBooks } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const isbn = searchParams.get('isbn');
  let books = getBooks();
  if (isbn) {
    books = books.filter((b) => b.isbn === isbn);
  } else if (category && category !== 'all') {
    books = books.filter((b) => b.category === category);
  }
  return NextResponse.json(books);
}
