import type { BtcAddressType } from './types';

const BECH32 = /^bc1[02-9ac-hj-np-z]{11,87}$/;
const BASE58_LEGACY = /^[13][1-9A-HJ-NP-Za-km-z]{25,34}$/;

export function isValidBitcoinAddress(address: string): boolean {
  return BECH32.test(address) || BASE58_LEGACY.test(address);
}

export function btcAddressType(address: string): BtcAddressType {
  if (address.startsWith('bc1p')) return 'p2tr';
  if (address.startsWith('bc1q')) return address.length > 50 ? 'p2wsh' : 'p2wpkh';
  if (address.startsWith('3')) return 'p2sh';
  if (address.startsWith('1')) return 'p2pkh';
  return 'unknown';
}
