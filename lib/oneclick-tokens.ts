const ONECLICK_BASE = 'https://1click.chaindefuser.com/v0';
const TOKENS_TTL_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 8000;

export interface OneClickToken {
  assetId: string;
  decimals: number;
  blockchain: string;
  symbol: string;
  price?: number;
  priceUpdatedAt?: string;
  contractAddress?: string;
}

let cache: { tokens: OneClickToken[]; at: number } | null = null;

/** Server-only. Shared by the tokens API route and server-rendered pages so pages never fetch their own API. */
export async function getOneClickTokens(): Promise<OneClickToken[]> {
  if (cache && Date.now() - cache.at < TOKENS_TTL_MS) return cache.tokens;
  const key = process.env.NEAR_ONECLICK_API_KEY || process.env.NEAR_INTENTS_API_KEY;
  if (!key) throw new Error('Swap API not configured');

  const res = await fetch(`${ONECLICK_BASE}/tokens`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate: 600 },
  });
  if (!res.ok) throw new Error(`1-Click tokens ${res.status}`);
  const tokens = (await res.json()) as OneClickToken[];
  cache = { tokens, at: Date.now() };
  return tokens;
}
