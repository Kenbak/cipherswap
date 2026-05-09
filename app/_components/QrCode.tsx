'use client';

import { QRCodeSVG } from 'qrcode.react';

interface QrCodeProps {
  value: string;
  size?: number;
}

export function QrCode({ value, size = 140 }: QrCodeProps) {
  return (
    <div className="rounded-lg bg-white p-2.5 inline-flex">
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        includeMargin={false}
      />
    </div>
  );
}
