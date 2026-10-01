import { formatUnits, parseUnits } from 'viem';

const DECIMAL_RE = /^\d*\.?\d*$/;

/** True when `value` is a well-formed, strictly positive decimal string. */
export function isPositiveAmount(value: string): boolean {
  if (!value || !DECIMAL_RE.test(value) || value === '.') return false;
  return /[1-9]/.test(value);
}

/**
 * Converts a user-entered decimal string to the token's smallest unit.
 * Exact (no float math) so the quoted amount always equals the sent amount.
 * Returns null for malformed input or more fractional digits than the token supports.
 */
export function toSmallestUnit(value: string, decimals: number): bigint | null {
  if (!isPositiveAmount(value)) return null;
  const normalized = value.startsWith('.') ? `0${value}` : value.endsWith('.') ? value.slice(0, -1) : value;
  const fraction = normalized.split('.')[1] ?? '';
  if (fraction.length > decimals) return null;
  try {
    return parseUnits(normalized, decimals);
  } catch {
    return null;
  }
}

export function fromSmallestUnit(value: bigint | string, decimals: number): string {
  return formatUnits(typeof value === 'string' ? BigInt(value) : value, decimals);
}

/** Trims a decimal string to at most `maxFraction` digits without rounding up. */
export function truncateDecimal(value: string, maxFraction: number): string {
  const [whole, fraction = ''] = value.split('.');
  const cut = fraction.slice(0, maxFraction).replace(/0+$/, '');
  return cut ? `${whole}.${cut}` : whole;
}

export function formatUsd(value: number | string | null | undefined): string | null {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (n == null || !Number.isFinite(n)) return null;
  if (n > 0 && n < 0.01) return '<$0.01';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

export function formatZec(value: string | number | null | undefined, maxFraction = 4): string {
  if (value == null || value === '') return '—';
  const s = typeof value === 'number' ? value.toString() : value;
  return truncateDecimal(s, maxFraction);
}
