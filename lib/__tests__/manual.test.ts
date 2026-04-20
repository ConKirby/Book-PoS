import { describe, it, expect } from 'vitest';

/*
 * Test case: Add books to cart
 * Purpose:    Books need to be added to customers cart to be purchased
 * Explanation: The customer places order on all books in the cart
 *
 * The add-to-cart behaviour lives inside app/pos/page.tsx (handleScan,
 * lines 113-135). It's not exported, so we mirror the same pure logic
 * here and exercise it against a fake book catalogue.
 */

type Book = { id: string; isbn: string; title: string; category: string; price: number; stock: number };
type CartItem = { bookId: string; isbn: string; title: string; category: string; unitPrice: number; qty: number; voided: boolean };

type AddResult = { cart: CartItem[]; message: string };

function addToCart(cart: CartItem[], book: Book | undefined): AddResult {
  if (!book) return { cart, message: 'No book found' };
  if (book.stock <= 0) return { cart, message: `"${book.title}" is out of stock` };

  const existingIdx = cart.findIndex((i) => i.bookId === book.id && !i.voided);
  const alreadyInCart = existingIdx === -1 ? 0 : cart[existingIdx].qty;

  if (alreadyInCart + 1 > book.stock) {
    return { cart, message: `Only ${book.stock} of "${book.title}" in stock` };
  }
  if (existingIdx !== -1) {
    const next = cart.map((i, idx) => (idx === existingIdx ? { ...i, qty: i.qty + 1 } : i));
    return { cart: next, message: '' };
  }
  const next: CartItem[] = [
    ...cart,
    {
      bookId: book.id,
      isbn: book.isbn,
      title: book.title,
      category: book.category,
      unitPrice: book.price,
      qty: 1,
      voided: false,
    },
  ];
  return { cart: next, message: '' };
}

const bookA: Book = { id: 'b1', isbn: '9780000000001', title: 'Book A', category: 'fiction', price: 10, stock: 3 };
const bookB: Book = { id: 'b2', isbn: '9780000000002', title: 'Book B', category: 'non-fiction', price: 15, stock: 2 };
const outOfStock: Book = { id: 'b3', isbn: '9780000000003', title: 'Sold Out', category: 'fiction', price: 5, stock: 0 };

describe('Add books to cart', () => {
  it('adds a new book to an empty cart with qty 1', () => {
    const { cart, message } = addToCart([], bookA);
    expect(cart).toHaveLength(1);
    expect(cart[0].bookId).toBe('b1');
    expect(cart[0].qty).toBe(1);
    expect(cart[0].unitPrice).toBe(10);
    expect(message).toBe('');
  });

  it('increments quantity when the same book is scanned twice', () => {
    const first = addToCart([], bookA);
    const second = addToCart(first.cart, bookA);
    expect(second.cart).toHaveLength(1);
    expect(second.cart[0].qty).toBe(2);
  });

  it('keeps separate line items for different books', () => {
    const s1 = addToCart([], bookA);
    const s2 = addToCart(s1.cart, bookB);
    expect(s2.cart).toHaveLength(2);
    expect(s2.cart.map((i) => i.bookId)).toEqual(['b1', 'b2']);
  });

  it('refuses to add more than the available stock', () => {
    let state = addToCart([], bookB);
    state = addToCart(state.cart, bookB);
    const blocked = addToCart(state.cart, bookB);
    expect(blocked.cart[0].qty).toBe(2);
    expect(blocked.message).toMatch(/Only 2 of "Book B" in stock/);
  });

  it('refuses to add a book that is out of stock', () => {
    const { cart, message } = addToCart([], outOfStock);
    expect(cart).toHaveLength(0);
    expect(message).toMatch(/out of stock/);
  });

  it('shows an error message when the ISBN is not found', () => {
    const { cart, message } = addToCart([], undefined);
    expect(cart).toHaveLength(0);
    expect(message).toBe('No book found');
  });
});
