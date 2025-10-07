# MOK Tarot Reading (Next.js + Tailwind + Prisma)

A minimal, Burmese-first tarot reading platform with email (Gmail-only) login, AI-powered readings, saved history, profile editing, and a concealed admin area at `/adminmok`.

## Stack
- Next.js App Router (TS)
- Tailwind CSS
- Prisma + SQLite (dev)
- Cookie JWT auth (no NextAuth)
- OpenAI Chat Completions (model configurable)
- Google Gemini (latest) as optional provider

## Quick Start
1. Copy envs and edit as needed
   - `cp .env.example .env`
   - Set `JWT_SECRET` and one AI key: `OPENAI_API_KEY` or `GEMINI_API_KEY` (optional during local dev; you’ll get mocked answers without it)
2. Install deps and setup DB
   - `npm install`
   - `npm run prisma:dev`
3. Run
   - `npm run dev`

## Auth Flow (Gmail only)
- Single page asks for email first.
- If the email exists → asks for password.
- If not → asks for name + password and creates account.
- Only `@gmail.com` emails are accepted (UI warning and API validation).

## Routes
- `/` — Email-first login/register
- `/app/dashboard` — Ask a question (Myanmar), shuffle up to 5, pick 3 cards, get AI reading
- `/app/history` — View previous readings
- `/app/profile` — Change name, password, and pick avatar from `public/avatars`
- `/adminmok` — Admin dashboard (hidden in nav; JWT role must be `ADMIN`)

## Admin Access
1. Register your admin Gmail normally.
2. Promote user to admin:
   - `npm run make:admin -- you@gmail.com`
3. Visit `/adminmok` while logged in.

## Theming
- Dark background with gold highlights inspired by your logo.
- Selective gradients (`bg-gold-linear`, `gold-gradient`) used for emphasis only.

## AI Providers
- Endpoint: `app/api/tarot/reading`.

### OpenAI
- Set `OPENAI_API_KEY` and optional `OPENAI_MODEL` (defaults to `gpt-4o-mini`).

### Google Gemini
- Set `GEMINI_API_KEY` and optional `GEMINI_MODEL` (defaults to `gemini-1.5-pro-latest`).
- To force Gemini, set `AI_PROVIDER=gemini`. Otherwise the app uses OpenAI first and falls back to Gemini if OpenAI fails or is not configured.

- Without any key, a Burmese mock/fallback message is returned so you can test the flow.

## Notes
- This repo ships with a lightweight 78-card deck (names only). Replace with richer data/images when ready.
- Add your own logo image to `public/` and adjust references if desired.

## Scripts
- `npm run prisma:dev` — Create/migrate local DB
- `npm run make:admin -- email` — Promote a user to ADMIN

## Security
- JWT stored in `httpOnly` cookie `mok_auth`.
- Middleware protects `/app/*` and `/adminmok/*`. Admin requires role `ADMIN`.

Enjoy and let me know if you want me to wire up tests, add image-backed cards, or integrate a payment/onboarding flow next.
