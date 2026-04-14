import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

export function readCsv<T = Record<string, string>>(file: string): T[] {
  const fullPath = path.join(DATA_DIR, file);
  if (!fs.existsSync(fullPath)) return [];
  const raw = fs.readFileSync(fullPath, 'utf-8').replace(/^\uFEFF/, '');
  const lines = splitLines(raw);
  if (lines.length < 2) return [];
  const headers = parseRow(lines[0]);
  const rows: T[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseRow(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => (obj[h] = values[idx] ?? ''));
    rows.push(obj as T);
  }
  return rows;
}

export function writeCsv(file: string, rows: Record<string, unknown>[], headers: string[]): void {
  const fullPath = path.join(DATA_DIR, file);
  const body = rows.map((r) => headers.map((h) => escapeCell(r[h])).join(',')).join('\n');
  fs.writeFileSync(fullPath, headers.join(',') + '\n' + (body ? body + '\n' : ''));
}

export function appendCsv(file: string, row: Record<string, unknown>, headers: string[]): void {
  const fullPath = path.join(DATA_DIR, file);
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, headers.join(',') + '\n');
  }
  const line = headers.map((h) => escapeCell(row[h])).join(',') + '\n';
  fs.appendFileSync(fullPath, line);
}

function escapeCell(val: unknown): string {
  if (val === undefined || val === null) return '';
  const s = String(val);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function splitLines(raw: string): string[] {
  const lines: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === '"') {
      inQuote = !inQuote;
      cur += c;
      continue;
    }
    if ((c === '\n' || c === '\r') && !inQuote) {
      if (c === '\r' && raw[i + 1] === '\n') i++;
      lines.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  if (cur.length > 0) lines.push(cur);
  return lines;
}

function parseRow(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuote) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === ',') {
        out.push(cur);
        cur = '';
      } else if (c === '"') {
        inQuote = true;
      } else {
        cur += c;
      }
    }
  }
  out.push(cur);
  return out;
}
