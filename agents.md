# RupeeRound

Mobile-first micro-investing prototype for an 8-hour college hackathon. A simulated merchant payment is rounded up to a chosen multiple (₹32 → ₹35 with a ₹5 step); the ₹3 difference goes into a round-up wallet. Once the wallet covers a fund's minimum it can be invested (simulated) in a Large, Mid or Small Cap index fund; below the minimum the balance carries forward, with an optional top-up. **No real money moves**: never present payments or investments as real.

## Workspace

pnpm workspace with three packages:

- `client/` - React + Vite + Tailwind CSS app (Figma Make scaffold), package name `figma-make-app`
- `server/` - Express 5 + MongoDB (Mongoose) REST API, `@rupeeround/server`
- `shared/` - money, round-up and carry-forward logic plus API types used by both, `@rupeeround/shared`

## Toolchain

- Node.js 22+ and pnpm 10, pinned in `.mise.toml`; use `pnpm`, never npm or yarn
- `pnpm dev` - runs API (port 4000) and Vite (port 8443) together; Vite proxies `/api` to the API
- `pnpm seed` - resets the demo account (phone 98765 43210, PIN 1234)
- `pnpm test` - unit tests for the shared money/metrics logic and the server advisor rules
- `pnpm typecheck` - TypeScript across all packages
- `pnpm build` - production build of the client
- `server/.env` holds `MONGODB_URI` and `JWT_SECRET` (see `server/.env.example`); never commit it

## Money rules

- All amounts are integer **paise** (`amountPaise`, `balancePaise`, …). Convert only for display with `formatPaise`.
- Round-up and carry-forward rules live in `shared/src/roundup.ts` and `shared/src/invest.ts`. Use them on both sides rather than re-implementing.
- Wallet changes (payment, top-up, investment) run inside a MongoDB transaction together with the record they create.
- Fund NAVs are real (mfapi.in, cached on the fund document); fund minimums are demo values and must be labelled as such.

## Fund suggestion (advisor)

- The rules decide, the AI only explains. `server/src/services/advisorRules.ts` (pure, unit-tested) scores the 3 risk answers 0–6 → Large/Mid/Small Cap and checks the wallet against the fund minimum. Keep the scoring in `RISK_SCORE_TABLE`.
- Metrics come from the stored mfapi.in NAV history via `fundMetrics` in `shared/src/metrics.ts`.
- `server/src/services/advisor.ts` asks Groq (`GROQ_MODEL`, default `openai/gpt-oss-20b`) to word the explanation, checks the reply (no invented numbers, no "best/guaranteed/sure", max 3 sentences) and falls back to `templateExplanation` on any problem. Results are cached in memory for 3 hours.
- Only computed facts go to Groq: never name, phone or the wallet balance. Every explanation ends with `ADVISOR_DISCLAIMER`.
- `GROQ_API_KEY` lives only in `server/.env`. Never put it in client code, `VITE_` variables, logs or commits.

## Server structure

- `server/src/index.ts` - connects to MongoDB, seeds the three funds, starts the API
- `server/src/app.ts` - middleware and route mounting; all routes except `/api/auth` and `/api/health` require a Bearer JWT
- `server/src/routes/` - one router per resource (auth, me, transactions, wallet, funds, investments, portfolio, goals, advisor); request bodies are validated with zod via `parse()`
- `server/src/services/` - auth (PIN hashing, JWT, PIN lockout), wallet, funds (mfapi.in NAV fetching and caching)
- `server/src/models/` - Mongoose models
- `server/src/utils/serialize.ts` - converts documents to the DTOs in `shared/src/types.ts`
- Errors: throw `HttpError(status, code, message)`; the handler returns `{ error: { code, message, details } }`

## Client structure

Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `client/src/main.tsx` - React entrypoint; imports `src/index.css`, registers the service worker in production
- `client/src/App.tsx` - providers and routes
- `client/src/index.css` - Tailwind v4 import, colour tokens for light and dark, animations
- `client/src/components/PhoneFrame.tsx` - full screen on phones, centred 390×844 phone frame on desktop; also owns the overlay layer for sheets, toasts and confetti
- `client/src/layouts/AppLayout.tsx` - tab screens plus `TabBar` (Home · Invest · raised Pay · Goals · Profile)
- `client/src/pages/` - one file per screen; `pages/auth/` holds phone → OTP → PIN sign-up and login
- `client/src/context/` - auth session, theme, toasts
- `client/src/lib/api.ts` - `api<T>(path, { method, body })` fetch wrapper that adds the token and throws `ApiError`
- `client/src/lib/useApi.ts` - `useApi<T>(path)` cached data hook; call `invalidateMoney()` after anything that changes money
- `client/public/` - PWA manifest, service worker (`sw.js`), icons (regenerate with `pnpm --filter ./client icons`)
- `client/vite.config.ts` - React, Tailwind v4, Figma Make plugins, `@` alias for `src`, `/api` dev proxy
- `client/.figma/make/site.json` - site metadata (title, description, language, favicon)

## Design

- Mobile only. Screens are built for a ~390px wide phone; sheets, toasts and fixed bars position `absolute` inside the phone frame, never `fixed` to the browser window.
- Palette: Pantone 2025 Mocha Mousse family, exposed as Tailwind colours `bg`, `card`, `subtle`, `tan`, `line`, `line-strong`, `ink`, `muted`, `primary`, `primary-strong`, `on-primary`, `accent`, `accent-soft`, `gain`, `loss`. Use these tokens (e.g. `bg-card text-ink`), not raw hex, so dark mode works.
- Light theme by default with a dark toggle (`.dark` class on `<html>`); check both when changing UI.
- Show skeletons (`Skeleton`, `SkeletonRows`) on first load, not spinners.
- Respect safe areas with the `pt-safe` / `pb-safe` utilities.

## Figma Make specifics

- `client/index.html` contains `<!-- figma:* -->` comment slots. Don't edit or remove them; `vite.config.ts` fills them from `client/.figma/make/site.json`.
- Files matching `src/**/*.stories.{ts,tsx,js,jsx}` are registered with the Figma Make design surface.
- Don't modify the Figma plugins in `vite.config.ts` or anything under `.figma/` unless the task is explicitly about them.

## Dependencies

- Client: React 19, React Router v7 (`react-router`), Recharts v3, `lucide-react`, Tailwind CSS v4, Vite 8, TypeScript
- Server: Express 5, Mongoose 9, zod 4, bcryptjs, jsonwebtoken, helmet, cors, express-rate-limit, tsx

Prefer these libraries over adding new ones for the same job.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
- Import from `src` with the `@/` alias (for example `@/components/Button`).
- TypeScript runs in strict mode everywhere; keep code type-safe and avoid `any`.
- Run `pnpm typecheck` and `pnpm test` before handing work back.
