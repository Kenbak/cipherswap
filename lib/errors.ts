import { fromSmallestUnit, truncateDecimal } from './amount';

export function isUserRejection(err: unknown): boolean {
  const e = err as { code?: number; message?: string } | undefined;
  const msg = (e?.message || String(err ?? '')).toLowerCase();
  return (
    e?.code === 4001 ||
    msg.includes('user rejected') ||
    msg.includes('user denied') ||
    msg.includes('user cancelled') ||
    msg.includes('user canceled') ||
    msg.includes('rejected the request') ||
    msg.includes('request rejected')
  );
}

function firstSentence(msg: string): string {
  const clean = msg.replace(/\s+/g, ' ').trim();
  const cut = clean.split(/(?<=\.)\s|\n|Request Arguments:|Details:|Version:/)[0] ?? clean;
  return cut.length > 160 ? `${cut.slice(0, 157)}…` : cut;
}

/** Turns wallet/provider errors into one plain sentence. */
export function humanizeWalletError(err: unknown, walletName?: string | null, token?: string): string {
  const who = walletName || 'your wallet';
  if (isUserRejection(err)) return `Request rejected in ${who}. Nothing was sent.`;
  const msg = ((err as { message?: string })?.message || String(err ?? '')).toLowerCase();
  if (msg.includes('insufficient funds') || msg.includes('insufficient balance') || msg.includes('exceeds balance')) {
    return `Not enough ${token ?? 'funds'} to cover the amount plus the network fee.`;
  }
  if (msg.includes('chain') && (msg.includes('mismatch') || msg.includes('unsupported'))) {
    return `${who} is on a different network. Switch networks and try again.`;
  }
  if (msg.includes('not found') && msg.includes('extension')) return firstSentence((err as Error).message);
  if (msg.includes('locked') || msg.includes('unlock')) return `Unlock ${who} and try again.`;
  const raw = (err as { message?: string })?.message;
  return raw ? firstSentence(raw) : 'The wallet returned an unknown error.';
}

/** Rewrites 1Click quote errors using token units where the API speaks in base units. */
export function humanizeQuoteError(message: string, token?: { symbol: string; decimals: number }): string {
  const min = message.match(/try at least (\d+)/i);
  if (min && token) {
    const human = truncateDecimal(fromSmallestUnit(min[1], token.decimals), 6);
    return `Amount too small for this route. Minimum is about ${human} ${token.symbol}.`;
  }
  const lower = message.toLowerCase();
  if (lower.includes('recipient is not valid')) return 'That ZEC address was rejected. Check it and try again.';
  if (lower.includes('refundto is not valid')) return 'That refund address is not valid for this chain.';
  if (lower.includes('no quotes') || lower.includes('failed to get quote')) {
    return 'No solver offered a quote right now. Try a different amount or retry in a minute.';
  }
  return firstSentence(message);
}
