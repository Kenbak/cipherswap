import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = localFont({
  src: "../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CipherSwap — Buy ZEC from any chain",
  description: "Swap any crypto to Zcash (ZEC) from 15+ blockchains. Non-custodial, no KYC, powered by NEAR Intents.",
  keywords: ["Zcash", "ZEC", "swap", "cross-chain", "bridge", "buy ZEC", "privacy", "CipherSwap", "NEAR Intents"],
  openGraph: {
    title: "CipherSwap — Buy ZEC from any chain",
    description: "Swap any crypto to Zcash (ZEC) from 15+ blockchains. Non-custodial, no KYC.",
    siteName: "CipherSwap",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CipherSwap — Buy ZEC from any chain",
    description: "Swap any crypto to Zcash (ZEC) from 15+ blockchains.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        {/* Header */}
        <header className="border-b border-glass-4" style={{ backgroundColor: 'rgba(20, 22, 31, 0.9)', backdropFilter: 'blur(20px)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-lg bg-cipher-cyan/10 flex items-center justify-center border border-cipher-cyan/20 group-hover:border-cipher-cyan/40 transition-colors">
                <svg className="w-4 h-4 text-cipher-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <span className="text-sm font-bold font-mono text-primary tracking-wide">CipherSwap</span>
            </a>
            <a
              href="https://cipherscan.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono text-muted hover:text-cipher-cyan transition-colors"
            >
              Powered by CipherScan
            </a>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-glass-4 py-6" style={{ backgroundColor: 'var(--color-surface-solid)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <span className="text-[11px] font-mono text-muted">CipherSwap</span>
                <a href="https://cipherscan.app" target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono text-muted hover:text-cipher-cyan transition-colors">
                  CipherScan Explorer
                </a>
              </div>
              <div className="flex items-center gap-4">
                <a href="https://x.com/cipherscan_app" target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono text-muted hover:text-cipher-cyan transition-colors">
                  @cipherscan_app
                </a>
                <span className="text-[10px] text-muted/40 font-mono">Non-custodial · No KYC</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
