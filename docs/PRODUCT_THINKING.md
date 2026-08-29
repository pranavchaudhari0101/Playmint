# Playmint — Product Thinking

**Vibe code an in-game commerce store**: a store inside a mobile game where players use earned in-game currency plus real money to buy real-world products.

> This document is the product reasoning behind the prototype. For architecture and setup, see the repo README.

---

## 1 · The core question

> *How should an in-game commerce store be different from a traditional e-commerce store?*

An e-commerce store is a **destination**: users arrive with purchase intent, search, transact, and leave. An in-game store is a **loop node**: players arrive mid-gameplay with **zero purchase intent**, high emotional arousal, and an asset they earned (Sparks) that they want to feel was worth earning.

Six consequences, each mapped to where the prototype demonstrates them:

| # | Principle | E-commerce does | In-game store should | Where to see it |
|---|---|---|---|---|
| 1 | **Currency is earned, never bought** | Money in, goods out — trust is contractual | Trust is *behavioral*: one exploitative mechanic burns the whole economy | Wallet copy: "can't be bought or cashed out"; slider never hides the cash total |
| 2 | **Enter at emotional peaks** | User navigates *to* the store | The store appears *after victory*, voiced like the game | Match overlay → EarnMoment → store bridge |
| 3 | **Affordability is the merchandising logic** | Search & categories first | "What can I get **now**" is the first rail; near-misses create the next session | Claim-now rail, "Two matches away" rail (Store + EarnMoment) |
| 4 | **Goals replace cart-abandonment email** | Retention via discounts | Retention via a target measured in *matches* — the player's own unit of time | Set-as-goal one-tap; home progress "~14 matches to go" |
| 5 | **Purchases mint new currency** | Purchase ends the relationship | Earn-back Sparks fund the next reward — buy → earn → buy | Success screen: "+100 Sparks earned back · play next match" |
| 6 | **Time is the unit of value** | Prices in money | Every price also expressed as *matches away*, because that's the exchange rate players compute | So-close rails, goal session-math, earn moment |

**The one-line answer:** an e-commerce store converts intent; an in-game store manufactures it — then converts it honestly.

---

## 2 · Discovery

**Strategic bet:** gameplay creates purchasing utility. Games generate emotion and time investment but never convert them into real-world value. Sparks is the exchange layer — and the **hybrid payment** (Sparks + cash) is the actual innovation:

| Model | Player feels | Business result |
|---|---|---|
| Pure cash store in-game | "Why not Amazon?" | No differentiation |
| Pure currency redemption | "Free stuff" | 100% liability, no revenue |
| **Hybrid mix** | "My time discounted this" | Cash portion = commission; Sparks portion = retention |

**Assumptions we made (deliberately open brief):**
- Game: *Rush Arena*, a fictional casual-competitive mobile game
- Economy: **100 Sparks = ₹1** (1 Spark = 1 paisa — integer math everywhere); earned via match win (+150), rewarded action (+40), level up (+250), weekly quest (+500)
- Currency is **closed-loop**: cannot be bought, cashed out, or transferred
- Per-product **Spark caps** protect margins (e.g. earbuds ₹999, max 7,000⚡ = ₹70 off)
- **Earn-back** Sparks on purchase (flywheel fuel)

---

## 3 · Users (synthesized — assumptions to validate)

| Persona | JTBD | Key pain | Validation method |
|---|---|---|---|
| **Riya, 19 — casual competitive** (primary) | "When I win, I want my time to have paid off" | Battle-pass value expires; nothing tangible for skill; burned by coin scams | 8 interviews + 2-week reward-salience diary |
| **Dev, 27 — optimizer** | "When I set a target, I want the efficient path" | Opaque conversion rates, silent devaluation | Forum mining, funnel telemetry |
| **Studio PM** (B2B buyer) | "When I add monetization, retention must go up" | Economy backlash, fraud exposure, eng cost | Server-authoritative ledger is the pitch |
| **D2C brand manager** (supply) | "I want incremental orders, not brand-lift theater" | Gaming inventory ROI unproven | Guardrail metric below |

---

## 4 · Problems → HMW

| # | User problem | HMW | Priority | Solved by |
|---|---|---|---|---|
| UP1 | "I don't know what my currency is worth" | show ₹- AND match-equivalence everywhere? | P0 | Dual units on all rails, wallet, goals |
| UP2 | "The store feels like an ad break" | make the store appear at victory, voiced like the game? | P0 | Match overlay → earn moment bridge |
| UP3 | "How much REAL money will I pay?" | keep the full price visible at every step? | P0 | Slider + full cash total on every screen |
| UP4 | "I leave and forget" | give a return reason measured in matches? | P1 | Goal loop with session math |
| UP5 | "Everything's out of reach; my Sparks feel worthless" | merchandise by affordability tier? | P1 | Claim-now / two-matches-away / hybrid rails |
| UP6 | "After buying, we're done" | have the purchase mint the next goal? | P1 | Earn-back + "play next match" CTA |
| UP7 | "It's fake currency / it can be hacked" | prove every Spark is a server-side ledger row? | P1 | Wallet ledger, dev-drawer idempotency replay |

---

## 5 · The four user flows

### Flow A — First discovery (the aha)
`Play Match → animated victory (skippable) → +150⚡ → 🎖 "Rewards Store unlocked" (first win only) → claim-now rail → Sparks-only redemption, instant PAID, zero cash → "Play next match"`
*The zero-risk first purchase proves currency is real.*

### Flow B — Hybrid purchase (the money moment)
`Affordable rail → product (full price + max-off) → cart slider (live server quote, defaults max Sparks) → checkout (address + mock UPI) → SUCCESS (+earn-back animates) → play next match`
*Shadow path: payment FAILS → Sparks visibly restored → trust beat instead of a support ticket.*

### Flow C — Goal loop (retention engine)
`"2,100⚡ short" → Set as goal (one tap from any so-close rail) → home progress "~14 matches" → every win moves the bar → goal reached → "Redeem now" → Flow B`

### Flow D — Trust audit (power user / enterprise demo)
`Wallet ledger (EARN/RESERVE/COMMIT/RELEASE rows) → dev drawer → replay the same eventId → balance unmoved (idempotency proof) → admin console shows the full audit trail`

---

## 6 · Economy rules (enforced server-side)

- Integer math only: 1 Spark = 1 paisa; no floats anywhere
- Append-only ledger is the single source of truth; wallet balance is a cache updated in the same transaction (invariant: `wallets.balance == SUM(ledger.amount)`)
- Reservation lifecycle: `RESERVE → COMMIT` (paid) or `RESERVE → RELEASE` (failed/cancelled) — Sparks are never destroyed by a failed checkout
- Idempotent earns: one credit per eventId (unique partial index) — duplicate webhooks are free
- Per-product Spark caps; Sparks-only products require exactly `maxSparks × qty`
- Concurrent checkouts serialize via row locks — a wallet can never overdraw

---

## 7 · Metrics

| Metric | Definition | Why it matters |
|---|---|---|
| **CCIO** (guardrail) | Sparks issued ÷ incremental orders vs cash-only control | The unit economics of buying retention |
| Spark burn rate | Sparks redeemed ÷ Sparks issued | Currency health (demonstrated on admin dashboard) |
| Hybrid attach rate | % of orders using ≥1 Spark | Is the mechanic actually used? |
| Goal completion rate | Goals reached ÷ set | Retention engine efficacy |
| D7 return-with-goal vs without | cohort split | Causal check on Flow C |
| Time-to-first-redemption | Signup → first PAID order | Flow A speed |

---

## 8 · What's real vs mocked

| Real (server-authoritative) | Mocked (swap-in ready) |
|---|---|
| Auth (JWT + bcrypt) | The game itself (Rush Arena is a 4s overlay) |
| Wallet + append-only ledger | Payment gateway (mock provider; Razorpay adapter included — flips via `PAYMENT_PROVIDER`) |
| Idempotent earn endpoints | Fulfilment/logistics |
| Quote engine (all pricing) | Inventory sync from brands |
| Checkout reserve/commit/release | |
| Goals, admin console, audit views | |

---

## 9 · Demo script (5 minutes)

1. **Login** as seeded player (`player@playsuper.dev`) — 2,940⚡ waiting
2. **Play Match** — watch the overlay; skip it; the ledger already has the win (idempotent, real API)
3. **EarnMoment** — so-close rail → *Set as goal* on the Coffee Voucher (one tap)
4. **Home** — goal progress: "~N matches to go" (return reason installed)
5. **Dev drawer** — *Replay same eventId* → balance unmoved (trust proof)
6. **Store** → add buds to cart → slider to max → **checkout** → *Simulate failed payment* → Sparks restored → retry → *Simulate success* → earn-back lands
7. **Success** — "+100⚡ earned back · Play next match" (loop closes)
8. **Admin** (login as admin) — dashboard burn rate, ledger audit, balance adjust with overdraw rejection

---

*Built as a product thinking + rapid prototyping exercise. All product decisions above are assumptions the prototype makes testable.*
