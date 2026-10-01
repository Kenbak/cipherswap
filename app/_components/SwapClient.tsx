'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useWallet, chainToWalletType, type DetectedWallet } from '@/hooks/useWallet';
import { useSwapMachine } from '@/hooks/useSwapMachine';
import { useTokenList } from '@/hooks/useTokenList';
import { useBalance } from '@/hooks/useBalance';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useQuotePreview } from '@/hooks/useQuotePreview';
import { useMoonPay } from '@/hooks/useMoonPay';
import { supportsMoonPayBuy } from '@/lib/moonpay';
import { toSmallestUnit } from '@/lib/amount';
import { humanizeQuoteError, humanizeWalletError, isUserRejection } from '@/lib/errors';
import { shortAddress } from '@/lib/deposit';
import type { QuoteResponse } from '@/lib/near-intents';
import { appendLog, removeSwap, saveSwap, setLastWallet, updateSwap } from '@/lib/swap-history';
import { WalletButton, WalletModal } from './WalletModal';
import { EditView, type SendMode } from './steps/EditView';
import { ReviewView } from './steps/ReviewView';
import { RecentSwaps } from './RecentSwaps';
import type { SourceToken } from './types';
import { ZEC_ASSET_ID } from './types';

const EDIT_REFRESH_MS = 30_000;
const REVIEW_REFRESH_MS = 15_000;
/** A binding quote is reused on wallet retry only while this fresh. */
const BINDING_TTL_MS = 90_000;
/** Binding output more than 0.5% below the preview requires explicit acceptance. */
const RATE_TOLERANCE_PER_MILLE = 5;

const fade = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.15 },
};

export default function SwapClient({ initialTokens }: { initialTokens?: SourceToken[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wallet = useWallet();
  const { tokens, loading: tokensLoading } = useTokenList(initialTokens);
  const [state, dispatch] = useSwapMachine(initialTokens?.[0]);
  const [walletModal, setWalletModal] = useState(false);
  const [walletError, setWalletError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [balanceRefresh, setBalanceRefresh] = useState(0);
  const amountRef = useRef<HTMLInputElement>(null);
  const handoffDone = useRef(false);

  const t = state.selectedToken;
  const compatible = wallet.connected && chainToWalletType(t.chain) === wallet.walletType;
  const sendMode: SendMode = state.manual ? 'manual' : compatible ? 'wallet' : 'choose';
  const refundAddress = sendMode === 'wallet' ? wallet.address ?? '' : state.refundAddress;

  const { balance, loading: balanceLoading } = useBalance({ ...wallet, connected: compatible }, t, balanceRefresh);
  const recommendations = useRecommendations(t);
  const moonPay = useMoonPay();
  const reviewing = state.view !== 'edit';
  const refreshMs = reviewing ? REVIEW_REFRESH_MS : EDIT_REFRESH_MS;
  const preview = useQuotePreview({ token: t, amount: state.amount, slippageBps: state.slippageBps, refreshMs });

  // Handoff from the exposure audit: ?from=solana reconnects a Solana wallet
  // that already trusts this origin and preselects SOL; ?from=bitcoin|ethereum preselects BTC/ETH.
  useEffect(() => {
    if (handoffDone.current) return;
    const from = searchParams.get('from');
    if (from === 'bitcoin' || from === 'btc') {
      handoffDone.current = true;
      const btc = tokens.find((x) => x.chain === 'btc');
      if (btc) dispatch({ type: 'select_token', token: btc });
      return;
    }
    if (from === 'ethereum' || from === 'eth') {
      handoffDone.current = true;
      const eth = tokens.find((x) => x.chain === 'eth' && x.token === 'ETH');
      if (eth) dispatch({ type: 'select_token', token: eth });
      return;
    }
    if (from !== 'solana' && from !== 'sol') return;
    handoffDone.current = true;
    (async () => {
      const connected = await wallet.eagerConnectSolana();
      if (!connected) return;
      const sol = tokens.find((x) => x.chain === 'sol');
      if (sol) dispatch({ type: 'select_token', token: sol });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (state.view !== 'edit') return;
        e.preventDefault();
        setPickerOpen(true);
      } else if (e.key === '/' && !typing && state.view === 'edit') {
        e.preventDefault();
        amountRef.current?.focus();
      } else if (e.key === 'Escape' && state.view === 'review') {
        dispatch({ type: 'back' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.view, dispatch]);

  const handleConnect = async (w: DetectedWallet) => {
    setWalletError('');
    try {
      const ok = await wallet.connect(w);
      if (!ok) return;
      setLastWallet(w.name);
      setWalletModal(false);
      dispatch({ type: 'set_manual', manual: false });
      if (chainToWalletType(t.chain) !== w.type) {
        const match = tokens.find((x) => chainToWalletType(x.chain) === w.type);
        if (match) dispatch({ type: 'select_token', token: match });
      }
    } catch (err) {
      setWalletError(humanizeWalletError(err, w.name));
    }
  };

  const handleConfirm = async () => {
    if (!preview.data) return;
    const amount = toSmallestUnit(state.amount, t.decimals);
    if (!amount) return;

    let binding: QuoteResponse | null =
      state.binding && Date.now() - state.binding.receivedAt < BINDING_TTL_MS ? state.binding.response : null;

    if (!binding) {
      dispatch({ type: 'lock' });
      try {
        const res = await fetch('/api/swap/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originAsset: t.assetId,
            destinationAsset: ZEC_ASSET_ID,
            amount: amount.toString(),
            recipient: state.zecAddress,
            refundTo: refundAddress,
            slippageBps: state.slippageBps,
          }),
        });
        const json = await res.json();
        if (!json.success || !json.quote?.depositAddress) {
          throw new Error(humanizeQuoteError(json.error || 'No deposit address returned', { symbol: t.token, decimals: t.decimals }));
        }
        binding = json as QuoteResponse;
      } catch (err) {
        dispatch({ type: 'fail', error: err instanceof Error ? err.message : 'Could not lock a quote' });
        return;
      }
      const previewOut = BigInt(preview.data.quote.amountOut);
      const lockedOut = BigInt(binding.quote.amountOut);
      const worse = lockedOut * BigInt(1000) < previewOut * BigInt(1000 - RATE_TOLERANCE_PER_MILLE);
      dispatch({ type: 'locked', response: binding, rateChanged: worse });
      if (worse) return;
    }

    const depositAddress = binding.quote.depositAddress!;
    const depositMemo = binding.quote.depositMemo;
    const viaWallet = sendMode === 'wallet' && !depositMemo;

    saveSwap({
      depositAddress,
      depositMemo,
      createdAt: Date.now(),
      mode: viaWallet ? 'wallet' : 'manual',
      token: t.token,
      chain: t.chain,
      chainLabel: t.chainLabel,
      assetId: t.assetId,
      decimals: t.decimals,
      contractAddress: t.contractAddress,
      amount: state.amount,
      zecAddress: state.zecAddress,
      refundAddress,
      estimatedZec: binding.quote.amountOutFormatted,
      quoteResponse: binding,
      log: [{ at: Date.parse(binding.timestamp) || Date.now(), code: 'quote_signed', detail: shortAddress(depositAddress, 8, 6) }],
    });

    if (viaWallet) {
      dispatch({ type: 'signing' });
      try {
        const hash = await wallet.sendTransaction(depositAddress, state.amount, t.decimals, t.contractAddress);
        updateSwap(depositAddress, { txHash: hash });
        appendLog(depositAddress, { at: Date.now(), code: 'deposit_broadcast', detail: shortAddress(hash, 8, 6) });
        setBalanceRefresh((n) => n + 1);
      } catch (err) {
        if (isUserRejection(err)) removeSwap(depositAddress);
        dispatch({ type: 'fail', error: humanizeWalletError(err, wallet.walletName, t.token) });
        return;
      }
    }

    const qs = depositMemo ? `?memo=${encodeURIComponent(depositMemo)}` : '';
    router.push(`/swap/${encodeURIComponent(depositAddress)}${qs}`);
  };

  const openMoonPay = useCallback(() => {
    if (!wallet.address) return;
    moonPay.clearError();
    moonPay.openBuyWidget({ walletAddress: wallet.address, selectedToken: t, onCompleted: () => setBalanceRefresh((n) => n + 1) });
  }, [wallet.address, t, moonPay]);

  const showCard = !!(moonPay.isConfigured && sendMode === 'wallet' && wallet.address && supportsMoonPayBuy(t.chain, wallet.walletType));

  return (
    <div className="w-full max-w-[480px] mx-auto space-y-3">
      <RecentSwaps />

      <div className="swap-card p-2 sm:p-2.5">
        <div className="flex items-center justify-between px-2.5 pt-1.5 pb-2.5">
          <h2 className="eyebrow">{reviewing ? 'review swap' : 'swap to zec'}</h2>
          <WalletButton
            wallet={wallet}
            onOpen={() => { setWalletError(''); setWalletModal(true); }}
            onDisconnect={() => { wallet.disconnect(); dispatch({ type: 'set_refund_addr', address: '' }); }}
          />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {state.view === 'edit' ? (
            <motion.div key="edit" {...fade}>
              <EditView
                state={state}
                amountRef={amountRef}
                tokens={tokens}
                tokensLoading={tokensLoading}
                pickerOpen={pickerOpen}
                onPickerOpenChange={setPickerOpen}
                sendMode={sendMode}
                walletConnected={wallet.connected}
                walletName={wallet.walletName}
                balance={compatible ? balance : null}
                balanceLoading={compatible && balanceLoading}
                preview={preview}
                recommendations={recommendations}
                onSelectToken={(token) => dispatch({ type: 'select_token', token })}
                onSetAmount={(amount) => dispatch({ type: 'set_amount', amount })}
                onSetZecAddr={(address) => dispatch({ type: 'set_zec_addr', address })}
                onSetRefundAddr={(address) => dispatch({ type: 'set_refund_addr', address })}
                onSetSlippage={(bps) => dispatch({ type: 'set_slippage', bps })}
                onOpenWallet={() => { setWalletError(''); setWalletModal(true); }}
                onChooseManual={() => { setWalletModal(false); dispatch({ type: 'set_manual', manual: true }); }}
                onUseWallet={() => { dispatch({ type: 'set_manual', manual: false }); if (!compatible) setWalletModal(true); }}
                onReview={() => dispatch({ type: 'review' })}
                buyWithCard={{ show: showCard, loading: moonPay.loading, error: moonPay.error, onOpen: openMoonPay }}
              />
            </motion.div>
          ) : (
            <motion.div key="review" {...fade}>
              <ReviewView
                state={state}
                preview={preview}
                refreshMs={refreshMs}
                mode={sendMode === 'wallet' ? 'wallet' : 'manual'}
                walletName={wallet.walletName}
                refundAddress={refundAddress}
                onBack={() => dispatch({ type: 'back' })}
                onConfirm={handleConfirm}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-2.5 px-2.5 pb-1 text-right">
          <Link href="/how-it-works#privacy" className="text-xs text-muted hover:text-primary transition-colors">
            What we know about you →
          </Link>
        </div>
      </div>

      <WalletModal
        open={walletModal}
        onClose={() => setWalletModal(false)}
        wallet={wallet}
        chain={t.chain}
        chainLabel={t.chainLabel}
        onConnect={handleConnect}
        onChooseManual={() => { setWalletModal(false); dispatch({ type: 'set_manual', manual: true }); }}
        error={walletError}
      />
    </div>
  );
}
