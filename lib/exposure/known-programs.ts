export const KNOWN_PROGRAMS: Record<string, string> = {
  // Core
  '11111111111111111111111111111111': 'System Program',
  'ComputeBudget111111111111111111111111111111': 'Compute Budget',
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': 'Token Program',
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL': 'Associated Token',
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb': 'Token-2022',
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr': 'Memo',

  // DEXes & Aggregators
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'Jupiter v6',
  'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB': 'Jupiter v4',
  'jupoNjAxXgZ4rjzxzPMP4oxduvQsQtZzyknqvzYNrNu': 'Jupiter Limit Order',
  'j1o2qRpjcyUwEvwtcfhEQefh773ZgjxcVRry7LDqg5X': 'Jupiter Limit Order v2',
  'DCA265Vj8a9CEuX1eb1LWRnDT7uK6q1xMipnNyatn23M': 'Jupiter DCA',
  'PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu': 'Jupiter Perps',
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'Raydium AMM',
  'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK': 'Raydium CLMM',
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc': 'Orca Whirlpool',
  '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP': 'Orca v2',
  'SSwpkEEcbUqx4vtoEByFjSkhKdCT862DNVb52nZg1UZ': 'Saber',
  'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo': 'Meteora DLMM',
  'Eo7WjKq67rjJQSZxS6z3YkapzY3eBj6xHAi2MFUAMvc': 'Meteora Pools',
  'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY': 'Phoenix',
  'opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EQMQvR': 'Openbook v2',
  'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX': 'Serum v3',
  'DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1': 'Lifinity v2',

  // Lending & Yield
  'MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA': 'Marginfi',
  'So1endDq2YkqhipRh3WViPa8hFb7GZGRTBr3t8L8MR': 'Solend',
  'KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD': 'Kamino Lend',
  'FarmsPZpWu9i7Kky8tPN37rs2TpmMrAZrC7S7vJa91Hr': 'Kamino Farms',
  'KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd': 'Kamino Vaults',
  '6LtLpnUFNByNXLyCoK9wA2MykKAmQNZKBdY8s47dehDc': 'Kamino Liquidity',
  'LiMoM9rMhrdYrfzUCxQppvxCSG1FcrUK9G8uLq4A1GF': 'Kamino Limo',
  'HFn8GnPADiny6XqUoWE8uRPPxb29ikn4yTuPa9MF2fWJ': 'Scope Oracle',
  'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH': 'Drift v2',

  // NFT
  'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY': 'Bubblegum (cNFT)',
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s': 'Metaplex Token Metadata',
  'M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K': 'Magic Eden v2',
  'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN': 'Tensor Swap',
  'TCMPhJdwDryooaGtiocG1u3xcYbRpiJzb283XfCZsDp': 'Tensor cNFT',
  'hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk': 'Haus (auction)',

  // Staking
  'STAKEkKzbdeKkqzKpLkNQD3SUuLgshDKCD7U8duxAbB': 'Native Staking',
  'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD': 'Marinade',
  'SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy': 'Stake Pool',
  'jitosol9ASEa7M6WURvKQVsGAxuafZ3FDWBZP7S3yBt': 'Jito',
  'BLZEEuZUBVqFhj8adcCFPJvPVCiCyVmh3hkJMrU8KuJA': 'Blaze Staking',

  // Bridges
  'CCTPmbSD7gX1bxKPAmg77w8oFzNFpaQiQUWD43TKaecd': 'Circle CCTP',
  'wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb': 'Wormhole',
  'WnFt12ZrnzZrFZkt2xsNsaNWoQribnuQ5B5FrDbwDhD': 'Portal Bridge',

  // Governance
  'GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdGUXaLovm': 'Governance',
  'voteXZxajNhmCGo1bfxRYPMFaAB5BhL8gV9zVLmgAPa': 'Realms DAO',

  // Misc
  'SNPRohhBurQwrpwAptw1QYtpFdfEKitr4WSJ125cN1g': 'Switchboard Oracle',
  'namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX': 'Solana Name Service',
  'SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf': 'Squads v4',
  'L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95': 'Lighthouse (tx guard)',
};

export function getProgramLabel(programId: string): string | null {
  return KNOWN_PROGRAMS[programId] ?? null;
}

export function labelPrograms(
  programFrequency: Record<string, number>,
  programLabels: Record<string, string> = {},
): { label: string; programId: string; count: number }[] {
  return Object.entries(programFrequency)
    .map(([programId, count]) => ({
      label: programLabels[programId] || KNOWN_PROGRAMS[programId] || shortenAddress(programId),
      programId,
      count,
    }))
    .filter(p => !isInfraProgram(p.programId))
    .sort((a, b) => b.count - a.count);
}

const INFRA_PROGRAMS = new Set([
  '11111111111111111111111111111111',            // System
  'ComputeBudget111111111111111111111111111111', // Compute Budget
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token Program
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', // Associated Token
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', // Token-2022
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr', // Memo
  'L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95', // Lighthouse — appended by wallets, not user intent
  'HFn8GnPADiny6XqUoWE8uRPPxb29ikn4yTuPa9MF2fWJ', // Scope Oracle — internal to Kamino txs
]);

function isInfraProgram(id: string): boolean {
  return INFRA_PROGRAMS.has(id);
}

function shortenAddress(addr: string): string {
  return addr.slice(0, 4) + '...' + addr.slice(-4);
}
