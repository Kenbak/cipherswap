import { NextRequest, NextResponse } from 'next/server';

const ONECLICK_BASE = 'https://1click.chaindefuser.com/v0';
const API_KEY = process.env.NEAR_ONECLICK_API_KEY || process.env.NEAR_INTENTS_API_KEY;
const AFFILIATE_ADDRESS = 'cipherscan.near';
const AFFILIATE_FEE_BPS = 50;
const REFERRAL = 'cipherscan';

export async function POST(req: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ success: false, error: 'Swap API not configured' }, { status: 503 });
    }

    const { originAsset, destinationAsset, amount, recipient, refundTo, slippageBps } = await req.json();

    if (!originAsset || !destinationAsset || !amount || !recipient || !refundTo) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: originAsset, destinationAsset, amount, recipient, refundTo',
      }, { status: 400 });
    }

    if (destinationAsset.includes('zec')) {
      const BASE58 = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
      const isTransparent = (recipient.startsWith('t1') || recipient.startsWith('t3')) && recipient.length === 35 && BASE58.test(recipient);
      const isUnified = (recipient.startsWith('u1') || recipient.startsWith('utest')) && recipient.length >= 80;
      const isSapling = (recipient.startsWith('zs') || recipient.startsWith('ztestsapling')) && recipient.length >= 70;
      if (!isTransparent && !isUnified && !isSapling) {
        return NextResponse.json({
          success: false,
          error: 'Invalid ZEC address. Must be a t1/t3 transparent, u1 unified, or zs sapling address.',
        }, { status: 400 });
      }
    }

    const deadline = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const quoteBody = {
      dry: false,
      swapType: 'EXACT_INPUT',
      slippageTolerance: slippageBps || 100,
      originAsset,
      depositType: 'ORIGIN_CHAIN',
      destinationAsset,
      amount: String(amount),
      recipient,
      recipientType: 'DESTINATION_CHAIN',
      deadline,
      quoteWaitingTimeMs: 3000,
      appFees: [{ recipient: AFFILIATE_ADDRESS, fee: AFFILIATE_FEE_BPS }],
      referral: REFERRAL,
      refundTo,
      refundType: 'ORIGIN_CHAIN',
    };

    const res = await fetch(`${ONECLICK_BASE}/quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(quoteBody),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`1-Click API ${res.status}: ${text}`);
    }

    const quote = await res.json();
    return NextResponse.json({ success: true, ...quote });
  } catch (error: any) {
    console.error('Swap quote error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
