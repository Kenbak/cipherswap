'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useWallet, chainToWalletType, type DetectedWallet } from '@/hooks/useWallet';
import { useSwapMachine } from '@/hooks/useSwapMachine';
import { useTokenList } from '@/hooks/useTokenList';
import { useBalance } from '@/hooks/useBalance';
import { useQuoteCountdown } from '@/hooks/useQuoteCountdown';
import { useStatusPolling } from '@/hooks/useStatusPolling';
import { usePendingSwapRestore, usePendingSwapPersist } from '@/hooks/usePendingSwap';
import { useRecommendations } from '@/hooks/useRecommendations';
import { SectionLabel } from './SectionLabel';
import { WalletSwitcher } from './WalletSwitcher';
import { Sidebar } from './Sidebar';
import { Connect } from './steps/Connect';
import { Form } from './steps/Form';
import { Quote } from './steps/Quote';
import { Waiting } from './steps/Waiting';
import { Complete } from './steps/Complete';
import { Error as ErrorStep } from './steps/Error';
import type { SourceToken } from './types';
import { PENDING_SWAP_KEY, ZEC_ASSET_ID, ZEC_DECIMALS, validateZecAddress } from './types';

const motionProps = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { type: 'spring' as const, stiffness: 300, damping: 30 },
};

interface SwapClientProps {
  initialTokens?: SourceToken[];
}

export default function SwapClient({ initialTokens }: SwapClientProps) {
  const [state, dispatch] = useSwapMachine();
  const wallet = useWallet();
  const { tokens, loading: tokensLoading } = useTokenList(initialTokens);
  const [walletError, setWalletError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sendingTx, setSendingTx] = useState(false);
  const [txWalletError, setTxWalletError] = useState('');
  const [showSlippage, setShowSlippage] = useState(false);
  const [previewZec, setPreviewZec] = useState('');
  const [balanceRefresh, setBalanceRefresh] = useState(0);
  const previewTimer = useRef<NodeJS.Timeout | null>(null);

  const selectedToken = (state.kind !== 'connect' && state.kind !== 'error')
    ? state.selectedToken
    : (state.kind === 'error' && state.retryFields ? state.retryFields.selectedToken : (initialTokens?.[0] || tokens[0]));
  const balance = useBalance(wallet, selectedToken, balanceRefresh);
  const recommendations = useRecommendations(selectedToken);

  usePendingSwapRestore(dispatch, state);
  usePendingSwapPersist(state);

  const chainWallets = wallet.getWalletsForChain(selectedToken.chain);

  const compatibleTokens = wallet.connected && state.kind !== 'connect' && state.mode === 'wallet'
    ? tokens.filter(t => chainToWalletType(t.chain) === wallet.walletType)
    : tokens;

  // Auto-set initial token when tokens load
  useEffect(() => {
    if (state.kind === 'form' && tokens.length > 0 && state.selectedToken.id === 'eth-usdc') {
      const compatible = state.mode === 'wallet' && wallet.connected
        ? tokens.filter(t => chainToWalletType(t.chain) === wallet.walletType)
        : tokens;
      if (compatible.length > 0 && compatible[0].id !== state.selectedToken.id) {
        dispatch({ type: 'select_token', token: compatible[0] });
      }
    }
  }, [tokens, wallet.connected, wallet.walletType]);

  // Wallet connection → refund auto-fill + token realignment
  useEffect(() => {
    if (wallet.connected && wallet.address && state.kind !== 'connect' && state.mode === 'wallet') {
      dispatch({ type: 'set_refund_addr', address: wallet.address });
      if (chainToWalletType(selectedToken.chain) !== wallet.walletType) {
        const firstCompatible = tokens.find(t => chainToWalletType(t.chain) === wallet.walletType);
        if (firstCompatible) dispatch({ type: 'select_token', token: firstCompatible });
      }
    }
  }, [wallet.connected, wallet.address, wallet.walletType]);

  // Quote countdown
  const expiresAt = state.kind === 'quote' ? state.expiresAt : null;
  const { timeLeft, progress } = useQuoteCountdown(expiresAt, () => {
    dispatch({ type: 'quote_expired' });
    setError('Quote expired — please get a new one');
  });

  // Status polling
  const depositAddr = (state.kind === 'waiting') ? state.depositAddress : null;
  const swapStatus = useStatusPolling(
    depositAddr,
    state.kind === 'waiting',
    () => {
      dispatch({ type: 'status_complete' });
      localStorage.removeItem(PENDING_SWAP_KEY);
    },
    (reason) => {
      dispatch({ type: 'status_failed', reason });
      localStorage.removeItem(PENDING_SWAP_KEY);
    },
  );

  // Live preview
  useEffect(() => {
    if (state.kind !== 'form' && state.kind !== 'connect') return;
    if (state.kind === 'connect') { setPreviewZec(''); return; }
    const amt = state.amount;
    if (!amt || parseFloat(amt) <= 0) { setPreviewZec(''); return; }

    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(async () => {
      try {
        const amountSmallest = BigInt(Math.round(parseFloat(amt) * Math.pow(10, state.selectedToken.decimals))).toString();
        const res = await fetch('/api/swap/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originAsset: state.selectedToken.assetId,
            destinationAsset: ZEC_ASSET_ID,
            amount: amountSmallest,
            recipient: 't1VpYeCSNCDMM91x3KR1N8bBWQNnqiUpvy4',
            refundTo: '0x0000000000000000000000000000000000000000',
            slippageBps: state.slippageBps,
            dry: true,
          }),
        });
        const data = await res.json();
        if (data.success) {
          const q = data.quote || data;
          const out = q.amountOut || q.estimatedAmountOut || data.amountOut;
          if (out) setPreviewZec((parseInt(out) / Math.pow(10, ZEC_DECIMALS)).toFixed(4));
        }
      } catch {}
    }, 500);

    return () => { if (previewTimer.current) clearTimeout(previewTimer.current); };
  }, [state.kind === 'connect' ? null : (state as any).amount, state.kind === 'connect' ? null : (state as any).selectedToken?.id]);

  const handleChooseWallet = async (w: DetectedWallet) => {
    setWalletError('');
    try {
      await wallet.connect(w);
      dispatch({ type: 'choose_wallet' });
    } catch (err: any) {
      setWalletError(err.message || 'Connection failed');
    }
  };

  const handleGetQuote = async () => {
    if (state.kind !== 'form') return;
    const addrErr = validateZecAddress(state.zecAddress);
    if (!state.amount || !state.zecAddress || addrErr) return;

    const effectiveRefund = state.refundAddress || wallet.address || '';
    if (!effectiveRefund) return;

    setLoading(true);
    setError('');
    dispatch({ type: 'request_quote' });

    try {
      const amountSmallest = BigInt(Math.round(parseFloat(state.amount) * Math.pow(10, state.selectedToken.decimals))).toString();
      const res = await fetch('/api/swap/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originAsset: state.selectedToken.assetId,
          destinationAsset: ZEC_ASSET_ID,
          amount: amountSmallest,
          recipient: state.zecAddress,
          refundTo: effectiveRefund,
          slippageBps: state.slippageBps,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to get quote');
      const q = data.quote || data;
      const depositAddress = q.depositAddress || data.depositAddress || '';
      const outAmount = q.amountOut || q.estimatedAmountOut || data.amountOut;
      const estimatedZec = outAmount ? (parseInt(outAmount) / Math.pow(10, ZEC_DECIMALS)).toFixed(4) : '';

      dispatch({ type: 'quote_received', depositAddress, estimatedZec });
    } catch (err: any) {
      setError(err.message || 'Failed to get quote');
      dispatch({ type: 'quote_expired' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendFromWallet = async () => {
    if (state.kind !== 'waiting') return;
    setSendingTx(true);
    setTxWalletError('');
    try {
      const hash = await wallet.sendTransaction(state.depositAddress, state.amount, state.selectedToken.decimals, state.selectedToken.contractAddress);
      dispatch({ type: 'tx_sent', hash });
    } catch (err: any) {
      setTxWalletError(err.message || 'Transaction rejected');
    } finally {
      setSendingTx(false);
    }
  };

  const handleReset = () => {
    dispatch({ type: 'reset' });
    setError('');
    setTxWalletError('');
    setPreviewZec('');
    setBalanceRefresh(n => n + 1);
    localStorage.removeItem(PENDING_SWAP_KEY);
  };

  const currentAmount = (state.kind !== 'connect' && state.kind !== 'error') ? state.amount : '';
  const insufficientBalance = !!(wallet.connected && balance && currentAmount && parseFloat(currentAmount) > parseFloat(balance));

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6 animate-fade-in-up">
      {/* Main Swap Card */}
      <div className="lg:col-span-3">
        <div className="card p-0 overflow-hidden">
          {/* Card header */}
          <div className="px-5 py-3.5 border-b border-glass-4">
            <div className="flex items-center justify-between">
              <SectionLabel label="SWAP" />
              {state.kind !== 'connect' && state.mode === 'wallet' && (
                <WalletSwitcher
                  wallet={wallet}
                  chainWallets={chainWallets}
                  selectedChainLabel={selectedToken.chainLabel}
                  onConnect={async (w) => {
                    setWalletError('');
                    try { await wallet.connect(w); } catch (err: any) { setWalletError(err.message || 'Failed'); }
                  }}
                  onDisconnect={() => {
                    wallet.disconnect();
                    handleReset();
                  }}
                />
              )}
              {state.kind !== 'connect' && state.mode === 'manual' && (
                <span className="text-[10px] font-mono text-muted/60 uppercase tracking-wider">Manual mode</span>
              )}
            </div>
          </div>

          <div className="p-5">
            <AnimatePresence mode="wait">
              {state.kind === 'connect' && (
                <motion.div key="connect" {...motionProps}>
                  <Connect
                    wallet={wallet}
                    onChooseWallet={handleChooseWallet}
                    onChooseManual={() => dispatch({ type: 'choose_manual' })}
                    walletError={walletError}
                  />
                </motion.div>
              )}

              {(state.kind === 'form' || state.kind === 'quoting') && (
                <motion.div key="form" {...motionProps}>
                  <Form
                    mode={state.mode}
                    amount={state.amount}
                    zecAddress={state.zecAddress}
                    refundAddress={state.refundAddress}
                    slippageBps={state.slippageBps}
                    selectedToken={state.selectedToken}
                    tokens={compatibleTokens}
                    tokensLoading={tokensLoading}
                    recommendations={recommendations}
                    balance={balance}
                    previewZec={previewZec}
                    loading={loading || state.kind === 'quoting'}
                    error={error}
                    walletAddress={wallet.address}
                    insufficientBalance={insufficientBalance}
                    onSelectToken={(t) => dispatch({ type: 'select_token', token: t })}
                    onSetAmount={(v) => dispatch({ type: 'set_amount', amount: v })}
                    onSetZecAddr={(v) => dispatch({ type: 'set_zec_addr', address: v })}
                    onSetRefundAddr={(v) => dispatch({ type: 'set_refund_addr', address: v })}
                    onSetSlippage={(v) => dispatch({ type: 'set_slippage', bps: v })}
                    onSubmit={handleGetQuote}
                    onGoConnect={handleReset}
                    showSlippage={showSlippage}
                    onToggleSlippage={() => setShowSlippage(!showSlippage)}
                  />
                </motion.div>
              )}

              {state.kind === 'quote' && (
                <motion.div key="quote" {...motionProps}>
                  <Quote
                    mode={state.mode}
                    amount={state.amount}
                    selectedToken={state.selectedToken}
                    estimatedZec={state.estimatedZec}
                    slippageBps={state.slippageBps}
                    zecAddress={state.zecAddress}
                    timeLeft={timeLeft}
                    progress={progress}
                    onBack={() => dispatch({ type: 'quote_expired' })}
                    onConfirm={() => dispatch({ type: 'confirm' })}
                    walletName={wallet.walletName}
                  />
                </motion.div>
              )}

              {state.kind === 'waiting' && (
                <motion.div key="waiting" {...motionProps}>
                  <Waiting
                    mode={state.mode}
                    amount={state.amount}
                    selectedToken={state.selectedToken}
                    estimatedZec={state.estimatedZec}
                    depositAddress={state.depositAddress}
                    txHash={state.txHash}
                    swapStatus={swapStatus}
                    sendingTx={sendingTx}
                    walletError={txWalletError}
                    onSendFromWallet={handleSendFromWallet}
                    onCancel={handleReset}
                  />
                </motion.div>
              )}

              {state.kind === 'complete' && (
                <motion.div key="complete" {...motionProps}>
                  <Complete
                    estimatedZec={state.estimatedZec}
                    onReset={handleReset}
                  />
                </motion.div>
              )}

              {state.kind === 'error' && (
                <motion.div key="error" {...motionProps}>
                  <ErrorStep
                    reason={state.reason}
                    hasRetry={!!state.retryFields}
                    refundAddress={state.retryFields?.refundAddress || wallet.address || undefined}
                    onRetry={() => dispatch({ type: 'retry' })}
                    onReset={handleReset}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="lg:col-span-2">
        <Sidebar state={state} />
      </div>
    </div>
  );
}
