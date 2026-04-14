export interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  category: 'general' | 'travel' | 'first-edition' | 'collectable' | string;
  price: number;
  stock: number;
  condition: string;
  year: number;
  firstEdition: boolean;
}

export interface User {
  id: string;
  username: string;
  pin: string;
  role: 'staff' | 'manager' | string;
  name: string;
}

export interface Transaction {
  id: string;
  timestamp: string;
  staffId: string;
  staffName: string;
  subtotal: number;
  total: number;
  status: 'finalised' | 'voided' | string;
  paymentMethod: 'card' | 'cash' | string;
  itemCount: number;
  voidedItemCount: number;
}

export interface TransactionItem {
  id: string;
  transactionId: string;
  bookId: string;
  title: string;
  category: string;
  unitPrice: number;
  qty: number;
  voided: boolean;
}
