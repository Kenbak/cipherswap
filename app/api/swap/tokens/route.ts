import { NextResponse } from 'next/server';
import { getOneClickTokens } from '@/lib/oneclick-tokens';

export async function GET() {
  try {
    const tokens = await getOneClickTokens();
    return NextResponse.json({ success: true, tokens });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token list unavailable';
    console.error('Swap tokens error:', message);
    const status = message === 'Swap API not configured' ? 503 : 502;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
