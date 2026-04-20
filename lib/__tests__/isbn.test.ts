import { describe, it, expect } from 'vitest';
import { normalizeIsbn, isValidIsbn } from '../isbn';

describe('normalizeIsbn', () => {
  it('strips spaces and hyphens', () => {
    expect(normalizeIsbn('978-0-13-468599-1')).toBe('9780134685991');
    expect(normalizeIsbn('  978 0 13 468599 1 ')).toBe('9780134685991');
  });

  it('uppercases X check digit', () => {
    expect(normalizeIsbn('0-8044-2957-x')).toBe('080442957X');
  });
});

describe('isValidIsbn', () => {
  it('accepts a valid ISBN-13', () => {
    expect(isValidIsbn('978-0-13-468599-1')).toBe(true);
  });

  it('accepts a valid ISBN-10 with X check digit', () => {
    expect(isValidIsbn('0-8044-2957-X')).toBe(true);
  });

  it('rejects an ISBN-13 with a bad checksum', () => {
    expect(isValidIsbn('9780134685990')).toBe(false);
  });

  it('rejects an ISBN-10 with a bad checksum', () => {
    expect(isValidIsbn('0306406150')).toBe(false);
  });

  it('rejects strings that are not 10 or 13 digits', () => {
    expect(isValidIsbn('12345')).toBe(false);
    expect(isValidIsbn('')).toBe(false);
    expect(isValidIsbn('abcdefghij')).toBe(false);
  });
});
