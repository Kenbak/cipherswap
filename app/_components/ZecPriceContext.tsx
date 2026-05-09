'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface PriceData {
  price: number | null;
  change24h: number | null;
}

const ZecPriceContext = createContext<PriceData>({ price: null, change24h: null });

export function ZecPriceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PriceData>({ price: null, change24h: null });

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch('/api/price');
        if (res.ok) {
          const json = await res.json();
          if (json.price != null) {
            setData({ price: json.price, change24h: json.change24h });
          }
        }
      } catch {}
    };
    fetchPrice();
    const id = setInterval(fetchPrice, 60_000);
    return () => clearInterval(id);
  }, []);

  return <ZecPriceContext value={data}>{children}</ZecPriceContext>;
}

export function useZecPrice() {
  return useContext(ZecPriceContext);
}
