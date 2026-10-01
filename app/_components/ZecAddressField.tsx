'use client';

import { validateZecAddress } from './types';
import { zecAddressKind } from '@/lib/deposit';

export function ZecAddressBadge({ address }: { address: string }) {
  const kind = zecAddressKind(address);
  if (!kind || validateZecAddress(address)) return null;
  if (kind === 'transparent') {
    return (
      <span className="chip !border-cipher-orange/30 !text-cipher-orange">
        <span className="w-1.5 h-1.5 bg-cipher-orange" aria-hidden />
        Transparent · visible on chain
      </span>
    );
  }
  return (
    <span className="chip !border-cipher-gold/30 !text-cipher-gold">
      <span className="w-1.5 h-1.5 bg-cipher-gold" aria-hidden />
      Shielded · {kind === 'unified' ? 'Unified (Orchard)' : 'Sapling'}
    </span>
  );
}

export function ZecAddressField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const error = validateZecAddress(value);
  const kind = zecAddressKind(value);
  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onChange(text.trim());
    } catch (err) {
      console.error('[paste] clipboard read failed:', err);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your ZEC address (u1… recommended)"
          aria-label="ZEC receiving address"
          aria-invalid={!!(value && error)}
          aria-describedby="zec-addr-hint"
          spellCheck={false}
          autoComplete="off"
          className="flex-1 min-w-0 bg-transparent text-primary font-mono text-sm placeholder:font-sans placeholder:text-muted focus:outline-none"
        />
        {!value && (
          <button type="button" onClick={paste} className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium text-cipher-gold bg-cipher-gold/10 hover:bg-cipher-gold/15 transition-colors">
            Paste
          </button>
        )}
      </div>
      <div id="zec-addr-hint" className="min-h-[1.25rem]">
        {value && error ? (
          <p className="text-xs text-danger">{error}</p>
        ) : value ? (
          <div className="space-y-1.5">
            <ZecAddressBadge address={value} />
            {kind === 'transparent' && (
              <p className="text-xs text-muted leading-relaxed">
                Anyone can see what arrives at a t-address. For privacy, receive to a unified address (u1…) from
                Zashi, Zingo or YWallet.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
