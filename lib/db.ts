import { readCsv, writeCsv, appendCsv } from './csv';
import type { Book, User, Transaction, TransactionItem } from './types';

const BOOK_HEADERS = ['id', 'isbn', 'title', 'author', 'category', 'price', 'stock', 'condition', 'year', 'firstEdition'];
const TX_HEADERS = ['id', 'timestamp', 'staffId', 'staffName', 'subtotal', 'total', 'status', 'paymentMethod', 'itemCount', 'voidedItemCount'];
const TX_ITEM_HEADERS = ['id', 'transactionId', 'bookId', 'title', 'category', 'unitPrice', 'qty', 'voided'];

export function getBooks(): Book[] {
  return readCsv<Record<string, string>>('books.csv').map((r) => ({
    id: r.id,
    isbn: r.isbn,
    title: r.title,
    author: r.author,
    category: r.category,
    price: parseFloat(r.price) || 0,
    stock: parseInt(r.stock, 10) || 0,
    condition: r.condition,
    year: parseInt(r.year, 10) || 0,
    firstEdition: r.firstEdition === 'true',
  }));
}

export function findBookByIsbn(isbn: string): Book | null {
  return getBooks().find((b) => b.isbn === isbn) || null;
}

export function updateBookStock(id: string, delta: number): void {
  const books = getBooks();
  const idx = books.findIndex((b) => b.id === id);
  if (idx === -1) return;
  books[idx].stock = Math.max(0, books[idx].stock + delta);
  const rows = books.map((b) => ({
    ...b,
    firstEdition: String(b.firstEdition),
  }));
  writeCsv('books.csv', rows, BOOK_HEADERS);
}

export function getUsers(): User[] {
  return readCsv<User>('users.csv');
}

export function authenticate(username: string, pin: string): User | null {
  return getUsers().find((u) => u.username === username && u.pin === pin) || null;
}

export function getTransactions(): Transaction[] {
  return readCsv<Record<string, string>>('transactions.csv').map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    staffId: r.staffId,
    staffName: r.staffName,
    subtotal: parseFloat(r.subtotal) || 0,
    total: parseFloat(r.total) || 0,
    status: r.status,
    paymentMethod: r.paymentMethod,
    itemCount: parseInt(r.itemCount, 10) || 0,
    voidedItemCount: parseInt(r.voidedItemCount, 10) || 0,
  }));
}

export function getTransactionItems(): TransactionItem[] {
  return readCsv<Record<string, string>>('transaction_items.csv').map((r) => ({
    id: r.id,
    transactionId: r.transactionId,
    bookId: r.bookId,
    title: r.title,
    category: r.category,
    unitPrice: parseFloat(r.unitPrice) || 0,
    qty: parseInt(r.qty, 10) || 0,
    voided: r.voided === 'true',
  }));
}

export function createTransaction(tx: Transaction, items: TransactionItem[]): void {
  appendCsv('transactions.csv', tx as unknown as Record<string, unknown>, TX_HEADERS);
  for (const item of items) {
    appendCsv(
      'transaction_items.csv',
      { ...item, voided: String(item.voided) } as unknown as Record<string, unknown>,
      TX_ITEM_HEADERS
    );
    if (!item.voided) updateBookStock(item.bookId, -item.qty);
  }
}
