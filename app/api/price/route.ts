import { NextResponse } from 'next/server';

let priceCache: { data: any; timestamp: number } = { data: null, timestamp: 0 };
const PRICE_CACHE_MS = 60_000;

export async function GET() {
  try {
    const now = Date.now();
    if (priceCache.data && now - priceCache.timestamp < PRICE_CACHE_MS) {
      return NextResponse.json(priceCache.data);
    }

    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=zcash&vs_currencies=usd&include_24hr_change=true',
      { next: { revalidate: 60 } }
    );

    if (!response.ok) {
      if (priceCache.data) return NextResponse.json(priceCache.data);
      return NextResponse.json({ error: 'Price service unavailable' }, { status: 502 });
    }

    const raw = await response.json();
    const data = {
      price: raw.zcash?.usd ?? null,
      change24h: raw.zcash?.usd_24h_change ?? null,
      timestamp: now,
    };

    priceCache = { data, timestamp: now };
    return NextResponse.json(data);
  } catch {
    if (priceCache.data) return NextResponse.json(priceCache.data);
    return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500 });
  }
}
