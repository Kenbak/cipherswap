'use client';

import { useReducer } from 'react';
import type { SwapState, SwapEvent, FormFields } from '@/app/_components/types';
import { FALLBACK_TOKENS } from '@/app/_components/types';
import type { SourceToken } from '@/app/_components/types';

const DEFAULT_FORM: FormFields = {
  amount: '',
  zecAddress: '',
  refundAddress: '',
  slippageBps: 100,
  selectedToken: FALLBACK_TOKENS[0],
};

function formFields(s: SwapState): FormFields {
  if (s.kind === 'connect') return DEFAULT_FORM;
  if (s.kind === 'error') return s.retryFields || DEFAULT_FORM;
  return {
    amount: s.amount,
    zecAddress: s.zecAddress,
    refundAddress: s.refundAddress,
    slippageBps: s.slippageBps,
    selectedToken: s.selectedToken,
  };
}

function swapReducer(state: SwapState, event: SwapEvent): SwapState {
  switch (event.type) {
    case 'choose_wallet':
      return { kind: 'form', mode: 'wallet', ...DEFAULT_FORM };

    case 'choose_manual':
      return { kind: 'form', mode: 'manual', ...DEFAULT_FORM };

    case 'disconnect':
      return { kind: 'connect' };

    case 'select_token':
      if (state.kind === 'connect') return state;
      return { ...state, kind: 'form', selectedToken: event.token, amount: '' } as any;

    case 'set_amount':
      if (state.kind === 'connect') return state;
      return { ...state, amount: event.amount } as any;

    case 'set_zec_addr':
      if (state.kind === 'connect') return state;
      return { ...state, zecAddress: event.address } as any;

    case 'set_refund_addr':
      if (state.kind === 'connect') return state;
      return { ...state, refundAddress: event.address } as any;

    case 'set_slippage':
      if (state.kind === 'connect') return state;
      return { ...state, slippageBps: event.bps } as any;

    case 'request_quote':
      if (state.kind !== 'form') return state;
      return { ...state, kind: 'quoting' } as any;

    case 'quote_received':
      if (state.kind !== 'quoting') return state;
      return {
        ...state,
        kind: 'quote',
        depositAddress: event.depositAddress,
        estimatedZec: event.estimatedZec,
        expiresAt: Date.now() + 60_000,
      } as any;

    case 'quote_expired':
      if (state.kind !== 'quote' && state.kind !== 'quoting') return state;
      return { ...state, kind: 'form' } as any;

    case 'confirm':
      if (state.kind !== 'quote') return state;
      return {
        kind: 'waiting',
        mode: state.mode,
        depositAddress: state.depositAddress,
        estimatedZec: state.estimatedZec,
        ...formFields(state),
      };

    case 'tx_sent':
      if (state.kind !== 'waiting') return state;
      return { ...state, txHash: event.hash } as any;

    case 'status_complete':
      if (state.kind !== 'waiting') return state;
      return {
        kind: 'complete',
        mode: state.mode,
        estimatedZec: state.estimatedZec,
        ...formFields(state),
      };

    case 'status_failed':
      if (state.kind !== 'waiting' && state.kind !== 'quoting') return state;
      return {
        kind: 'error',
        mode: (state as any).mode || 'manual',
        reason: event.reason,
        retryFields: formFields(state),
      } as any;

    case 'retry': {
      if (state.kind !== 'error') return state;
      const fields = state.retryFields || DEFAULT_FORM;
      return { kind: 'form', mode: state.mode, ...fields };
    }

    case 'reset':
      return { kind: 'connect' };

    case 'restore':
      return {
        kind: 'waiting',
        mode: event.mode,
        depositAddress: event.depositAddress,
        estimatedZec: event.estimatedZec,
        amount: event.amount,
        zecAddress: event.zecAddress,
        refundAddress: '',
        slippageBps: 100,
        selectedToken: event.token,
        txHash: event.txHash,
      };

    default:
      return state;
  }
}

export function useSwapMachine(initialToken?: SourceToken) {
  const initial: SwapState = { kind: 'connect' };
  return useReducer(swapReducer, initial);
}

export { swapReducer };
