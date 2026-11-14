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
    <div>
      <div className="flex items-center gap-3">
        <span className="w-14 shrink-0 text-[0.8125rem] text-muted">To</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your ZEC address"
          aria-label="ZEC receiving address"
          aria-invalid={!!(value && error)}
          aria-describedby="zec-addr-hint"
          spellCheck={false}
          autoComplete="off"
          className="flex-1 min-w-0 bg-transparent text-primary font-mono text-base sm:text-sm placeholder:font-sans placeholder:text-muted/70 focus:outline-none truncate"
        />
        {!value && (
          <button type="button" onClick={paste} className="shrink-0 text-[0.8125rem] font-medium text-cipher-gold hover:opacity-80">
            Paste
          </button>
        )}
      </div>
      {value && (
        <div id="zec-addr-hint" className="mt-1.5 pl-[4.25rem]">
          {error ? (
            <p className="text-xs text-danger">{error}</p>
          ) : kind === 'transparent' ? (
            <p className="text-xs text-cipher-orange leading-relaxed">
              Transparent address: what arrives is public. Use a shielded u1… address for privacy.
            </p>
          ) : kind ? (
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-cipher-gold" aria-hidden />
              Shielded {kind === 'unified' ? '· Orchard' : '· Sapling'}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
