import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SwapTracker } from '@/app/_components/tracker/SwapTracker';
import { DEPOSIT_ADDRESS_RE, DEPOSIT_MEMO_RE } from '@/lib/near-intents';

export const metadata: Metadata = {
  title: 'Swap status — CipherSwap',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function SwapStatusPage(props: PageProps<'/swap/[depositAddress]'>) {
  const { depositAddress: raw } = await props.params;
  const { memo: rawMemo } = await props.searchParams;
  const depositAddress = decodeURIComponent(raw);
  const memo = typeof rawMemo === 'string' ? rawMemo : undefined;

  if (!DEPOSIT_ADDRESS_RE.test(depositAddress)) notFound();
  if (memo && !DEPOSIT_MEMO_RE.test(memo)) notFound();

  return (
    <div className="max-w-[560px] mx-auto px-4 py-8 sm:py-12">
      <SwapTracker depositAddress={depositAddress} memo={memo} />
    </div>
  );
}
