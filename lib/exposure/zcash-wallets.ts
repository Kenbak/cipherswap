export interface ZcashWallet {
  id: string;
  name: string;
  tagline: string;
  url: string;
  platforms: string;
  recommended?: boolean;
}

export const ZCASH_WALLETS: ZcashWallet[] = [
  {
    id: 'zodl',
    name: 'Zodl',
    tagline: 'Shielded-by-default mobile wallet from Zcash OGs. 1-tap shielding, pay at retail.',
    url: 'https://zodl.com/',
    platforms: 'iOS · Android',
    recommended: true,
  },
  {
    id: 'vizor',
    name: 'Vizor',
    tagline: 'Beautiful, open-source, non-custodial. Built by the team behind Keplr.',
    url: 'https://vizor.cash/',
    platforms: 'iOS · Android · Desktop',
  },
];
