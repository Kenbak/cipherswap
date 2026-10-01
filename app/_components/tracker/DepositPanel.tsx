'use client';

import { chunkAddress, depositQrValue } from '@/lib/deposit';
import { QrCode } from '../QrCode';
import { CopyButton } from '../ui';

function remainingLabel(ms: number): string {
  if (ms <= 0) return 'expired';
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m left` : `${m}m left`;
}

export function DepositPanel({
  chain,
  chainLabel,
  token,
  amount,
  address,
  memo,
  contractAddress,
  deadline,
  now,
  topUp = false,
}: {
  chain: string;
  chainLabel: string;
  token: string;
  amount: string;
  address: string;
  memo?: string;
  contractAddress?: string;
  deadline: number | null;
  now: number;
  topUp?: boolean;
}) {
  const qr = depositQrValue({ chain, address, amount, contractAddress, memo });
  const chunks = chunkAddress(address);
  const expired = deadline != null && deadline <= now;

  return (
    <div className="panel p-4 space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-secondary">{topUp ? 'Send the remaining' : 'Send exactly'}</span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-xl text-primary tabular-nums">{amount} {token}</span>
          <CopyButton value={amount} label="Copy amount" compact />
        </span>
      </div>
      <p className="-mt-2 text-xs text-muted">
        On {chainLabel}, in one transaction. A different amount can delay the swap or trigger a refund.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="shrink-0 self-center sm:self-start">
          <QrCode value={qr.value} size={132} />
          <p className="mt-1.5 text-center text-xs text-muted">{qr.includesAmount ? 'Address + amount' : 'Address only'}</p>
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-secondary">To this one-time address</span>
            <CopyButton value={address} label="Copy address" />
          </div>
          <p className="term !text-[0.8125rem] break-all leading-relaxed">
            {chunks.map((c, i) => (
              <span key={i} className={i < 2 || i >= chunks.length - 2 ? 'text-primary font-medium' : 'text-secondary'}>
                {c}{i < chunks.length - 1 ? ' ' : ''}
              </span>
            ))}
          </p>
          <p className="text-xs text-muted">After pasting, check the highlighted start and end match.</p>
        </div>
      </div>

      {memo && (
        <div className="px-3 py-3 rounded-xl bg-cipher-orange/[0.06] border border-cipher-orange/30 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-cipher-orange">Memo / tag required</span>
            <CopyButton value={memo} label="Copy memo" />
          </div>
          <p className="term !text-sm text-primary break-all">{memo}</p>
          <p className="text-xs text-secondary">Deposits without this memo can’t be matched to your swap.</p>
        </div>
      )}

      {deadline != null && (
        <div className={`flex items-center justify-between gap-3 text-xs ${expired ? 'text-danger' : 'text-muted'}`}>
          <span>{expired ? 'This deposit address has expired. Do not send to it.' : 'Send before'}</span>
          {!expired && (
            <span className="term">
              {new Date(deadline).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })} · {remainingLabel(deadline - now)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
