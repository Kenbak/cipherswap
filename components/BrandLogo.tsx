/**
 * CipherSwap mark: an outlined block (any chain) overlapping ZecBlock's solid
 * gold block (Zcash). Same square-and-gold vocabulary as the ZecBlock logotype.
 */
export function BrandMark({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <rect x="8" y="8" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="5" />
      <rect x="26" y="26" width="30" height="30" fill="#F8BC21" />
    </svg>
  );
}

export function BrandLogo({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} role="img" aria-label="CipherSwap">
      <BrandMark size={compact ? 18 : 22} className="text-primary" />
      <span className={`font-sans font-bold tracking-tight text-primary leading-none ${compact ? 'text-[15px]' : 'text-[17px]'}`}>
        Cipher<span className="text-cipher-gold">Swap</span>
      </span>
    </span>
  );
}
