# Playmint — Prototype Specification

## 1. Prototype goal

Demonstrate one complete gameplay-to-commerce loop in under 90 seconds:

**Play → Earn → Discover → Redeem → Purchase → Earn Back → Return to Game**

The prototype should feel like a game surface that happens to contain commerce, not like Amazon embedded in a game.

## 2. Figma file structure

### Page 00 — Cover & rationale
- Product thesis
- Core loop
- Assumptions / constraints

### Page 01 — Foundations
- 8pt spacing grid
- Type scale
- Buttons
- Tags
- Cards
- Spark pill
- Bottom navigation
- Inputs / payment options

### Page 02 — Game
- Game Home
- Earn Moment
- Goal state

### Page 03 — Store
- Store Home
- Category
- Product Detail

### Page 04 — Checkout
- Cart
- Checkout
- Success

### Page 05 — System
- Wallet
- Ledger / Dev drawer
- Empty/error/loading states

### Page 06 — Prototype flows
- Happy path
- Goal path
- Payment failure path
- Rewards unavailable → cash-only path

## 3. Screen-by-screen spec

### S01 — Game Home
**Purpose:** establish the game context and show the Spark balance without disrupting play.

Copy:
- `LEVEL 18`
- `⚡ 7,450 Sparks`
- `Rush Arena`
- `Play a match. Build your Spark balance. Unlock something real.`
- `Finish Match · Earn 150`
- `Open Rewards Store`

Interactions:
- Finish match → S02 Earn Moment
- Rewards → S03 Store Home
- Wallet → S10 Wallet

### S02 — Earn Moment
Copy:
- `MATCH COMPLETE`
- `+150 Sparks`
- `Your reward has been added to your account.`
- `A reward is within reach`
- `See what I can unlock`
- `Keep playing`

Interactions:
- See rewards → S03
- Keep playing → S01

### S03 — Store Home
Copy:
- `REWARDS STORE`
- `Turn play into something real.`
- `Curated for your current Spark balance.`
- `Spark Only`
- `Claim with Sparks alone`
- `Best with your Sparks`
- `Your balance covers part of these`
- `Featured`
- `Real campaigns, real deadlines`

Interaction principle:
- No large search box above fold.
- Maximum three curated rails.
- Cards should show price, tags, and Spark eligibility.

### S04 — Category
Default sorting: `Affordable with my Sparks`.
Categories: Gaming, Food, Fashion, Digital.

### S05 — Product Detail
Default product: Pulse Mini Earbuds.

Copy:
- `Pulse Mini Earbuds`
- `₹999`
- `₹1,299` (struck through only if a genuine reference price exists)
- `With your Sparks`
- `7,000 Sparks + ₹929`
- `You use only earned Sparks. No cash-out.`
- `Add to cart`
- `Set as goal`
- `Delivery shown before payment. Full cash price stays visible.`

Goal state:
- `1,800 more Sparks unlock the full eligible reward.`

Interactions:
- Add to cart → S07
- Set as goal → S01 with goal card

### S06 — Goal
Goal is a lightweight state, not a separate shopping destination.

Game card copy:
- `🎯 Pulse Mini Earbuds`
- `1,800 Sparks to goal`
- `About 3 more play sessions`
- `View goal`

### S07 — Cart
Copy:
- `Your cart`
- item name
- `Item subtotal`
- `Sparks applied`
- `Cash payable`
- `You can choose not to use Sparks at checkout.`
- `Continue to checkout`

Interaction:
- Spark control can move between 0 and max eligible.
- `Don't use Sparks` remains equally easy to select.

### S08 — Checkout
Copy:
- `Checkout`
- `Delivery address`
- `Payment`
- `UPI`
- `Recommended`
- `Card`
- `Place order · ₹849`
- `Order summary`
- `Redeeming · ⚡ 7,000`
- `Pay now · ₹849`

### S09 — Success
Copy:
- `ORDER CONFIRMED`
- `Nice. You turned play into a purchase.`
- `Used · ⚡ 7,000`
- `Earned back · ⚡ 100`
- `New balance · ⚡ 550`
- `You're about 4 play sessions away from your next reward.`
- `Return to game`
- `Keep browsing rewards`

### S10 — Wallet
Copy:
- `SPARK WALLET`
- `⚡ 7,450`
- `Earned through gameplay. Spend on eligible rewards.`
- `How Sparks work`
- `Sparks cannot be bought or cashed out. They expire by issuance lot; use them on eligible in-game commerce rewards.`
- `Recent activity`

## 4. Design system

### Visual direction
- Warm off-white background.
- Charcoal primary text/actions.
- Soft neutral cards.
- One accent reserved for Spark-related affordances.
- Rounded but restrained: 12–24px radii.
- Avoid neon “gaming store” clichés.

### Components
- `TopBar`
- `SparkPill`
- `BottomNav`
- `PrimaryButton`
- `SecondaryButton`
- `ProductCard`
- `RewardRail`
- `SparkSplitBox`
- `GoalCard`
- `OrderSummary`
- `LedgerRow`
- `Tag`
- `FormInput`
- `PaymentOption`

## 5. React architecture

```text
src/
  main.jsx
  styles.css
  components/
    TopBar.jsx
    BottomNav.jsx
    ProductCard.jsx
    RewardRail.jsx
    SparkSplit.jsx
    GoalCard.jsx
    LedgerRow.jsx
  data/
    products.js
    seedState.js
  state/
    sparkReducer.js
  screens/
    GameHome.jsx
    EarnMoment.jsx
    StoreHome.jsx
    ProductDetail.jsx
    Cart.jsx
    Checkout.jsx
    Success.jsx
    Wallet.jsx
    DevDrawer.jsx
```

The included prototype uses a compact single-file implementation for speed; the above is the production-oriented decomposition to use when moving beyond the assignment demo.

## 6. State model

```js
{
  sparks: 7450,
  screen: 'game',
  selectedSku: 'buds',
  cart: [],
  goalSku: null,
  ledger: [],
  lastOrder: null
}
```

Reducer events:

- `NAV`
- `SELECT`
- `EARN`
- `ADD`
- `REMOVE`
- `GOAL`
- `CHECKOUT`
- `ORDER`
- `RESET`

## 7. Seed catalogue

| SKU | Product | Category | Price | Max Spark Coverage | Spark-only | Earn-back |
|---|---|---|---:|---:|---|---:|
| buds | Pulse Mini Earbuds | Gaming | ₹999 | 7,000 Sparks | No | 100 Sparks |
| voucher | Food Treat Voucher | Food | ₹299 | 100% | Yes | 0 |
| hoodie | Everyday Oversized Hoodie | Fashion | ₹799 | 5,000 Sparks | No | 80 Sparks |
| recharge | Mobile Recharge Pack | Digital | ₹199 | 100% | Yes | 0 |
| speaker | Pocket Bluetooth Speaker | Gaming | ₹1,199 | 7,000 Sparks | No | 120 Sparks |
| socks | Game Night Socks | Fashion | ₹349 | 100% | Yes | 20 Sparks |

## 8. Demo state

Starting balance: `7,450 Sparks`.

The prototype should demonstrate:
1. Earn 150 Sparks.
2. Open store.
3. View earbuds.
4. Add to cart.
5. Redeem 7,000 Sparks.
6. Pay ₹849.
7. Receive 100 Sparks earn-back.
8. Return to game.
9. Open Wallet to inspect ledger.

## 9. What is intentionally mocked

- Authentication
- Actual payment gateway
- Address validation
- Inventory calls
- Delivery promise service
- Fraud service
- Backend ledger persistence
- Catalogue API
- Game SDK callbacks

These are intentionally mocked because the hiring assignment evaluates product thinking and rapid prototyping rather than production integrations.

## 10. What would be productionised next

- Server-authoritative ledger
- Real cart/checkout tender support
- Earn event verification
- Fraud and velocity controls
- Experiment assignment service
- Analytics pipeline
- Support tooling
- Legal/Tax/Payments approved transaction model
