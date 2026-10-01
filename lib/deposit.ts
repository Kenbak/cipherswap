/**
 * QR payloads for manual deposits. Amount-bearing URIs are only used where the
 * scheme is widely and consistently supported; otherwise the QR is the bare address.
 */
export function depositQrValue(opts: {
  chain: string;
  address: string;
  amount: string;
  contractAddress?: string;
  memo?: string;
}): { value: string; includesAmount: boolean } {
  const { chain, address, amount, contractAddress, memo } = opts;
  if (memo) return { value: address, includesAmount: false };
  if (chain === 'btc') return { value: `bitcoin:${address}?amount=${amount}`, includesAmount: true };
  if (chain === 'ltc') return { value: `litecoin:${address}?amount=${amount}`, includesAmount: true };
  if (chain === 'doge') return { value: `dogecoin:${address}?amount=${amount}`, includesAmount: true };
  if (chain === 'sol') {
    const spl = contractAddress ? `&spl-token=${contractAddress}` : '';
    return { value: `solana:${address}?amount=${amount}${spl}`, includesAmount: true };
  }
  return { value: address, includesAmount: false };
}

/** Splits an address into groups of 4 so users can compare it chunk by chunk. */
export function chunkAddress(address: string, size = 4): string[] {
  const out: string[] = [];
  for (let i = 0; i < address.length; i += size) out.push(address.slice(i, i + size));
  return out;
}

export function shortAddress(address: string, head = 6, tail = 4): string {
  if (address.length <= head + tail + 1) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

export type ZecAddressKind = 'unified' | 'sapling' | 'transparent' | null;

export function zecAddressKind(addr: string): ZecAddressKind {
  if (addr.startsWith('u1') || addr.startsWith('utest')) return 'unified';
  if (addr.startsWith('zs') || addr.startsWith('ztestsapling')) return 'sapling';
  if (addr.startsWith('t1') || addr.startsWith('t3')) return 'transparent';
  return null;
}
