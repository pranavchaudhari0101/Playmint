# Playmint — Submission Note

## Sparks: turn play into purchasing power

### Product idea

I designed an in-game commerce layer where players earn **Sparks** through gameplay and use them toward eligible real-world products and rewards. The experience is intentionally not a mini-Amazon: it behaves like a **reward destination** that is native to the game.

### Key product decisions

**1. The core loop is two-way.**

`Play → Earn → Discover → Redeem → Purchase → Earn Back → Play`

Most commerce-in-game ideas stop at “put a store in the game.” The stronger opportunity is to let commerce create a new reason to play. That is why the prototype includes a **Saved Goal** state: a product a user wants can influence the next play session.

**2. Sparks are useful before they are large.**

The store prioritises Spark-only and Spark-friendly products so that the median player can experience utility without grinding for weeks.

**3. Full price stays visible.**

The product page shows the cash price first and the Spark split second. This keeps the value exchange legible and avoids hiding the underlying purchase price behind the reward mechanic.

**4. The currency is an economy, not a UI element.**

The prototype includes a transaction ledger in the developer drawer. In production, this becomes a server-authoritative, idempotent rewards ledger with reservations, reversals, expiry lots and reconciliation.

**5. I optimise for incremental contribution, not GMV.**

The primary business guardrail is **Coin Cost per Incremental Order (CCIO)**. A Spark-funded order is only valuable if the Spark did something the user would not otherwise have done.

### Key assumptions

- Sparks are earned through deterministic gameplay/reward actions; they are not sold or cashed out.
- V1 uses a curated catalogue and existing commerce infrastructure rather than creating a new marketplace.
- Product-level Spark eligibility and coverage are configurable server-side.
- The prototype uses mocked payment, fulfilment, authentication, fraud and catalogue APIs.
- Legal, tax and payments classification must be formally signed off before production launch.

### What I would test next

1. Does the Spark layer produce incremental orders versus a holdout?
2. Does the Saved Goal mechanic increase subsequent game sessions and retention?
3. What Spark coverage maximises incremental contribution instead of simply conversion?
4. Will sellers fund Spark campaigns for measurable incremental acquisition?
5. Does the experience feel like a game reward system rather than an ad/coupon surface?

### AI / vibe-coding tools used

- **ChatGPT:** product discovery, framework selection, PRD, economy design, UX decisions, event taxonomy and React scaffolding.
- **React + Vite:** interactive prototype.
- **Figma:** recommended for final visual polish and presentation handoff; the accompanying specification defines the Figma pages/components.
