import { ImageResponse } from 'next/og';
import { OG, OG_SIZE, OgFrame, ogFonts } from '@/lib/og';

export const alt = 'Wallet Traceability Audit — CipherSwap';
export const size = OG_SIZE;
export const contentType = 'image/png';

const SAMPLE = [
  { sev: 'CRITICAL', color: '#D58D86', title: 'Linked to your other addresses' },
  { sev: 'HIGH', color: '#E2A66E', title: 'Timezone inferred from activity' },
  { sev: 'HIGH', color: '#E2A66E', title: 'Funded by an exchange' },
];

export default async function Image() {
  return new ImageResponse(
    (
      <OgFrame footer={<span>solana · bitcoin · ethereum</span>}>
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'space-between', gap: '48px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '600px' }}>
            <span style={{ fontSize: '24px', color: OG.muted, letterSpacing: '1px' }}>{'> TRACEABILITY AUDIT'}</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '20px', fontSize: '76px', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-2px' }}>
              <span>What does your wallet&nbsp;</span>
              <span style={{ color: OG.gold }}>reveal?</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '420px' }}>
            {SAMPLE.map((f) => (
              <div key={f.title} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px 20px', background: OG.surface, border: `1px solid ${OG.border}`, borderRadius: '8px' }}>
                <div style={{ width: '12px', height: '12px', background: f.color }} />
                <span style={{ fontFamily: 'Geist', fontSize: '22px', color: OG.ink, flex: 1 }}>{f.title}</span>
                <span style={{ fontSize: '16px', color: f.color }}>{f.sev}</span>
              </div>
            ))}
          </div>
        </div>
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
