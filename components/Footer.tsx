'use client';

export function Footer() {
  return (
    <footer className="border-t border-glass-4 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-4">
            <span className="text-muted">CipherSwap</span>
            <span className="text-muted/20">|</span>
            <a href="https://cipherscan.app" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-cipher-cyan transition-colors">
              CipherScan
            </a>
            <span className="text-muted/20 hidden sm:inline">|</span>
            <a href="https://cipherpay.app" target="_blank" rel="noopener noreferrer" className="hidden sm:inline text-muted hover:text-cipher-cyan transition-colors">
              CipherPay
            </a>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://x.com/cipherscan_app" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-cipher-cyan transition-colors">
              @cipherscan_app
            </a>
            <span className="text-muted/20">|</span>
            <span className="text-muted/60">Non-custodial · No KYC</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
