/**
 * ─── Money & Sparks ────────────────────────────────────────────────
 * The server is the only authority on prices and totals. This module
 * exists purely to FORMAT server-supplied integers and to compute the
 * bounds of the Spark slider before a quote round-trip.
 *
 * Unit invariant, taken from the backend:
 *   - Cash is stored in paise (integer). 100 paise = ₹1.
 *   - 1 Spark = 1 paise, so 100 Sparks = ₹1.
 *
 * The 1:1 Spark↔paise relationship is what makes `checkoutService`'s
 * `lineCash = cashPricePaise * qty - sparksApplied` correct, and why
 * `catalogService` reports `cashValuePaiseOfMaxSparks === maxSparks`.
 * Never divide Sparks by 10 — the old prototype did, and it was wrong.
 * ──────────────────────────────────────────────────────────────────
 */

export const SPARKS_PER_RUPEE = 100;
export const PAISE_PER_RUPEE = 100;

/** Formats integer paise as an Indian-locale rupee string. */
export function formatPaise(paise: number, opts: { decimals?: boolean } = {}): string {
  const rupees = paise / PAISE_PER_RUPEE;
  const showDecimals = opts.decimals ?? paise % PAISE_PER_RUPEE !== 0;
  return `₹${rupees.toLocaleString('en-IN', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  })}`;
}

/** Formats a Spark count with thousands separators. */
export function formatSparks(sparks: number): string {
  return sparks.toLocaleString('en-IN');
}

/** The rupee value a Spark balance can discharge. Sparks are 1:1 with paise. */
export function sparksAsPaise(sparks: number): number {
  return sparks;
}

/** Human-readable cash equivalent of a Spark amount, e.g. "2,940 Sparks (₹29.40)". */
export function sparksWithCashValue(sparks: number): string {
  return `${formatSparks(sparks)} Sparks (${formatPaise(sparksAsPaise(sparks), { decimals: true })})`;
}

/**
 * The Spark cap the server will accept for one cart line, mirroring
 * `computeLine` in checkoutService:
 *
 *   Sparks-only (cashPricePaise === 0) → exactly maxSparks * qty
 *   hybrid                             → 0 .. min(maxSparks * qty, cashPrice * qty)
 *
 * `walletBalance` is deliberately NOT folded in: the cap is a property of
 * the product, and the UI shows the full eligible cap even when the player
 * cannot yet afford it. Use `slidableMax` for the interactive bound.
 */
export function lineSparkCap(
  product: { cashPricePaise: number; maxSparks: number },
  qty: number,
): number {
  const lineCash = product.cashPricePaise * qty;
  if (product.cashPricePaise === 0) return product.maxSparks * qty;
  return Math.min(product.maxSparks * qty, lineCash);
}

/** True when the server requires the line to be paid entirely in Sparks. */
export function isSparksOnly(product: { cashPricePaise: number }): boolean {
  return product.cashPricePaise === 0;
}

/**
 * Upper bound for the slider: the product cap, further limited by what the
 * player actually holds. Keeps the UI out of states the server would reject
 * with INSUFFICIENT_SPARKS.
 */
export function slidableMax(
  product: { cashPricePaise: number; maxSparks: number },
  qty: number,
  walletBalance: number,
): number {
  return Math.min(lineSparkCap(product, qty), Math.max(0, walletBalance));
}

/** Sparks still needed to reach a goal or a full redemption. */
export function shortfall(target: number, balance: number): number {
  return Math.max(0, target - balance);
}

/**
 * Cart normalization — the exact rule CartContext applies on every add
 * and qty change so a line can never drift out of the range the
 * server's `computeLine` accepts:
 *
 *   Sparks-only → exactly the cap (maxSparks * qty)
 *   hybrid      → clamp desired into [0, cap]
 */
export function normalizeCartSparks(
  product: { cashPricePaise: number; maxSparks: number },
  qty: number,
  desired: number,
): number {
  const cap = lineSparkCap(product, qty);
  if (isSparksOnly(product)) return cap;
  return Math.max(0, Math.min(desired, cap));
}
