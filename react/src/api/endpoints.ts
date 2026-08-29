import { request } from './client';
import type {
  AdminCategory,
  AdminLedgerListResult,
  AdminOrderListResult,
  AdminProductInput,
  AdminProductListResult,
  AdminStats,
  AdminUserListResult,
  Category,
  CatalogProduct,
  CreateOrderResult,
  EarnResult,
  EarnSource,
  GoalView,
  LedgerListResult,
  OrderListResult,
  OrderStatus,
  OrderView,
  ProductListResult,
  Quote,
  QuoteItemInput,
  SettleResult,
  ShippingAddress,
  WalletState,
  GameProgressState,
  CompleteLevelResult,
} from './types';

/** Typed surface over the backend routes. One function per endpoint. */
export const api = {
  // ── Wallet ────────────────────────────────────────────────────────
  wallet: {
    get: () => request<WalletState>('/wallet'),

    ledger: (limit = 50, offset = 0) =>
      request<LedgerListResult>('/wallet/ledger', { query: { limit, offset } }),

    /**
     * `eventId` is the idempotency key. Replaying the same eventId returns
     * duplicate:true and leaves the balance untouched.
     */
    earn: (amount: number, source: EarnSource, eventId: string) =>
      request<EarnResult>('/wallet/earn', {
        method: 'POST',
        body: { amount, source, eventId },
      }),
  },

  // ── Game Progression & Quotas ─────────────────────────────────────
  game: {
    getProgress: (game = 'vector') =>
      request<GameProgressState>('/game/progress', { query: { game } }),

    completeLevel: (level: number, seconds: number, moves: number, game = 'vector') =>
      request<CompleteLevelResult>('/game/complete-level', {
        method: 'POST',
        body: { game, level, seconds, moves },
      }),
  },

  // ── Catalog ───────────────────────────────────────────────────────
  catalog: {
    categories: () => request<{ categories: Category[] }>('/catalog/categories'),

    products: (opts: { category?: string; search?: string; limit?: number; offset?: number } = {}) =>
      request<ProductListResult>('/catalog/products', {
        query: {
          category: opts.category,
          search: opts.search,
          limit: opts.limit ?? 24,
          offset: opts.offset ?? 0,
        },
      }),

    product: (id: string) => request<{ product: CatalogProduct }>(`/catalog/products/${id}`),
  },

  // ── Checkout ──────────────────────────────────────────────────────
  checkout: {
    quote: (items: QuoteItemInput[]) =>
      request<Quote>('/checkout/quote', { method: 'POST', body: { items } }),

    createOrder: (items: QuoteItemInput[], shippingAddress?: ShippingAddress) =>
      request<CreateOrderResult>('/checkout/orders', {
        method: 'POST',
        body: { items, ...(shippingAddress ? { shippingAddress } : {}) },
      }),
  },

  // ── Payments (mock gateway) ───────────────────────────────────────
  payments: {
    /** Drives the simulated gateway callback for a pending intent. */
    confirmMock: (intentId: string, outcome: 'SUCCESS' | 'FAILURE') =>
      request<SettleResult>(`/payments/mock/${intentId}`, {
        method: 'POST',
        body: { outcome },
      }),
  },

  // ── Orders ────────────────────────────────────────────────────────
  orders: {
    list: (limit = 20, offset = 0) =>
      request<OrderListResult>('/orders', { query: { limit, offset } }),

    get: (id: string) => request<{ order: OrderView }>(`/orders/${id}`),

    cancel: (id: string) => request<SettleResult>(`/orders/${id}/cancel`, { method: 'POST' }),
  },

  // ── Goals ─────────────────────────────────────────────────────────
  goals: {
    active: () => request<{ goal: GoalView | null }>('/goals/active'),

    set: (productId: string) =>
      request<{ goal: GoalView }>('/goals', { method: 'POST', body: { productId } }),

    drop: () => request<void>('/goals/active', { method: 'DELETE' }),
  },

  // ── Admin ─────────────────────────────────────────────────────────
  admin: {
    stats: () => request<AdminStats>('/admin/stats'),

    products: (limit = 100, offset = 0) =>
      request<AdminProductListResult>('/admin/products', {
        query: { includeInactive: true, limit, offset },
      }),

    createProduct: (input: AdminProductInput & { sku: string; name: string }) =>
      request<{ id: string }>('/admin/products', { method: 'POST', body: input }),

    updateProduct: (id: string, input: AdminProductInput) =>
      request<{ id: string }>(`/admin/products/${id}`, { method: 'PATCH', body: input }),

    /** Soft delete — sets is_active false so order history stays intact. */
    deleteProduct: (id: string) =>
      request<{ id: string }>(`/admin/products/${id}`, { method: 'DELETE' }),

    categories: () => request<{ categories: AdminCategory[] }>('/admin/categories'),

    createCategory: (input: { name: string; slug: string; sortOrder?: number }) =>
      request<{ id: string }>('/admin/categories', { method: 'POST', body: input }),

    updateCategory: (id: string, input: { name?: string; sortOrder?: number; isActive?: boolean }) =>
      request<{ id: string }>(`/admin/categories/${id}`, { method: 'PATCH', body: input }),

    orders: (opts: { status?: OrderStatus; limit?: number; offset?: number } = {}) =>
      request<AdminOrderListResult>('/admin/orders', {
        query: { status: opts.status, limit: opts.limit ?? 50, offset: opts.offset ?? 0 },
      }),

    setOrderStatus: (id: string, status: 'FULFILLED' | 'CANCELLED') =>
      request<{ id: string; status: string }>(`/admin/orders/${id}/status`, {
        method: 'PATCH',
        body: { status },
      }),

    ledger: (opts: { userId?: string; limit?: number; offset?: number } = {}) =>
      request<AdminLedgerListResult>('/admin/ledger', {
        query: { userId: opts.userId, limit: opts.limit ?? 50, offset: opts.offset ?? 0 },
      }),

    /** Rejected with UNPROCESSABLE when the adjustment would overdraw. */
    adjustBalance: (userId: string, amount: number, description: string) =>
      request<{ wallet: WalletState }>('/admin/ledger/adjust', {
        method: 'POST',
        body: { userId, amount, description },
      }),

    users: (opts: { search?: string; limit?: number; offset?: number } = {}) =>
      request<AdminUserListResult>('/admin/users', {
        query: { search: opts.search, limit: opts.limit ?? 50, offset: opts.offset ?? 0 },
      }),
  },
};
