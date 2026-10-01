import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { GRADE_COLORS } from '@/lib/exposure/constants';
import { OG, OG_SIZE, OgFrame, ogFonts } from '@/lib/og';

/** Shareable result card, rendered on demand from the grade the client computed. */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const grade = (searchParams.get('grade') || 'F').slice(0, 2);
  const score = (searchParams.get('score') || '0').slice(0, 3);
  const verdict = (searchParams.get('verdict') || 'Highly traceable').slice(0, 40);
  const chain = { bitcoin: 'Bitcoin', ethereum: 'Ethereum' }[searchParams.get('chain') ?? ''] ?? 'Solana';
  const tz = (searchParams.get('tz') || '').slice(0, 12);
  const app = (searchParams.get('app') || '').slice(0, 20);
  const hour = (searchParams.get('hour') || '').slice(0, 12);
  const color = GRADE_COLORS[grade] || GRADE_COLORS.F;

  const facts: { label: string; value: string }[] = [];
  if (tz) facts.push({ label: 'timezone', value: tz });
  if (app) facts.push({ label: 'favorite app', value: app });
  if (hour) facts.push({ label: 'most active', value: hour });

  return new ImageResponse(
    (
      <OgFrame footer={<span>audit yours → cipherswap.app/exposure</span>} hideDomain>
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: '64px' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '250px',
              height: '250px',
              border: `12px solid ${color}`,
              borderRadius: '8px',
            }}
          >
            <span style={{ color, fontSize: '124px', fontWeight: 700, lineHeight: 1 }}>{grade}</span>
            <span style={{ color: OG.muted, fontSize: '28px', marginTop: '8px' }}>{score}/100</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <span style={{ fontSize: '24px', color: OG.muted, letterSpacing: '1px' }}>{`> ${chain.toUpperCase()} TRACEABILITY AUDIT`}</span>
            <span style={{ marginTop: '16px', fontSize: '68px', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-2px' }}>{verdict}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '28px' }}>
              {facts.map((f) => (
                <div key={f.label} style={{ display: 'flex', gap: '16px', fontSize: '24px' }}>
                  <span style={{ color: OG.muted, width: '200px' }}>{f.label}</span>
                  <span style={{ color: OG.ink }}>{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE, fonts: await ogFonts() },
  );
}
