import { readCsv, writeCsv, appendCsv } from './csv';
import type { Book, User, Transaction, TransactionItem } from './types';

const BOOK_HEADERS = ['id', 'isbn', 'title', 'author', 'category', 'price', 'stock', 'condition', 'year', 'firstEdition'];
const TX_HEADERS = [
  'id',
  'timestamp',
  'staffId',
  'staffName',
  'subtotal',
  'total',
  'status',
  'paymentMethod',
  'itemCount',
  'voidedItemCount',
  'type',
  'tendered',
  'change',
  'idempotencyKey',
  'refundOfId',
];
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

export function setBookStock(id: string, stock: number): Book | null {
  const books = getBooks();
  const idx = books.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  books[idx].stock = Math.max(0, Math.floor(stock));
  const rows = books.map((b) => ({
    ...b,
    firstEdition: String(b.firstEdition),
  }));
  writeCsv('books.csv', rows, BOOK_HEADERS);
  return books[idx];
}

export function createBook(input: Omit<Book, 'id'>): Book {
  const books = getBooks();
  if (books.some((b) => b.isbn === input.isbn)) {
    throw new Error('DUPLICATE_ISBN');
  }
  const nextNum = books.reduce((max, b) => {
    const m = /^bk_(\d+)$/.exec(b.id);
    return m ? Math.max(max, parseInt(m[1], 10)) : max;
  }, 0) + 1;
  const book: Book = { ...input, id: 'bk_' + String(nextNum).padStart(3, '0') };
  const rows = [...books, book].map((b) => ({ ...b, firstEdition: String(b.firstEdition) }));
  writeCsv('books.csv', rows, BOOK_HEADERS);
  return book;
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
    type: r.type || 'sale',
    tendered: parseFloat(r.tendered) || 0,
    change: parseFloat(r.change) || 0,
    idempotencyKey: r.idempotencyKey || '',
    refundOfId: r.refundOfId || '',
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

export function findTransactionByIdempotencyKey(key: string): Transaction | null {
  if (!key) return null;
  return getTransactions().find((t) => t.idempotencyKey === key) || null;
}

export function findTransaction(id: string): Transaction | null {
  return getTransactions().find((t) => t.id === id) || null;
}

function writeAllTransactions(txs: Transaction[]): void {
  const rows = txs.map((t) => ({ ...t } as unknown as Record<string, unknown>));
  writeCsv('transactions.csv', rows, TX_HEADERS);
}

export function createTransaction(tx: Transaction, items: TransactionItem[]): void {
  writeAllTransactions([...getTransactions(), tx]);
  for (const item of items) {
    appendCsv(
      'transaction_items.csv',
      { ...item, voided: String(item.voided) } as unknown as Record<string, unknown>,
      TX_ITEM_HEADERS
    );
    if (!item.voided) updateBookStock(item.bookId, -item.qty);
  }
}

export function voidTransaction(id: string): Transaction | null {
  const txs = getTransactions();
  const idx = txs.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const tx = txs[idx];
  if (tx.status === 'voided') return tx;
  if (tx.type !== 'sale') return null;

  const items = getTransactionItems().filter((i) => i.transactionId === id && !i.voided);
  for (const item of items) updateBookStock(item.bookId, item.qty);

  txs[idx] = { ...tx, status: 'voided' };
  writeAllTransactions(txs);
  return txs[idx];
}

export function refundTransaction(
  originalId: string,
  staffId: string,
  staffName: string,
  itemsToRefund: { bookId: string; qty: number }[]
): { transaction: Transaction; items: TransactionItem[] } | null {
  const original = findTransaction(originalId);
  if (!original || original.status !== 'finalised' || original.type !== 'sale') return null;
  const origItems = getTransactionItems().filter((i) => i.transactionId === originalId && !i.voided);

  const refundItems: TransactionItem[] = [];
  const refundTxId = 'rf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  for (let idx = 0; idx < itemsToRefund.length; idx++) {
    const req = itemsToRefund[idx];
    const orig = origItems.find((i) => i.bookId === req.bookId);
    if (!orig) return null;
    if (req.qty <= 0 || req.qty > orig.qty) return null;
    refundItems.push({
      id: refundTxId + '_' + idx,
      transactionId: refundTxId,
      bookId: orig.bookId,
      title: orig.title,
      category: orig.category,
      unitPrice: orig.unitPrice,
      qty: req.qty,
      voided: false,
    });
  }

  const subtotal = refundItems.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const refundTx: Transaction = {
    id: refundTxId,
    timestamp: new Date().toISOString(),
    staffId,
    staffName,
    subtotal: -Math.round(subtotal * 100) / 100,
    total: -Math.round(subtotal * 100) / 100,
    status: 'finalised',
    paymentMethod: original.paymentMethod,
    itemCount: refundItems.reduce((s, i) => s + i.qty, 0),
    voidedItemCount: 0,
    type: 'refund',
    tendered: 0,
    change: 0,
    idempotencyKey: '',
    refundOfId: originalId,
  };

  writeAllTransactions([...getTransactions(), refundTx]);
  for (const item of refundItems) {
    appendCsv(
      'transaction_items.csv',
      { ...item, voided: String(item.voided) } as unknown as Record<string, unknown>,
      TX_ITEM_HEADERS
    );
    updateBookStock(item.bookId, item.qty);
  }

  return { transaction: refundTx, items: refundItems };
}
