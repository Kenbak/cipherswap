import { NextRequest, NextResponse } from 'next/server';

const ONECLICK_BASE = 'https://1click.chaindefuser.com/v0';
const API_KEY = process.env.NEAR_ONECLICK_API_KEY || process.env.NEAR_INTENTS_API_KEY;

export async function GET(req: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ success: false, error: 'Swap API not configured' }, { status: 503 });
    }

    const depositAddress = req.nextUrl.searchParams.get('depositAddress');
    if (!depositAddress) {
      return NextResponse.json({ success: false, error: 'depositAddress required' }, { status: 400 });
    }

    const res = await fetch(`${ONECLICK_BASE}/status?depositAddress=${encodeURIComponent(depositAddress)}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`1-Click API ${res.status}: ${text}`);
    }

    const status = await res.json();
    return NextResponse.json({ success: true, ...status });
  } catch (error: any) {
    console.error('Swap status error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
