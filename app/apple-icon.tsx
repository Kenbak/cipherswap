import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#0B0C0E', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 34, top: 34, width: 70, height: 70, border: '13px solid #F1F3F5' }} />
        <div style={{ position: 'absolute', left: 76, top: 76, width: 70, height: 70, background: '#F8BC21' }} />
      </div>
    ),
    { ...size },
  );
}
