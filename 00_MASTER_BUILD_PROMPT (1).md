# PLAYSUPER SPARKS — MASTER BUILD PROMPT FOR CLAUDE / HERMES / CODING AGENT

## 0. Mission

You are the lead product engineer + product designer responsible for turning the Playmint Product Associate assignment into a polished, shareable web prototype.

The assignment is not asking for a generic e-commerce clone. The product challenge is:

> Build a store inside a mobile game where players can use a combination of gameplay-earned in-game currency and real money to purchase real-world products.

The prototype must communicate one strong product thesis:

> **Gameplay creates purchasing utility, and commerce creates another reason to return to gameplay.**

Core loop:

PLAY → EARN → DISCOVER → REDEEM → PURCHASE → EARN BACK → RETURN TO GAME

A second loop should also exist:

STORE → SET GOAL → RETURN TO GAME → EARN TOWARD GOAL

The submission should feel like a serious consumer product prototype, not a hackathon page.

---

## 1. What the hiring assignment is actually evaluating

Optimize for these signals, in this order:

1. Product thinking under ambiguity.
2. A differentiated answer to “How is in-game commerce different from normal e-commerce?”
3. Strong user experience and visual craft.
4. Ability to turn an idea into a working product.
5. Clear assumptions and tradeoffs.
6. Evidence of analytical and economic thinking.

Do NOT optimize for:

- maximum feature count
- a 100-screen app
- fake enterprise complexity
- a giant marketplace
- AI features for the sake of AI
- using every UI library listed by the user

The prototype should be small enough to understand in a 90–120 second live demo.

---

## 2. Product concept

Working product name: **Sparks**

Working fictional game: **Rush Arena**

Spark properties for prototype:

- Sparks are earned through gameplay and selected reward actions.
- Sparks cannot be bought.
- Sparks cannot be cashed out.
- Sparks cannot be transferred between players.
- Sparks are non-monetary game rewards for prototype purposes.
- Use a notional conversion of **100 Sparks = ₹1** only when calculating product-specific savings.
- Do not present a persistent rupee wallet balance as the primary UI.
- On product/cart screens, show the exact Spark + cash split.

Example:

₹999 product
7,000 Sparks + ₹929 cash
Savings = ₹70

IMPORTANT: **1 Spark = ₹0.01**. Do not use `used / 10`; use `used / 100` for monetary-equivalent calculations.

The legal/compliance assumptions are design constraints, not legal advice. Treat final regulatory classification, payment treatment, tax treatment, privacy controls and age-gating as pending formal Legal/Tax/Payments review.

---

## 3. Build scope — must ship

Implement these screens and states:

### Core screens

S01 Game Home
S02 Earn Moment
S03 Rewards Store Home
S04 Category
S05 Product Detail
S06 Goal / Saved Goal state
S07 Cart
S08 Checkout
S09 Order Success
S10 Spark Wallet
S11 Developer / Ledger Drawer

### Required additional states

- loading
- empty rewards
- product unavailable
- insufficient Sparks
- payment failure
- rewards service unavailable → cash-only fallback
- goal already set
- goal reached
- mobile responsive layout

### Core happy path

Game Home → Finish Match → Earn Moment → Store Home → Product → Add to Cart → Adjust Sparks → Checkout → Success → Return to Game

### Goal path

Product → Set Goal → Game Home → Goal Card → Finish Match → Goal Progress → Store

---

## 4. Do not ask for clarification

Make reasonable product decisions from this specification. When there is ambiguity:

- prefer the smallest implementation that demonstrates the product thesis;
- document the assumption in `README.md`;
- do not block the build waiting for confirmation.

---

# 5. Design direction

## Visual thesis

This is a **premium casual-game rewards store**, not a casino, not a crypto wallet, and not a generic Amazon clone.

Use:

- warm off-white / light neutral base
- deep charcoal text
- one electric reward accent used sparingly for Sparks
- restrained glass/blur only for overlays
- generous spacing
- editorial commerce cards
- rounded cards, but not childish bubbles
- subtle game cues
- strong product photography / generated artwork
- premium typography

Avoid:

- neon cyberpunk everywhere
- dark casino UI
- fake loot-box patterns
- crypto-looking wallet UI
- giant discount stickers
- aggressive countdowns
- excessive gradients
- 3D everything
- overly rounded “AI dashboard” aesthetics

The game identity should be visible, but the store should still feel trustworthy enough to purchase real products.

---

# 6. Required UX principle

The store should answer three questions immediately:

1. What can I get?
2. What can I use my Sparks for?
3. What do I need to pay in cash?

The user should never have to calculate anything manually.

Every eligible product card should communicate:

PRODUCT
FULL CASH PRICE
SPARK COVERAGE
CASH REMAINING
OPTIONAL SPARK-ONLY STATE

---

# 7. Screen specifications

## S01 — GAME HOME

Purpose: establish game context and surface commerce without hijacking gameplay.

Content:

- Level 18
- Spark balance: ⚡ 7,450
- Rush Arena
- Primary CTA: Play Match
- Secondary reward entry: Rewards Store
- Goal card when goal exists
- Small recent reward activity

Exact copy:

“Play a match. Build your Spark balance. Unlock something real.”

Goal example:

“Pulse Mini Earbuds — 1,800 Sparks to goal — about 3 more sessions.”

Interactions:

- Play Match → S02
- Rewards Store → S03
- Spark balance → S10
- Goal card → S05

Do not put a conventional e-commerce header here.

---

## S02 — EARN MOMENT

Purpose: celebrate the earning moment without disrupting gameplay.

Exact copy:

“MATCH COMPLETE”
“+150 Sparks”
“Your reward has been added to your account.”

If an affordable product exists:

“A reward is within reach.”

Buttons:

“See what I can unlock”
“Keep playing”

Motion:

- Spark count increment
- soft scale-in
- subtle particle burst around Spark icon
- CTA staggered fade/slide
- total interaction under ~1.2 seconds

Must be skippable / non-blocking in a real product. For the prototype, button-driven is acceptable.

---

## S03 — REWARDS STORE HOME

Purpose: reward discovery, not catalogue browsing.

Hero:

“REWARDS STORE”
“Turn play into something real.”
“Curated for your current Spark balance.”

Sections:

1. Spark Only
“Claim with Sparks alone”

2. Best with your Sparks
“Products where your current balance goes furthest”

3. Featured
“Products worth playing toward”

Optional campaign rail only when a true campaign deadline exists.

Do NOT put a giant search field above the fold.

Do NOT show more than ~3–4 cards per rail on desktop prototype.

Include category chips:
Gaming / Food / Fashion / Digital

---

## S04 — CATEGORY

Heading example:

“Gaming rewards”

Sort default:

“Affordable with my Sparks”

Other sort options:

- Recommended
- Popular
- Price low to high

Filters:

- Spark Only
- Spark + cash
- Delivery
- Category

Product cards must retain Spark information.

---

## S05 — PRODUCT DETAIL

Primary example:

Pulse Mini Earbuds

Price:
₹999

Reference price (only if genuine seed data contains one):
₹1,299

Reward split:

“With your Sparks”
“7,000 Sparks + ₹929”
“You save ₹70”

Supporting copy:

“You’re using earned Sparks. No purchase required to earn them.”

Additional content:

- delivery estimate
- stock status
- product highlights
- return information
- earn-back reward: +100 Sparks

Actions:

“Add to cart”
“Set as goal”

Insufficient balance state:

“You’re 1,800 Sparks away.”
“About 3 more play sessions.”
“Set as goal”

No fake urgency.

---

## S06 — GOAL

A goal is intentionally lightweight.

Product:
Pulse Mini Earbuds

State:
“1,800 Sparks to goal”
“About 3 more play sessions”

Button:
“Back to game”

When goal progress changes:

“1,350 Sparks to goal”

When reached:

“You can unlock this reward now.”
“View reward”

The goal is the signature feature that makes commerce influence gameplay.

---

## S07 — CART

Header:
“Your cart”

Line items should show:

- product
- quantity
- full item price
- max eligible Spark coverage

Spark control:

Slider/stepper from 0 → max eligible Sparks

Default:
maximum eligible coverage

Equally accessible control:
“Don’t use Sparks”

Breakdown:

Item subtotal ₹999
Sparks applied ⚡ 7,000
Savings ₹70
Cash payable ₹929
Sparks remaining ⚡ 450

Do not hide the non-Spark price.

CTA:
“Continue to checkout”

---

## S08 — CHECKOUT

Keep this intentionally boring.

Sections:

Delivery address
Payment
Order summary

Address fields:

Full name
House / street
City
PIN code

Payment:

UPI — Recommended
Card

Order summary:

Pulse Mini Earbuds ₹999
Redeeming ⚡ 7,000
Pay now ₹929

CTA:
“Place order · ₹929”

Provide a simulated payment failure state:
“Payment didn’t go through. Your Sparks were restored.”

---

## S09 — SUCCESS

Header:
“ORDER CONFIRMED”

Headline:
“Nice. You turned play into a purchase.”

Stats:

Used · ⚡ 7,000
Earned back · ⚡ 100
New balance · ⚡ 550

Loop-closure message:
“You’re about 4 play sessions away from your next reward.”

Primary CTA:
“Return to game”

Secondary:
“Keep browsing rewards”

The return-to-game CTA is intentionally primary.

---

## S10 — WALLET

Heading:
“SPARK WALLET”

Balance:
⚡ 7,450

Copy:
“Earned through gameplay. Spend on eligible rewards.”

How Sparks work:
“Sparks are earned through gameplay and selected reward actions. They cannot be bought or cashed out.”

Sections:

Available
Expiring soon
Recent activity

Transaction rows:

+150 GAME SESSION
+40 REWARDED REWARD
-7,000 ORDER
+100 PURCHASE REWARD

Include a subtle “View full rules” link.

---

## S11 — DEVELOPER / LEDGER DRAWER

This is a demo-only diagnostic drawer.

Show:

Current screen
Spark balance
Cart
Goal
Last order

Ledger:

EARN
REDEEM
REVERSAL

Example:

+150  GAME_SESSION
+40   REWARDED_ACTION
-7000 ORDER_1842
+100  PURCHASE_REWARD

Also show:

“Server-authoritative simulation: ON”
“Idempotency simulation: ON”
“Persistence: localStorage”

Button:
“Reset demo state”

---

# 8. Product data

Seed at least 18 products across 4 categories.

Use these products:

1. Pulse Mini Earbuds — Gaming — ₹999 — max 7,000 Sparks — earn 100
2. Pocket Bluetooth Speaker — Gaming — ₹1,199 — max 7,000 Sparks — earn 120
3. Game Night Controller Grip — Gaming — ₹499 — max 4,000 Sparks — earn 50
4. RGB Desk Light — Gaming — ₹699 — max 5,000 Sparks — earn 70
5. Food Treat Voucher — Food — ₹299 — Spark Only — earn 0
6. Coffee Break Voucher — Food — ₹199 — Spark Only — earn 0
7. Movie Night Voucher — Entertainment/Digital — ₹299 — Spark Only — earn 0
8. Mobile Recharge Pack — Digital — ₹199 — Spark Only — earn 0
9. Music Premium Pass — Digital — ₹299 — Spark Only — earn 0
10. Everyday Oversized Hoodie — Fashion — ₹799 — max 5,000 Sparks — earn 80
11. Game Night Socks — Fashion — ₹349 — Spark Only — earn 20
12. Canvas Sling Bag — Fashion — ₹699 — max 4,500 Sparks — earn 60
13. Travel Bottle — Lifestyle — ₹399 — max 3,000 Sparks — earn 40
14. Wireless Charging Pad — Electronics — ₹899 — max 5,000 Sparks — earn 90
15. Phone Case — Electronics — ₹499 — max 3,500 Sparks — earn 50
16. Fitness Band Lite — Electronics — ₹1,499 — max 6,000 Sparks — earn 150
17. Mini Desk Fan — Lifestyle — ₹599 — max 4,000 Sparks — earn 60
18. Sticker Pack + Avatar Frame — Game Reward — ₹99 not cash sale; Spark Only — 2,500 Sparks — earn 0

Do not imply these are real Playmint inventory. They are prototype seed data.

---

# 9. Spark economy for the prototype

Starting balance:
7,450 Sparks

Earn actions:

Game session completion: +150
Rewarded optional action: +40
Level-up: +250
Weekly quest: +500
Purchase earn-back: product-specific, usually 2% of cash/order value converted into a small fixed Spark amount; cap at 100 Sparks in prototype.

For demo simplicity, use only the +150 match completion and purchase earn-back in the primary happy path.

Economic rules:

- 100 Sparks = ₹1 notional redemption value.
- max Spark coverage is stored per SKU.
- cash payable = item price - (sparksApplied / 100).
- never let cash payable go below ₹0.
- Sparks available after order = prior balance - redeemed Sparks + earned-back Sparks.

FIFO expiry can be represented in wallet data but need not be fully simulated unless time-travel controls are added.

---

# 10. State model

Use a typed reducer/state machine.

```ts
type AppScreen =
  | 'game'
  | 'earn'
  | 'store'
  | 'category'
  | 'product'
  | 'goal'
  | 'cart'
  | 'checkout'
  | 'success'
  | 'wallet';

type SparkTxnType =
  | 'EARN'
  | 'REDEEM'
  | 'RESERVE'
  | 'RELEASE'
  | 'REVERSAL'
  | 'EXPIRE'
  | 'ADJUSTMENT';

interface SparkLot {
  id: string;
  amountIssued: number;
  amountRemaining: number;
  issuedAt: string;
  expiresAt: string;
  source: string;
}

interface SparkTransaction {
  id: string;
  type: SparkTxnType;
  amount: number;
  source: string;
  reference?: string;
  createdAt: string;
}

interface Product {
  sku: string;
  title: string;
  category: string;
  price: number;
  oldPrice?: number;
  maxSparks: number;
  sparkOnly?: boolean;
  earnBackSparks: number;
  tags: string[];
  image: string;
}

interface AppState {
  screen: AppScreen;
  sparksBalance: number;
  selectedSku: string | null;
  selectedCategory: string | null;
  cart: CartItem[];
  goalSku: string | null;
  sparksApplied: number;
  ledger: SparkTransaction[];
  lots: SparkLot[];
  lastOrder: Order | null;
  rewardsAvailable: boolean;
  paymentShouldFail: boolean;
}
```

Do not store derived fields such as `cashPayable` as the source of truth. Derive them from price + Spark amount.

---

# 11. Component architecture

Use React + TypeScript.

Recommended tree:

```text
src/
  app/
    App.tsx
    routes.ts
    state/
      appReducer.ts
      selectors.ts
      persistence.ts
  screens/
    GameHome/
    EarnMoment/
    StoreHome/
    Category/
    ProductDetail/
    Goal/
    Cart/
    Checkout/
    Success/
    Wallet/
  components/
    layout/
      AppShell
      TopBar
      BottomNav
      PageContainer
    sparks/
      SparkPill
      SparkBalance
      SparkBadge
      SparkSplit
      SparkSlider
      SparkTransactionRow
    commerce/
      ProductCard
      ProductGrid
      RewardRail
      CategoryChip
      PriceBlock
      OrderSummary
    game/
      GameHUD
      EarnCelebration
      GoalCard
    checkout/
      AddressForm
      PaymentMethod
      CheckoutSummary
    feedback/
      Toast
      LoadingState
      EmptyState
      ErrorState
      UnavailableState
  data/
    products.ts
    seedState.ts
  lib/
    currency.ts
    sparkMath.ts
    analytics.ts
    storage.ts
  styles/
    tokens.css
    globals.css
```

---

# 12. Design-system architecture

Do not install or visually mix all 50 component libraries.

Use one coherent base and selectively borrow patterns.

### Base UI

Preferred:
- shadcn/ui
- Radix primitives if needed
- Headless UI where headless behaviour is useful

### Motion

Preferred:
- Framer Motion / Motion for React
- Motion Primitives for reusable motion patterns
- Magic UI / React Bits only for tasteful accents

### Data/admin visuals

Use Tremor only if building an optional analytics/dev panel.

### Game-specific decorative treatment

8BITCN can be used only for a tiny game-state/developer decorative element if stylistically appropriate. Do not turn the store into pixel art.

### Other listed libraries

Use only when they solve a specific UI problem and match the existing design system. Do not import multiple competing button/card/modal systems.

### Target library stack for the prototype

1. shadcn/ui / Radix — primitives
2. Tailwind CSS — styling
3. Motion / Framer Motion — animation
4. Lucide — icons
5. Motion Primitives / Magic UI — selected effects only
6. React Bits — selected visual micro-interactions only
7. Tremor — developer analytics panel only

The user listed 50 libraries. The correct product-engineering decision is **not** to use all 50. Use the minimum coherent subset.

---

# 13. Skills / workflows to invoke when available

The implementation environment may expose helper skills. Use them where they materially improve the output:

- **UI/UX Pro Max**: use for UX heuristic review, hierarchy, responsive patterns, accessibility and visual-quality checks.
- **claude-design**: use for structured design exploration before implementation if available.
- **lets-scroll**: use for scroll behavior and long-form/reward rail interactions where available.
- **product-landing-pages**: use only for marketing/cover/README presentation polish; do NOT convert the store into a landing page.
- **ascii-art**: use for README/demo architecture diagrams and terminal-friendly flow diagrams.
- **ComfyUI**: use for generating a cohesive set of product-art assets if the environment has it. Avoid copyrighted logos and brand marks; use generic fictional product imagery.

If a named skill is unavailable in the current agent runtime, do not fake its use. Apply the same principles manually.

---

# 14. Asset pipeline

Generate or source a coherent set of 18 product images.

Preferred visual language:

- neutral studio backdrop
- soft shadow
- slightly editorial lighting
- consistent aspect ratio
- 4:3 or 1:1
- no brand logos
- no text inside generated product art

ComfyUI prompt direction:

“premium mobile-commerce product photography, generic fictional [PRODUCT], warm neutral studio background, soft directional lighting, subtle grounding shadow, realistic product texture, clean catalog photography, no logos, no watermark, square composition”

Use the same lighting and backdrop family across all SKUs.

---

# 15. Motion specification

Use Framer Motion / Motion.

### Page transitions

- opacity 0 → 1
- y 8 → 0
- 180–260ms
- easeOut

### Product card hover

- y -2px
- subtle shadow expansion
- 160ms

### Spark earn

- spark icon scale: 0.8 → 1.1 → 1
- count transition
- one subtle burst
- 450–700ms

### Add to cart

- product CTA press scale 0.98
- mini cart indicator updates with spring

### Spark slider

- animate cash number and Spark balance smoothly
- do not make the UI jitter

### Success

- checkmark draw/scale
- success stats stagger 60ms each
- return-to-game CTA enters last

### Reduced motion

Respect `prefers-reduced-motion` and provide an immediate static state.

Do not animate every element. Motion communicates state changes, not decoration.

---

# 16. Responsive rules

Primary target:
Desktop browser demo at 1440 × 900.

Secondary target:
Mobile width around 390 × 844.

Desktop:
- max content width ~1180px
- 3-column product grid where appropriate

Tablet:
- 2-column grid

Mobile:
- 1-column cards
- sticky bottom CTA where appropriate
- horizontally scrollable category chips
- horizontally scrollable reward rails
- sticky top bar only if it does not hide content
- 16px horizontal page padding

Do not simply shrink desktop. Recompose the hierarchy.

---

# 17. Accessibility

Target WCAG 2.2 AA-oriented implementation.

Required:

- keyboard navigable controls
- visible focus
- semantic buttons
- labels for form fields
- screen-reader-readable Spark/cash breakdown
- color must not be the only state signal
- minimum practical touch target ~44px
- reduced motion support
- error messages adjacent to the affected field/control

For a Spark split, screen-reader copy should read as one sentence, e.g.:

“Product price 999 rupees. Apply 7000 Sparks, saving 70 rupees. Cash payable 929 rupees.”

---

# 18. Analytics events

Implement a local analytics collector that logs events to console and stores the latest event batch in localStorage.

Global properties:

user_id
session_id
device_type
screen
spark_balance
age_band
experiment_assignments
app_version
server_timestamp

Events:

store_entered
store_rail_viewed
product_viewed
spark_earned
spark_earn_blocked
goal_set
goal_progress_viewed
add_to_cart
cart_viewed
spark_slider_moved
spark_application_declined
checkout_started
payment_started
payment_failed
order_placed
spark_redeemed
spark_reversed
spark_earnback_credited
loop_closed
returned_to_game
wallet_viewed

For `spark_slider_moved` capture:

fromSparks
toSparks
fromCash
toCash
isMax

For `order_placed` capture:

orderId
sku
itemPrice
sparksRedeemed
cashPaid
earnBack

---

# 19. Prototype persistence

Use localStorage so a reviewer can reload the page without losing demo state.

Storage key:
`playsuper_sparks_demo_v2`

Persist:

- balance
- ledger
- goal
- cart
- last order
- experiment flags

Provide a “Reset demo state” action.

---

# 20. Simulated backend abstraction

Even though the assignment prototype is frontend-only, structure the code as though a backend exists.

Create `services/` interfaces:

```ts
interface SparkService {
  getBalance(userId: string): Promise<number>;
  earn(input: EarnRequest): Promise<EarnResponse>;
  reserve(input: ReserveRequest): Promise<ReserveResponse>;
  commitRedemption(input: CommitRedemptionRequest): Promise<void>;
  releaseReservation(reservationId: string): Promise<void>;
  reverse(input: ReverseRequest): Promise<void>;
}
```

Prototype implementation:
`MockSparkService`

Later implementation:
`ApiSparkService`

Never couple screen components directly to ledger mutation logic.

---

# 21. Mock API contracts

### GET /api/v1/sparks/balance

Response:

```json
{
  "userId": "demo-user",
  "balance": 7450,
  "currency": "SPARKS",
  "asOf": "2026-08-29T12:00:00Z"
}
```

### POST /api/v1/sparks/earn

```json
{
  "eventId": "match-123",
  "source": "GAME_SESSION",
  "amount": 150
}
```

Server must ignore client-supplied amount in a real implementation and derive the amount from the validated event type.

### POST /api/v1/sparks/reservations

```json
{
  "cartId": "cart-123",
  "requestedSparks": 7000,
  "ttlSeconds": 900
}
```

### POST /api/v1/orders

```json
{
  "cartId": "cart-123",
  "sparkReservationId": "res-123",
  "paymentMethod": "UPI"
}
```

### POST /api/v1/sparks/reversal

Used after payment or order failure.

---

# 22. Ledger invariants

These are non-negotiable even in prototype logic.

1. Balance cannot become negative.
2. Same earn event must not credit twice.
3. Same redemption cannot debit twice.
4. Reversal must reference an existing debit.
5. A reservation cannot exceed available balance.
6. Released reservation returns the exact reserved amount.
7. Earn-back occurs once per completed qualifying order.
8. Refund/reversal must never convert Sparks into cash.

Write unit tests for every invariant.

---

# 23. Legal/compliance product constraints

Treat the following as product constraints to validate with counsel, not as legal conclusions:

- no paid path into Sparks
- no cash-out
- no P2P transfer
- no winner-takes-loser Spark mechanics
- no paid chance-based Spark earning
- no misleading price display
- no fake scarcity
- age-aware merchandising
- data minimisation
- auditable reward history

The current Indian gaming framework includes the Promotion and Regulation of Online Gaming Act, 2025 and the 2026 rules; final classification and implementation should receive formal Legal review before production.

RBI’s PPI framework distinguishes closed-system PPIs from instruments accepted at third-party merchants; whether any real-world voucher architecture triggers PPI/payment regulation must be assessed by Payments/Legal.

Consumer-protection rules cover dark patterns and require transparent pricing/experience design.

Do not implement legal claims in end-user copy beyond what Product/Legal has approved.

---

# 24. What NOT to implement

Do not add these unless explicitly required later:

- real payment integration
- real address collection
- real user authentication
- real brand APIs
- real logistics
- social gifting
- referral economy
- auctions
- gambling mechanics
- cash redemption
- merchant marketplace
- seller self-serve console
- ML recommender
- AI shopping assistant
- infinite catalogue

The assignment is a prototype, not a production marketplace.

---

# 25. Definition of Done

The prototype is done only when:

### Product

- complete happy path works
- goal loop works
- Spark + cash arithmetic is correct
- return-to-game loop is visible

### UX

- no dead-end screens
- loading/error states exist
- mobile works
- copy is consistent
- product value is immediately understandable

### Engineering

- TypeScript
- componentized architecture
- reducer/state machine
- local persistence
- mocked service abstraction
- no duplicated calculation logic
- lint/typecheck passes

### Quality

- no console errors
- no broken navigation
- no impossible states
- no negative balance
- no double redemption
- no incorrect cash calculation

### Design

- coherent tokens
- consistent type scale
- consistent spacing
- restrained motion
- strong hierarchy
- no library-style mashup

### Submission

Provide:

- runnable app
- README
- architecture note
- product note
- short demo script
- screenshots if possible

---

# 26. Required build sequence

Follow this order:

1. Create project and install core dependencies.
2. Create tokens and base layout.
3. Create typed data model and reducer.
4. Create Game Home.
5. Create Earn Moment.
6. Create Store Home + product cards.
7. Create Product Detail.
8. Create Cart + Spark calculator.
9. Create Checkout.
10. Create Success.
11. Create Goal flow.
12. Create Wallet.
13. Add motion.
14. Add responsive behavior.
15. Add loading/error/empty states.
16. Add analytics instrumentation.
17. Add developer drawer.
18. Add tests.
19. Run visual QA.
20. Produce README/demo instructions.

Do not start with animations.
Do not start with a design library rabbit hole.
Do not build backend infrastructure.

---

# 27. Final quality bar

Before declaring success, review the product from three perspectives:

### Player

“Do I immediately understand how my play helps me get something?”

### PM / hiring manager

“Can I see the product thesis and a thoughtful loop?”

### Engineer

“Is the state model sane enough that the prototype could evolve?”

If all three are true, ship.
