import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ReactNode } from 'react';

/** Shared frame for generated Open Graph images, in the ZecBlock palette. */
export const OG_SIZE = { width: 1200, height: 630 };

export const OG = {
  bg: '#0B0C0E',
  surface: '#111316',
  border: '#24272D',
  gold: '#F8BC21',
  ink: '#F1F3F5',
  secondary: '#C2C7CF',
  muted: '#9CA4B0',
};

const FONT_DIR = join(process.cwd(), 'node_modules/geist/dist/fonts');

export async function ogFonts() {
  const [monoBold, monoRegular, sans] = await Promise.all([
    readFile(join(FONT_DIR, 'geist-mono/GeistMono-Bold.ttf')),
    readFile(join(FONT_DIR, 'geist-mono/GeistMono-Regular.ttf')),
    readFile(join(FONT_DIR, 'geist-sans/Geist-Regular.ttf')),
  ]);
  return [
    { name: 'GeistMono', data: monoBold, weight: 700 as const, style: 'normal' as const },
    { name: 'GeistMono', data: monoRegular, weight: 400 as const, style: 'normal' as const },
    { name: 'Geist', data: sans, weight: 400 as const, style: 'normal' as const },
  ];
}

export function OgMark({ size = 40 }: { size?: number }) {
  const block = size * 0.47;
  const stroke = Math.max(3, size * 0.08);
  return (
    <div style={{ display: 'flex', position: 'relative', width: size, height: size }}>
      <div style={{ position: 'absolute', left: size * 0.12, top: size * 0.12, width: block, height: block, border: `${stroke}px solid ${OG.ink}` }} />
      <div style={{ position: 'absolute', left: size * 0.41, top: size * 0.41, width: block, height: block, background: OG.gold }} />
    </div>
  );
}

export function OgFrame({ children, footer, hideDomain = false }: { children: ReactNode; footer?: ReactNode; hideDomain?: boolean }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: OG.bg,
        backgroundImage: `linear-gradient(${OG.border}55 1px, transparent 1px), linear-gradient(90deg, ${OG.border}55 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
        padding: '56px 64px',
        fontFamily: 'GeistMono',
        color: OG.ink,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <OgMark size={40} />
        <span style={{ fontFamily: 'Geist', fontSize: '30px', fontWeight: 400, letterSpacing: '-0.5px' }}>
          <span style={{ color: OG.ink }}>Cipher</span>
          <span style={{ color: OG.gold }}>Swap</span>
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>{children}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '22px', color: OG.muted }}>
        {footer ?? <span>non-custodial · no account · open source</span>}
        {!hideDomain && <span style={{ color: OG.secondary }}>cipherswap.app</span>}
      </div>
    </div>
  );
}
