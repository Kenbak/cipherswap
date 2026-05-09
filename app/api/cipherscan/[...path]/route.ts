import { NextRequest, NextResponse } from 'next/server';

const CIPHERSCAN_API = 'https://api.mainnet.cipherscan.app';

const ALLOWED_PREFIXES = [
  'api/crosschain/',
  'api/privacy/',
  'api/swap/status',
  'api/swap/tokens',
];

function isAllowed(path: string): boolean {
  return ALLOWED_PREFIXES.some(p => path.startsWith(p));
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const joined = path.join('/');
  if (!isAllowed(joined)) {
    return NextResponse.json({ success: false, error: 'Not allowed' }, { status: 403 });
  }

  const search = req.nextUrl.search;
  const target = `${CIPHERSCAN_API}/${joined}${search}`;

  try {
    const upstream = await fetch(target, {
      headers: { accept: 'application/json' },
      next: { revalidate: 60 },
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'application/json',
        'cache-control': 'public, max-age=30, s-maxage=60',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? 'Upstream error' },
      { status: 502 },
    );
  }
}
