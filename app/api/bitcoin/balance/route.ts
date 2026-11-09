import { NextRequest, NextResponse } from 'next/server';
import { getBitcoinBalanceSats, isValidBitcoinAddress } from '@/lib/exposure/bitcoin';

/** Reads a balance server-side so the user's IP and address are never paired at a block explorer. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const address = typeof body?.address === 'string' ? body.address.trim() : '';
  if (!isValidBitcoinAddress(address)) {
    return NextResponse.json({ success: false, error: 'Invalid Bitcoin address' }, { status: 400 });
  }

  try {
    const sats = await getBitcoinBalanceSats(address);
    return NextResponse.json({ success: true, sats: String(sats) }, { headers: { 'cache-control': 'no-store' } });
  } catch {
    return NextResponse.json({ success: false, error: 'Balance unavailable' }, { status: 502 });
  }
}
