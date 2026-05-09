import { NextResponse } from 'next/server';

const ONECLICK_BASE = 'https://1click.chaindefuser.com/v0';
const API_KEY = process.env.NEAR_ONECLICK_API_KEY || process.env.NEAR_INTENTS_API_KEY;

let tokensCache: any = null;
let tokensCacheTime = 0;
const TOKENS_TTL = 10 * 60 * 1000;

export async function GET() {
  try {
    if (!API_KEY) {
      return NextResponse.json({ success: false, error: 'Swap API not configured' }, { status: 503 });
    }

    const now = Date.now();
    if (!tokensCache || now - tokensCacheTime > TOKENS_TTL) {
      const res = await fetch(`${ONECLICK_BASE}/tokens`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`1-Click API ${res.status}: ${text}`);
      }

      tokensCache = await res.json();
      tokensCacheTime = now;
    }

    const zecTokens = tokensCache.filter((t: any) =>
      t.defuseAssetId?.toLowerCase().includes('zec') ||
      t.chainName?.toLowerCase().includes('zcash')
    );

    return NextResponse.json({ success: true, tokens: tokensCache, zecTokens });
  } catch (error: any) {
    console.error('Swap tokens error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
