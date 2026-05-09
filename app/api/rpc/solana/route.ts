import { NextRequest, NextResponse } from 'next/server';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '';
const HELIUS_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

const ALLOWED_METHODS = new Set([
  'getBalance',
  'getTokenAccountsByOwner',
  'getLatestBlockhash',
  'getAccountInfo',
  'getRecentBlockhash',
]);

export async function POST(req: NextRequest) {
  try {
    if (!HELIUS_API_KEY) {
      return NextResponse.json(
        { jsonrpc: '2.0', error: { code: -32603, message: 'Solana RPC not configured' }, id: null },
        { status: 503 },
      );
    }

    const body = await req.json();
    if (!body.method || !ALLOWED_METHODS.has(body.method)) {
      return NextResponse.json(
        { jsonrpc: '2.0', error: { code: -32601, message: 'Method not allowed' }, id: body.id ?? null },
        { status: 400 },
      );
    }

    const res = await fetch(HELIUS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32603, message: error.message || 'Internal error' }, id: null },
      { status: 500 },
    );
  }
}
