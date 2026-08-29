# PLAYSUPER SPARKS — TECHNICAL SPECIFICATION

## 1. Technology choice

### Required

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui / Radix primitives
- Framer Motion / Motion for React
- Lucide icons

### Optional

- Zod for runtime validation
- React Hook Form for checkout form
- Vitest + Testing Library for unit/component tests
- Playwright for smoke/e2e tests

Do not add a global state framework unless complexity proves it necessary. A reducer + context is sufficient for this assignment.

---

# 2. Architecture

```text
Presentation Layer
    ↓
Screen Components
    ↓
Domain Components
    ↓
Application State / Reducer
    ↓
Domain Services
    ↓
Mock Services

Future:
Mock Services → REST/GraphQL API → backend services
```

---

# 3. Repository structure

```text
playsuper-sparks/
├── public/
│   ├── products/
│   └── game/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── routes.ts
│   │   └── providers.tsx
│   ├── screens/
│   │   ├── GameHome/
│   │   ├── EarnMoment/
│   │   ├── StoreHome/
│   │   ├── Category/
│   │   ├── ProductDetail/
│   │   ├── Goal/
│   │   ├── Cart/
│   │   ├── Checkout/
│   │   ├── Success/
│   │   └── Wallet/
│   ├── components/
│   │   ├── layout/
│   │   ├── sparks/
│   │   ├── commerce/
│   │   ├── game/
│   │   └── checkout/
│   ├── state/
│   │   ├── appReducer.ts
│   │   ├── selectors.ts
│   │   └── persistence.ts
│   ├── domain/
│   │   ├── sparkMath.ts
│   │   ├── economy.ts
│   │   └── order.ts
│   ├── services/
│   │   ├── SparkService.ts
│   │   ├── MockSparkService.ts
│   │   ├── CommerceService.ts
│   │   └── AnalyticsService.ts
│   ├── data/
│   │   ├── products.ts
│   │   └── seedState.ts
│   ├── hooks/
│   ├── lib/
│   └── styles/
├── tests/
│   ├── sparkMath.test.ts
│   ├── reducer.test.ts
│   └── smoke.spec.ts
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

---

# 4. Domain math

Create one canonical module.

```ts
export const SPARKS_PER_RUPEE = 100;

export function sparkValueInRupees(sparks: number): number {
  return sparks / SPARKS_PER_RUPEE;
}

export function cashPayable(price: number, sparks: number): number {
  return Math.max(0, roundCurrency(price - sparkValueInRupees(sparks)));
}

export function maxRedeemableSparks(
  balance: number,
  skuMaxSparks: number,
  price: number,
): number {
  return Math.min(balance, skuMaxSparks, price * SPARKS_PER_RUPEE);
}

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
```

IMPORTANT: Never duplicate these formulas inside UI components.

---

# 5. State management

Use `useReducer`.

### Actions

```ts
type Action =
  | { type: 'NAVIGATE'; screen: AppScreen }
  | { type: 'SELECT_PRODUCT'; sku: string }
  | { type: 'SELECT_CATEGORY'; category: string }
  | { type: 'EARN_SPARKS'; amount: number; source: string; eventId: string }
  | { type: 'SET_GOAL'; sku: string }
  | { type: 'CLEAR_GOAL' }
  | { type: 'ADD_TO_CART'; sku: string; qty?: number }
  | { type: 'REMOVE_FROM_CART'; sku: string }
  | { type: 'SET_SPARKS_APPLIED'; amount: number }
  | { type: 'START_CHECKOUT' }
  | { type: 'PLACE_ORDER'; paymentMethod: string }
  | { type: 'PAYMENT_FAILED' }
  | { type: 'RESET_DEMO' };
```

### Derived selectors

```ts
selectCartSubtotal
selectMaxEligibleSparks
selectSparksSavings
selectCashPayable
selectRemainingSparks
selectGoalShortfall
selectEstimatedSessionsToGoal
selectAffordableProducts
```

---

# 6. Idempotency simulation

For `EARN_SPARKS`, maintain a `processedEventIds: Set<string>` or serialized object in state/persistence.

If `match-123` is processed twice, only one +150 transaction is created.

Test:

```text
EARN match-123 → +150
EARN match-123 → ignored
balance increased only once
```

---

# 7. Reservation simulation

When entering checkout:

```text
AVAILABLE
    ↓
RESERVE
    ↓
PAYMENT
    ↓
COMMIT
```

Payment failure:

```text
RESERVE
    ↓
PAYMENT FAILED
    ↓
RELEASE
```

Keep reservations in state for the prototype.

---

# 8. Order model

```ts
interface Order {
  id: string;
  sku: string;
  title: string;
  itemPrice: number;
  sparksRedeemed: number;
  cashPaid: number;
  earnBackSparks: number;
  paymentMethod: 'UPI' | 'CARD';
  status: 'PLACED' | 'PAYMENT_FAILED' | 'CANCELLED';
  createdAt: string;
}
```

---

# 9. Product model

```ts
interface Product {
  sku: string;
  title: string;
  category: 'Gaming' | 'Food' | 'Fashion' | 'Digital' | 'Lifestyle' | 'Electronics';
  price: number;
  oldPrice?: number;
  maxSparks: number;
  sparkOnly?: boolean;
  earnBackSparks: number;
  tags: string[];
  image: string;
  deliveryLabel?: string;
  inventoryStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}
```

---

# 10. Service contracts

## SparkService

```ts
interface SparkService {
  getBalance(userId: string): Promise<number>;
  earn(input: EarnRequest): Promise<EarnResponse>;
  reserve(input: ReserveRequest): Promise<ReserveResponse>;
  release(reservationId: string): Promise<void>;
  commit(input: CommitRedemptionRequest): Promise<void>;
  reverse(input: ReverseRequest): Promise<void>;
}
```

## CommerceService

```ts
interface CommerceService {
  listProducts(query?: ProductQuery): Promise<Product[]>;
  getProduct(sku: string): Promise<Product | null>;
  createOrder(input: CreateOrderInput): Promise<Order>;
}
```

## AnalyticsService

```ts
interface AnalyticsService {
  track(event: AnalyticsEvent): void;
}
```

Prototype implementations may be synchronous in practice, but preserve the async contract to mirror production.

---

# 11. Error handling

### Rewards unavailable

Screen still works.

Display:

“Sparks are temporarily unavailable.”

Continue to show:

- full cash price
- normal cash checkout

Hide Spark-specific interactions or mark them unavailable.

### Product unavailable

Disable Add to Cart.

Show:

“Currently unavailable”

Offer:

“View similar rewards”

### Payment failure

Return to checkout/cart.

Show:

“Payment didn’t go through. Your Sparks were restored.”

### Invalid state

Do not throw the user into a blank screen.

Offer:

“Return to store”

---

# 12. Performance

Prototype targets:

- initial route interactive < 2s on modern desktop
- avoid unnecessary re-renders on slider movement
- product image lazy loading
- no animation library imports on every leaf if tree-shaking can avoid it

---

# 13. Security posture for prototype

No secrets in frontend.

No real API keys.

No real payment credentials.

No sensitive personal data.

Use fictional addresses and demo data.

---

# 14. Analytics schema

```ts
interface AnalyticsEventBase {
  event: string;
  timestamp: string;
  userId: string;
  sessionId: string;
  screen: string;
  sparkBalance: number;
  platform: 'web';
}
```

Events:

```text
spark_earned
store_entered
store_rail_viewed
product_viewed
goal_set
add_to_cart
cart_viewed
spark_slider_moved
spark_application_declined
checkout_started
payment_started
payment_failed
order_placed
spark_redeemed
spark_earnback_credited
loop_closed
returned_to_game
wallet_viewed
```

---

# 15. UX test matrix

| Test | Expected |
|---|---|
| Add product | Cart opens with correct item |
| Apply max Sparks | Cash decreases correctly |
| Set Sparks to 0 | Cash equals full price |
| Exceed balance | Clamp to balance |
| Exceed SKU max | Clamp to SKU max |
| Duplicate earn | No double credit |
| Payment fail | Sparks restored |
| Successful order | Sparks deducted once |
| Earn-back | Credited once |
| Goal set | Game home shows goal |
| Goal reached | PDP action changes to affordable |
| Refresh | State restored |
| Reset | Seed state restored |
| Rewards unavailable | Cash-only path works |
| Out of stock | Purchase disabled |

---

# 16. Critical bug prevention

### Bug class 1: money math

Wrong:
`price - sparks / 10`

Correct:
`price - sparks / 100`

### Bug class 2: derived state drift

Do not store both:

`sparksApplied`

and:

`cashPayable`

as independent mutable values.

### Bug class 3: duplicated ledger mutations

Only reducer/domain service may change Spark balance.

### Bug class 4: library conflicts

Do not use buttons from five libraries in the same app.

### Bug class 5: animation blocking interaction

Animation must never prevent normal navigation.

---

# 17. Testing strategy

## Unit

Test spark math, goal math, reducer transitions.

## Component

Test:

- Spark slider
- Product card
- Order summary
- Goal card

## E2E

One Playwright happy path:

Game → Earn → Store → PDP → Cart → Checkout → Success → Game

Second E2E path:

PDP → Goal → Game → Earn → Goal reached → PDP

---

# 18. Accessibility implementation

Use semantic HTML.

Use `aria-live="polite"` for balance updates.

Spark slider:

- `role="slider"`
- label includes current Sparks and cash payable.

Example:

“Use Sparks. Current value 7,000. Maximum 7,000. Cash payable 929 rupees.”

Respect reduced motion.

---

# 19. Deployment

Preferred:

- Vercel / Netlify / Cloudflare Pages

Command:

```bash
npm install
npm run dev
```

Production:

```bash
npm run build
npm run preview
```

Include a README with the live-demo flow.

---

# 20. Handoff to future production

If this were real, backend services would likely include:

```text
Game Events
     ↓
Earn Attribution Service
     ↓
Spark Ledger
     ↓
Economy Config
     ↓
Store BFF
     ↓
Existing Commerce
     ↓
Checkout / Payment
```

The ledger should be immutable and auditable.

The game should never directly mutate the balance.

The commerce platform should not independently compute the Spark balance.

A single ledger should be the source of truth.
