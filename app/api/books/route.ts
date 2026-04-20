import { NextResponse } from 'next/server';
import { getBooks, setBookStock, createBook } from '@/lib/db';
import { rateLimit, clientKey } from '@/lib/rateLimit';
import { isValidIsbn, normalizeIsbn } from '@/lib/isbn';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const rl = rateLimit('books:get:' + clientKey(req), 120, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }
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

export async function PATCH(req: Request) {
  const rl = rateLimit('books:write:' + clientKey(req), 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }
  const body = await req.json();
  const { id, stock } = body ?? {};
  if (typeof id !== 'string' || typeof stock !== 'number' || !Number.isFinite(stock) || stock < 0) {
    return NextResponse.json({ error: 'Invalid id or stock' }, { status: 400 });
  }
  const updated = setBookStock(id, stock);
  if (!updated) return NextResponse.json({ error: 'Book not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function POST(req: Request) {
  const rl = rateLimit('books:write:' + clientKey(req), 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const {
    isbn,
    title,
    author,
    category,
    price,
    stock,
    condition,
    year,
    firstEdition,
  } = body as Record<string, unknown>;

  if (typeof isbn !== 'string' || !isValidIsbn(isbn)) {
    return NextResponse.json({ error: 'Invalid ISBN' }, { status: 400 });
  }
  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }
  if (typeof author !== 'string' || !author.trim()) {
    return NextResponse.json({ error: 'Author is required' }, { status: 400 });
  }
  if (typeof category !== 'string' || !category.trim()) {
    return NextResponse.json({ error: 'Category is required' }, { status: 400 });
  }
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
  }
  if (typeof stock !== 'number' || !Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) {
    return NextResponse.json({ error: 'Stock must be a non-negative integer' }, { status: 400 });
  }

  try {
    const book = createBook({
      isbn: normalizeIsbn(isbn),
      title: title.trim(),
      author: author.trim(),
      category: category.trim(),
      price: Math.round(price * 100) / 100,
      stock,
      condition: typeof condition === 'string' ? condition : 'new',
      year: typeof year === 'number' && Number.isFinite(year) ? Math.floor(year) : 0,
      firstEdition: firstEdition === true,
    });
    return NextResponse.json(book, { status: 201 });
  } catch (e) {
    if ((e as Error).message === 'DUPLICATE_ISBN') {
      return NextResponse.json({ error: 'ISBN already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create book' }, { status: 500 });
  }
}
