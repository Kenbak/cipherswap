import { NextRequest, NextResponse } from 'next/server';
import { DEPOSIT_ADDRESS_RE, DEPOSIT_MEMO_RE } from '@/lib/near-intents';

const ONECLICK_BASE = 'https://1click.chaindefuser.com/v0';
const API_KEY = process.env.NEAR_ONECLICK_API_KEY || process.env.NEAR_INTENTS_API_KEY;

function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function GET(req: NextRequest) {
  if (!API_KEY) return fail('Swap API not configured', 503);

  const depositAddress = req.nextUrl.searchParams.get('depositAddress');
  const depositMemo = req.nextUrl.searchParams.get('depositMemo');
  if (!depositAddress || !DEPOSIT_ADDRESS_RE.test(depositAddress)) return fail('Valid depositAddress required', 400);
  if (depositMemo && !DEPOSIT_MEMO_RE.test(depositMemo)) return fail('Invalid depositMemo', 400);

  const qs = new URLSearchParams({ depositAddress });
  if (depositMemo) qs.set('depositMemo', depositMemo);

  try {
    const res = await fetch(`${ONECLICK_BASE}/status?${qs}`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      cache: 'no-store',
    });

    const text = await res.text();
    let data: Record<string, unknown> | null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (res.status === 404) return fail('No swap found for this deposit address', 404);
    if (!res.ok) {
      console.error('Swap status upstream error:', res.status);
      return fail(typeof data?.message === 'string' ? (data.message as string) : `Status service returned ${res.status}`, 502);
    }

    return NextResponse.json({ success: true, ...data }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('Swap status request failed:', error instanceof Error ? error.message : error);
    return fail('Could not reach the status service', 502);
  }
}
