import { useEffect, useRef, useState } from 'react';
import { api } from '../api/endpoints';
import { errorMessage } from './useApi';
import type { Quote, QuoteItemInput } from '../api/types';

interface QuoteState {
  quote: Quote | null;
  error: string | null;
  /** True while a quote request is in flight; previous quote stays visible. */
  pending: boolean;
}

/**
 * Debounced server quote. Every displayed total comes from here — the client
 * never adds up money itself. Dragging the Spark slider fires one request per
 * `delay` ms of stillness, and out-of-order responses are discarded so a slow
 * earlier request cannot overwrite a newer total.
 */
export function useQuote(items: QuoteItemInput[], delay = 300): QuoteState {
  const [state, setState] = useState<QuoteState>({ quote: null, error: null, pending: false });

  // Serialize the input so the effect re-runs on value change, not identity.
  const key = JSON.stringify(items);
  const latestRequest = useRef(0);

  useEffect(() => {
    const parsed = JSON.parse(key) as QuoteItemInput[];

    if (parsed.length === 0) {
      setState({ quote: null, error: null, pending: false });
      return;
    }

    setState((prev) => ({ ...prev, pending: true }));
    const requestId = ++latestRequest.current;

    const timer = setTimeout(() => {
      api.checkout
        .quote(parsed)
        .then((quote) => {
          if (requestId !== latestRequest.current) return;
          setState({ quote, error: null, pending: false });
        })
        .catch((err: unknown) => {
          if (requestId !== latestRequest.current) return;
          setState({ quote: null, error: errorMessage(err), pending: false });
        });
    }, delay);

    return () => clearTimeout(timer);
  }, [key, delay]);

  return state;
}
