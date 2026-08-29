import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CatalogProduct, QuoteItemInput } from '../api/types';
import { lineSparkCap, normalizeCartSparks } from '../lib/money';

/**
 * ─── Cart ──────────────────────────────────────────────────────────
 * The cart holds INTENT only: which product, how many, and how many
 * Sparks the player wants to apply. It deliberately stores no prices
 * and computes no totals — /checkout/quote is the single source of
 * truth for money. The product snapshot is kept for rendering (name,
 * image, cap) and is refreshed from the catalog, never trusted for
 * pricing decisions the server will re-derive anyway.
 * ──────────────────────────────────────────────────────────────────
 */

export interface CartLine {
  productId: string;
  qty: number;
  sparksApplied: number;
  /** Display snapshot; the server re-reads authoritative values on quote. */
  product: CatalogProduct;
}

interface CartContextValue {
  lines: CartLine[];
  itemCount: number;
  /** Quote input in the exact shape the API expects. */
  quoteItems: QuoteItemInput[];
  add(product: CatalogProduct, qty?: number): void;
  remove(productId: string): void;
  setQty(productId: string, qty: number): void;
  setSparks(productId: string, sparks: number): void;
  clear(): void;
  has(productId: string): boolean;
}

const STORAGE_KEY = 'sparks.cart';
const MAX_QTY = 5; // MAX_QTY_PER_LINE in checkoutService
const MAX_LINES = 10; // MAX_LINES in checkoutService

const CartContext = createContext<CartContextValue | null>(null);

function loadLines(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed.filter((l) => l?.productId && l?.product) : [];
  } catch {
    return [];
  }
}

/** Cart-level alias for the shared normalization rule. */
function normalizeSparks(product: CatalogProduct, qty: number, desired: number): number {
  return normalizeCartSparks(product, qty, desired);
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lines, setLines] = useState<CartLine[]>(loadLines);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines]);

  const add = useCallback((product: CatalogProduct, qty = 1) => {
    setLines((current) => {
      const existing = current.find((l) => l.productId === product.id);

      if (existing) {
        const nextQty = Math.min(MAX_QTY, existing.qty + qty);
        return current.map((l) =>
          l.productId === product.id
            ? {
                ...l,
                qty: nextQty,
                product,
                sparksApplied: normalizeSparks(product, nextQty, l.sparksApplied),
              }
            : l,
        );
      }

      if (current.length >= MAX_LINES) return current;

      const boundedQty = Math.min(MAX_QTY, Math.max(1, qty));
      return [
        ...current,
        {
          productId: product.id,
          qty: boundedQty,
          // Default to the full eligible cap: the most generous split the
          // server will allow. The slider lets the player dial it back.
          sparksApplied: normalizeSparks(product, boundedQty, lineSparkCap(product, boundedQty)),
          product,
        },
      ];
    });
  }, []);

  const remove = useCallback((productId: string) => {
    setLines((current) => current.filter((l) => l.productId !== productId));
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    const bounded = Math.min(MAX_QTY, Math.max(1, qty));
    setLines((current) =>
      current.map((l) =>
        l.productId === productId
          ? {
              ...l,
              qty: bounded,
              sparksApplied: normalizeSparks(l.product, bounded, l.sparksApplied),
            }
          : l,
      ),
    );
  }, []);

  const setSparks = useCallback((productId: string, sparks: number) => {
    setLines((current) =>
      current.map((l) =>
        l.productId === productId
          ? { ...l, sparksApplied: normalizeSparks(l.product, l.qty, sparks) }
          : l,
      ),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      itemCount: lines.reduce((sum, l) => sum + l.qty, 0),
      quoteItems: lines.map(({ productId, qty, sparksApplied }) => ({
        productId,
        qty,
        sparksApplied,
      })),
      add,
      remove,
      setQty,
      setSparks,
      clear,
      has: (productId: string) => lines.some((l) => l.productId === productId),
    }),
    [lines, add, remove, setQty, setSparks, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}
