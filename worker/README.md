# Playmint API — Cloudflare Worker

Hono-based edge API for the Playmint rewards economy. Talks to Neon
(serverless Postgres) over the Neon HTTP/WebSocket driver and verifies
Clerk session JWTs.

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars   # fill in DATABASE_URL + CLERK_SECRET_KEY
npm run dev                      # wrangler dev on http://localhost:8787
```

Use the Neon **direct** endpoint (not `-pooler`) for `DATABASE_URL` —
transactions need a dedicated Postgres session per request.

## Deploy

```bash
npx wrangler login
echo "postgresql://..." | npx wrangler secret put DATABASE_URL
echo "sk_live_..."     | npx wrangler secret put CLERK_SECRET_KEY
npx wrangler deploy
```

After deploying, set `CLERK_AUTHORIZED_PARTIES` (vars in
`wrangler.jsonc`) to include the production frontend origin — it drives
both the Clerk `azp` check and CORS.

## Architecture notes

- **Workers-safe DB access**: plain queries use the stateless `neon()`
  HTTP client; transactions open a short-lived `Client` per request
  (Workers forbid sharing I/O across requests).
- **Auth**: `Authorization: Bearer <clerk session jwt>` — verified with
  `@clerk/backend` against Clerk's JWKS; local users rows are
  provisioned lazily on first request (welcome bonus included).
- **Rate limiting**: best-effort per-isolate in-memory buckets. For
  strict global limits, add a Cloudflare Rate Limiting binding.
