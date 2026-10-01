interface ExchangeInfo {
  label: string;
  type: 'cex';
}

export const KNOWN_EXCHANGES: Record<string, ExchangeInfo> = {
  // Coinbase
  '2AQdpHJ2JpcEgPiATUXjQxA8QmafFegfQwSLWSprPicm': { label: 'Coinbase', type: 'cex' },
  'GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE': { label: 'Coinbase', type: 'cex' },
  'H8sMJSCQxfKiFTCfDR3DUMLPwcRbM61LGFJ8N4dK3WjS': { label: 'Coinbase Commerce', type: 'cex' },
  '4wejxsMmB2JhETfn6DrweATr2e7KRyCuPfbCJyeJBqSi': { label: 'Coinbase', type: 'cex' },

  // Binance
  '5tzFkiKscjHsFKR5mBPWmDtQnKDfyBCfB9jMzjKPUCg2': { label: 'Binance', type: 'cex' },
  '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM': { label: 'Binance', type: 'cex' },
  'AC5RDfQFmDS1deWZos921JfqscXdByf8BKHs5ACWjtW2': { label: 'Binance', type: 'cex' },
  '3yFwqXBfZY4jBVUafQ1YEXw189y2dN3V5KQq9uzBDy1E': { label: 'Binance', type: 'cex' },
  '5VCwKtCXgCJ6kit5FybXjvFocNMR2qT4Y4A2ufCw6zuC': { label: 'Binance', type: 'cex' },

  // Kraken
  'FWznbcNXWQuHTawe9RBvHri4pzUoxBQoG2v2f7JYfJKH': { label: 'Kraken', type: 'cex' },
  'CbUe5UnCqHZGXxAuF4s3ej8JWRVPNxJTCmyYiK9PNqJ3': { label: 'Kraken', type: 'cex' },

  // OKX
  '5VCwKtCXgCJ6kit5FybXjvFocNMRqT4Y4A2ufCw6zuC': { label: 'OKX', type: 'cex' },
  '6m3sFvDLdMKCCGdWycMJotCvosxzAvsk5T2WT7g7oNz5': { label: 'OKX', type: 'cex' },
  'JA5cjkRJ1euVi9xLWsCJVzsRzEkT8vcC4rqw9sVAo5d6': { label: 'OKX', type: 'cex' },

  // Bybit
  'AC5RDfQFmDS1deWZos921JfqscXdByf8BKHs5ACW': { label: 'Bybit', type: 'cex' },
  'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH': { label: 'Bybit', type: 'cex' },

  // Gate.io
  'u6PJ8DtQuPFnfmwHbGFULQ4u4EgjDiyYKjVEsynXq2w': { label: 'Gate.io', type: 'cex' },

  // KuCoin
  'BmFdpraQhkiDQE6SnfG5PkMKmV2ZXrn5NQFxTPE2Dat9': { label: 'KuCoin', type: 'cex' },

  // Crypto.com
  'AobVSwdW9BbpMdJvTqeCN4hPAmh4rHm7vwLnQ5ATbo3p': { label: 'Crypto.com', type: 'cex' },

  // FTX (historical, wallets still active on-chain)
  'FTT8cGNp3rfTC6c1RbUj3eDJLVMjpnLiR9XkjWFRa7Mb': { label: 'FTX', type: 'cex' },
  '2hNHZg7XBhuhHVZ3JDEi4buq2fPQwuWBdQ9xkH5tv4Lf': { label: 'FTX', type: 'cex' },

  // Gemini
  'GhJFHRjFGNaMXk6LZgdKU7K2u7d5CGVBCb3PuFE3dJ6n': { label: 'Gemini', type: 'cex' },

  // HTX (Huobi)
  '88xTWZMeKFiLxtDY4UJM8PWw9w6w2hFiKtThqnpbFT2v': { label: 'HTX', type: 'cex' },
};

export function isKnownExchange(address: string): ExchangeInfo | null {
  return KNOWN_EXCHANGES[address] ?? null;
}

export function getExchangeLabel(address: string): string | null {
  return KNOWN_EXCHANGES[address]?.label ?? null;
}
