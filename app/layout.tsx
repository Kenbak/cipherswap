import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ZecPriceProvider } from "./_components/ZecPriceContext";

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
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
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
        <ZecPriceProvider>
          <Navbar />

          <main className="flex-1">
            {children}
          </main>

          <Footer />
        </ZecPriceProvider>
      </body>
    </html>
  );
}
