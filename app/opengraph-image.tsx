import { ImageResponse } from 'next/og';
import { OG, OG_SIZE, OgFrame, OgMark, ogFonts } from '@/lib/og';

export const alt = 'CipherSwap — Buy ZEC from any chain';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '700px' }}>
            <span style={{ fontSize: '24px', color: OG.muted, letterSpacing: '1px' }}>{'> CROSS-CHAIN → SHIELDED ZCASH'}</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '20px', fontSize: '92px', fontWeight: 700, lineHeight: 1.02, letterSpacing: '-3px' }}>
              <span>Buy&nbsp;</span>
              <span style={{ color: OG.gold }}>ZEC&nbsp;</span>
              <span>from any chain.</span>
            </div>
            <span style={{ marginTop: '24px', fontFamily: 'Geist', fontSize: '32px', color: OG.secondary }}>
              Swap from 15+ chains into shielded Zcash.
            </span>
          </div>
          <OgMark size={260} />
        </div>
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
