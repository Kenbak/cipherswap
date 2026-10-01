import { NextRequest, NextResponse } from 'next/server';

const ONECLICK_BASE = 'https://1click.chaindefuser.com/v0';
const API_KEY = process.env.NEAR_ONECLICK_API_KEY || process.env.NEAR_INTENTS_API_KEY;
const AFFILIATE_ADDRESS = 'cipherscan.near';
const AFFILIATE_FEE_BPS = 50;
const REFERRAL = 'cipherscan';

// Dry (indicative) quotes never carry user addresses upstream. These are
// checksum-valid placeholders: a zero-hash t-address and an Intents refund.
const DRY_RECIPIENT = 't1Hsc1LR8yKnbbe3twRp88p6vFfC5t7DLbs';
const DRY_REFUND = AFFILIATE_ADDRESS;

const BASE58 = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;

function isValidZecRecipient(recipient: string): boolean {
  const isTransparent = (recipient.startsWith('t1') || recipient.startsWith('t3')) && recipient.length === 35 && BASE58.test(recipient);
  const isUnified = (recipient.startsWith('u1') || recipient.startsWith('utest')) && recipient.length >= 80;
  const isSapling = (recipient.startsWith('zs') || recipient.startsWith('ztestsapling')) && recipient.length >= 70;
  return isTransparent || isUnified || isSapling;
}

function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(req: NextRequest) {
  if (!API_KEY) return fail('Swap API not configured', 503);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail('Invalid JSON body', 400);
  }

  const { originAsset, destinationAsset, amount, recipient, refundTo, slippageBps, dry } = body as {
    originAsset?: string; destinationAsset?: string; amount?: string; recipient?: string;
    refundTo?: string; slippageBps?: number; dry?: boolean;
  };
  const isDry = dry === true;

  if (!originAsset || !destinationAsset || !amount) {
    return fail('Missing required fields: originAsset, destinationAsset, amount', 400);
  }
  if (!/^\d+$/.test(String(amount)) || /^0+$/.test(String(amount))) {
    return fail('Amount must be a positive integer in the smallest unit', 400);
  }
  if (!isDry && (!recipient || !refundTo)) {
    return fail('Missing required fields: recipient, refundTo', 400);
  }
  if (!isDry && destinationAsset.includes('zec') && !isValidZecRecipient(recipient!)) {
    return fail('Invalid ZEC address. Must be a t1/t3 transparent, u1 unified, or zs sapling address.', 400);
  }

  const slippage = Math.min(500, Math.max(10, Number(slippageBps) || 100));
  const deadline = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  const quoteBody = {
    dry: isDry,
    swapType: 'EXACT_INPUT',
    slippageTolerance: slippage,
    originAsset,
    depositType: 'ORIGIN_CHAIN',
    destinationAsset,
    amount: String(amount),
    recipient: isDry ? DRY_RECIPIENT : recipient,
    recipientType: 'DESTINATION_CHAIN',
    deadline,
    quoteWaitingTimeMs: isDry ? 0 : 3000,
    appFees: [{ recipient: AFFILIATE_ADDRESS, fee: AFFILIATE_FEE_BPS }],
    referral: REFERRAL,
    refundTo: isDry ? DRY_REFUND : refundTo,
    refundType: isDry ? 'INTENTS' : 'ORIGIN_CHAIN',
  };

  try {
    const res = await fetch(`${ONECLICK_BASE}/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify(quoteBody),
      cache: 'no-store',
    });

    const text = await res.text();
    let data: Record<string, unknown> | null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!res.ok) {
      const message = typeof data?.message === 'string' ? (data.message as string) : `Quote service returned ${res.status}`;
      const status = res.status >= 400 && res.status < 500 ? 422 : 502;
      if (status === 502) console.error('Swap quote upstream error:', res.status);
      return fail(message, status);
    }

    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error('Swap quote request failed:', error instanceof Error ? error.message : error);
    return fail('Could not reach the quote service', 502);
  }
}
