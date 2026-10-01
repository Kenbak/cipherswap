/** Client-safe Ethereum helpers: address validation and well-known public labels. */

const ETH_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export function isValidEthereumAddress(address: string): boolean {
  return ETH_ADDRESS_RE.test(address);
}

/** Publicly documented exchange hot/cold wallets. Keys are lowercase. */
const KNOWN_ETH_EXCHANGES: Record<string, string> = {
  '0x28c6c06298d514db089934071355e5743bf21d60': 'Binance',
  '0x21a31ee1afc51d94c2efccaa2092ad1028285549': 'Binance',
  '0xdfd5293d8e347dfe59e90efd55b2956a1343963d': 'Binance',
  '0xf977814e90da44bfa03b6295a0616a897441acec': 'Binance',
  '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8': 'Binance (cold)',
  '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be': 'Binance',
  '0xd551234ae421e3bcba99a0da6d736074f22192ff': 'Binance',
  '0x564286362092d8e7936f0549571a803b203aaced': 'Binance',
  '0x0681d8db095565fe8a346fa0277bffde9c0edbbf': 'Binance',
  '0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43': 'Coinbase',
  '0x71660c4005ba85c37ccec55d0c4493e66fe775d3': 'Coinbase',
  '0x503828976d22510aad0201ac7ec88293211d23da': 'Coinbase',
  '0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740': 'Coinbase',
  '0x3cd751e6b0078be393132286c442345e5dc49699': 'Coinbase',
  '0xb5d85cbf7cb3ee0d56b3bb207d5fc4b82f43f511': 'Coinbase',
  '0xeb2629a2734e272bcc07bda959863f316f4bd4cf': 'Coinbase',
  '0x2910543af39aba0cd09dbb2d50200b3e800a63d2': 'Kraken',
  '0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0': 'Kraken',
  '0xda9dfa130df4de4673b89022ee50ff26f6ea73cf': 'Kraken',
  '0x742d35cc6634c0532925a3b844bc454e4438f44e': 'Bitfinex',
  '0x1151314c646ce4e0efd76d1af4760ae66a9fe30f': 'Bitfinex',
  '0xd24400ae8bfebb18ca49be86258a3c749cf46853': 'Gemini',
  '0x5f65f7b609678448494de4c87521cdf6cef1e932': 'Gemini',
  '0x6cc5f688a315f3dc28a7781717a9a798a59fda7b': 'OKX',
  '0x2b5634c42055806a59e9107ed44d43c426e58258': 'KuCoin',
  '0xf89d7b9c864f589bbf53a82105107622b35eaa40': 'Bybit',
  '0x6262998ced04146fa42253a5c0af90ca02dfd2a3': 'Crypto.com',
  '0x46340b20830761efd32832a74d7169b29feb9758': 'Crypto.com',
  '0x40b38765696e3d5d8d9d834d8aad4bb6e418e489': 'Robinhood',
  '0x0d0707963952f2fba59dd06f2b425ace40b492fe': 'Gate.io',
};

/** Tornado Cash ETH pools and router. */
const KNOWN_ETH_MIXERS: Record<string, string> = {
  '0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc': 'Tornado Cash 0.1 ETH',
  '0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936': 'Tornado Cash 1 ETH',
  '0x910cbd523d972eb0a6f4cae4618ad62622b39dbf': 'Tornado Cash 10 ETH',
  '0xa160cdab225685da1d56aa342ad8841c3b53f291': 'Tornado Cash 100 ETH',
  '0xd90e2f925da726b50c4ed8d0fb90ad053324f31b': 'Tornado Cash Router',
};

const EXCHANGE_NAME_RE = /\b(binance|coinbase|kraken|okx|okex|bybit|kucoin|bitfinex|gemini|huobi|htx|gate\.io|crypto\.com|robinhood|bitstamp|upbit|bithumb|mexc|bitget)\b/i;

export function knownEthExchange(address: string): string | undefined {
  return KNOWN_ETH_EXCHANGES[address.toLowerCase()];
}

export function knownEthMixer(address: string): string | undefined {
  return KNOWN_ETH_MIXERS[address.toLowerCase()];
}

export function looksLikeExchangeLabel(label: string): boolean {
  return EXCHANGE_NAME_RE.test(label);
}
