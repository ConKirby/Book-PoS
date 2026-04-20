export function normalizeIsbn(raw: string): string {
  return raw.replace(/[\s-]/g, '').toUpperCase();
}

export function isValidIsbn(raw: string): boolean {
  const s = normalizeIsbn(raw);
  if (s.length === 10) return isValidIsbn10(s);
  if (s.length === 13) return isValidIsbn13(s);
  return false;
}

function isValidIsbn10(s: string): boolean {
  if (!/^[0-9]{9}[0-9X]$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const c = s[i];
    const v = c === 'X' ? 10 : c.charCodeAt(0) - 48;
    sum += v * (10 - i);
  }
  return sum % 11 === 0;
}

function isValidIsbn13(s: string): boolean {
  if (!/^[0-9]{13}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const v = s.charCodeAt(i) - 48;
    sum += i % 2 === 0 ? v : v * 3;
  }
  return sum % 10 === 0;
}
