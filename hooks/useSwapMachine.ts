'use client';

import { useReducer } from 'react';
import type { Draft, SourceToken } from '@/app/_components/types';
import { FALLBACK_TOKENS } from '@/app/_components/types';
import type { QuoteResponse } from '@/lib/near-intents';

/**
 * edit    → the swap form (always the entry point; no connect gate)
 * review  → indicative quote kept fresh; user checks addresses + numbers
 * locking → requesting the binding quote that creates the deposit address
 * signing → wallet prompt is open for the deposit transaction
 */
export type SwapView = 'edit' | 'review' | 'locking' | 'signing';

export interface SwapState extends Draft {
  view: SwapView;
  /** User opted to send from an exchange or external wallet. */
  manual: boolean;
  /** Binding quote reused if the user retries the wallet prompt. */
  binding: { response: QuoteResponse; receivedAt: number } | null;
  error: string | null;
  /** Set when the binding quote came back materially worse than the preview. */
  rateChanged: boolean;
}

export type SwapEvent =
  | { type: 'select_token'; token: SourceToken }
  | { type: 'set_amount'; amount: string }
  | { type: 'set_zec_addr'; address: string }
  | { type: 'set_refund_addr'; address: string }
  | { type: 'set_slippage'; bps: number }
  | { type: 'set_manual'; manual: boolean }
  | { type: 'review' }
  | { type: 'back' }
  | { type: 'lock' }
  | { type: 'locked'; response: QuoteResponse; rateChanged: boolean }
  | { type: 'signing' }
  | { type: 'fail'; error: string }
  | { type: 'clear_error' }
  | { type: 'reset' };

function initial(token?: SourceToken): SwapState {
  return {
    view: 'edit',
    manual: false,
    binding: null,
    error: null,
    rateChanged: false,
    amount: '',
    zecAddress: '',
    refundAddress: '',
    slippageBps: 100,
    selectedToken: token ?? FALLBACK_TOKENS[0],
  };
}

/** Any change to what is being swapped invalidates a binding quote. */
function edited(state: SwapState, patch: Partial<SwapState>): SwapState {
  return { ...state, ...patch, binding: null, rateChanged: false, error: null, view: 'edit' };
}

function swapReducer(state: SwapState, event: SwapEvent): SwapState {
  switch (event.type) {
    case 'select_token':
      if (event.token.id === state.selectedToken.id) return state;
      return edited(state, { selectedToken: event.token, amount: '', refundAddress: '' });
    case 'set_amount':
      return edited(state, { amount: event.amount });
    case 'set_zec_addr':
      return edited(state, { zecAddress: event.address.trim() });
    case 'set_refund_addr':
      return edited(state, { refundAddress: event.address.trim() });
    case 'set_slippage':
      return { ...state, slippageBps: event.bps, binding: null, rateChanged: false };
    case 'set_manual':
      return { ...state, manual: event.manual, error: null };
    case 'review':
      return { ...state, view: 'review', error: null };
    case 'back':
      return { ...state, view: 'edit', error: null, rateChanged: false };
    case 'lock':
      return { ...state, view: 'locking', error: null };
    case 'locked':
      return {
        ...state,
        view: event.rateChanged ? 'review' : 'locking',
        binding: { response: event.response, receivedAt: Date.now() },
        rateChanged: event.rateChanged,
      };
    case 'signing':
      return { ...state, view: 'signing', error: null };
    case 'fail':
      return { ...state, view: 'review', error: event.error };
    case 'clear_error':
      return { ...state, error: null };
    case 'reset':
      return initial(state.selectedToken);
    default:
      return state;
  }
}

export function useSwapMachine(initialToken?: SourceToken) {
  return useReducer(swapReducer, initialToken, initial);
}

export { swapReducer };
