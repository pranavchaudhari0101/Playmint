/**
 * Wire types mirroring the backend's exported interfaces. Kept in sync by
 * hand with backend/src/services/*.ts — the field names below are the JSON
 * aliases the SQL layer already emits (camelCase via AS "...").
 */

// ─── Auth ───────────────────────────────────────────────────────────

export type Role = 'user' | 'admin';

export interface PublicUser {
  id: string;
  email: string;
  role: Role;
  displayName: string | null;
  createdAt: string;
}

export interface WalletState {
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
}

// ─── Catalog ────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  productCount: number;
}

export interface CatalogProduct {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  sku: string;
  name: string;
  description: string | null;
  cashPricePaise: number;
  maxSparks: number;
  earnbackSparks: number;
  imageUrl: string | null;
  tags: string[];
  stock: number | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  isSparksOnly: boolean;
  cashValuePaiseOfMaxSparks: number;
  inStock: boolean;
}

// ─── Wallet ─────────────────────────────────────────────────────────

export type LedgerEntryType = 'EARN' | 'RESERVE' | 'COMMIT' | 'RELEASE' | 'ADJUSTMENT';

export interface LedgerEntry {
  id: string;
  amount: number;
  entryType: LedgerEntryType;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
}

export type EarnSource =
  | 'MATCH_WIN'
  | 'MATCH_PLAYED'
  | 'REWARDED_ACTION'
  | 'LEVEL_UP'
  | 'QUEST_COMPLETE';

export interface EarnResult {
  transactionId: string | null;
  newBalance: number;
  /** True when the eventId was already applied — the balance did not move. */
  duplicate: boolean;
}

// ─── Checkout ───────────────────────────────────────────────────────

export interface QuoteItemInput {
  productId: string;
  qty: number;
  sparksApplied: number;
}

export interface QuoteLine {
  productId: string;
  sku: string;
  name: string;
  imageUrl: string | null;
  qty: number;
  unitPricePaise: number;
  maxSparks: number;
  isSparksOnly: boolean;
  sparksApplied: number;
  lineCashPaise: number;
  lineSparks: number;
  earnbackSparks: number;
}

export interface Quote {
  lines: QuoteLine[];
  cashTotalPaise: number;
  sparksTotal: number;
  earnbackSparks: number;
  walletBalance: number;
  sufficientBalance: boolean;
}

export type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'FAILED' | 'CANCELLED' | 'FULFILLED';

export interface ShippingAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface OrderItemView {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  imageUrl: string | null;
  qty: number;
  unitPricePaise: number;
  sparksApplied: number;
  lineCashPaise: number;
  lineSparks: number;
}

export interface OrderView {
  id: string;
  status: OrderStatus;
  cashTotalPaise: number;
  sparksTotal: number;
  earnbackSparks: number;
  paymentProvider: string | null;
  paymentIntentId: string | null;
  paymentClientPayload: Record<string, unknown> | null;
  shippingAddress: Record<string, unknown> | null;
  items: OrderItemView[];
  createdAt: string;
  updatedAt: string;
}

/** Summary row from GET /orders — no items, no payment fields. */
export interface OrderSummary {
  id: string;
  status: OrderStatus;
  cashTotalPaise: number;
  sparksTotal: number;
  earnbackSparks: number;
  createdAt: string;
}

export interface PaymentIntent {
  intentId: string;
  provider: string;
  amountPaise: number;
  clientPayload: Record<string, unknown>;
}

export interface CreateOrderResult {
  order: OrderView;
  wallet: WalletState;
  /** Null when the order was fully covered by Sparks and settled instantly. */
  intent: PaymentIntent | null;
}

export interface SettleResult {
  order: OrderView;
  wallet: WalletState;
}

// ─── Goals ──────────────────────────────────────────────────────────

export interface GoalView {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  targetSparks: number;
  status: 'ACTIVE' | 'ACHIEVED' | 'DROPPED';
  progressSparks: number;
  remainingSparks: number;
  createdAt: string;
}

// ─── Admin ──────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  newUsers7d: number;
  paidOrders: number;
  pendingOrders: number;
  /** bigint columns arrive as strings from node-postgres. */
  gmvPaise: string;
  sparksSpent: string;
  earnbackCredited: string;
  sparksIssued: string;
  sparksOutstanding: string;
  activeProducts: number;
}

export interface AdminProduct {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  sku: string;
  name: string;
  description: string | null;
  cashPricePaise: number;
  maxSparks: number;
  earnbackSparks: number;
  imageUrl: string | null;
  tags: string[];
  stock: number | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductInput {
  categoryId?: string | null;
  sku?: string;
  name?: string;
  description?: string | null;
  cashPricePaise?: number;
  maxSparks?: number;
  earnbackSparks?: number;
  imageUrl?: string | null;
  tags?: string[];
  stock?: number | null;
  isActive?: boolean;
  sortOrder?: number;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

export interface AdminOrder {
  id: string;
  status: OrderStatus;
  cashTotalPaise: number;
  sparksTotal: number;
  earnbackSparks: number;
  paymentProvider: string | null;
  createdAt: string;
  userEmail: string;
  userName: string | null;
  itemCount: number;
}

export interface AdminLedgerEntry {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  entryType: LedgerEntryType;
  referenceId: string | null;
  idempotencyKey: string | null;
  description: string | null;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: Role;
  displayName: string | null;
  createdAt: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  orderCount: number;
}

// ─── Envelopes ──────────────────────────────────────────────────────

export type ProductListResult = { products: CatalogProduct[]; total: number };
export type AdminProductListResult = { products: AdminProduct[]; total: number };
export type LedgerListResult = { entries: LedgerEntry[]; total: number };
export type AdminLedgerListResult = { entries: AdminLedgerEntry[]; total: number };
export type OrderListResult = { orders: OrderSummary[]; total: number };
export type AdminOrderListResult = { orders: AdminOrder[]; total: number };
export type AdminUserListResult = { users: AdminUser[]; total: number };

// ─── Game Progression & Economy Quotas ─────────────────────────────

export interface GameProgressState {
  userId: string;
  gameId: string;
  unlockedLevel: number;
  completedLevels: number[];
  bestTimes: Record<number, number>;
  streakDays: number;
  streakMultiplier: number;
  dailyCap: number;
  dailyEarned: number;
  dailyRemaining: number;
  lastPlayedAt: string;
}

export interface CompleteLevelResult {
  progress: GameProgressState;
  wallet: WalletState;
  baseReward: number;
  streakBonus: number;
  totalEarned: number;
  alreadyCompleted: boolean;
}

