import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const SECRET_KEY = process.env.MOONPAY_SECRET_KEY?.trim();

export async function POST(req: NextRequest) {
  try {
    if (!SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: 'MoonPay signing not configured' },
        { status: 503 },
      );
    }

    const body = await req.json();
    const url = typeof body?.url === 'string' ? body.url.trim() : '';

    if (!url) {
      return NextResponse.json({ success: false, error: 'Missing url' }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid url' }, { status: 400 });
    }

    if (!parsed.hostname.endsWith('moonpay.com')) {
      return NextResponse.json({ success: false, error: 'Invalid MoonPay URL' }, { status: 400 });
    }

    const signature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(parsed.search)
      .digest('base64');

    return NextResponse.json({ success: true, signature });
  } catch (error) {
    console.error('MoonPay URL signing failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to sign URL' }, { status: 500 });
  }
}
