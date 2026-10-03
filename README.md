# RupeeRound

**Pay. Round up. Build your investment habit.**

RupeeRound rounds every payment up to the next ₹5, ₹10 or whatever step you choose, and saves the spare change in a round-up wallet. Once the wallet reaches a fund's minimum, you invest it in a Large, Mid or Small Cap index fund. Until then the balance carries forward.

> Hackathon prototype: payments and investments are **simulated**. Fund NAVs are real (from [mfapi.in](https://www.mfapi.in)); fund minimums are demo values.

## Run it locally

Requires Node.js 22+ and pnpm 10 (`npm i -g pnpm@10`).

```bash
pnpm install
cp server/.env.example server/.env   # then fill in MONGODB_URI and JWT_SECRET
pnpm seed                            # demo account: 98765 43210, PIN 1234
pnpm dev                             # API on :4000, app on http://localhost:8443
```

Open http://localhost:8443. On a laptop the app shows inside a phone frame. To try it on your phone, open `http://<your-laptop-ip>:8443` on the same Wi-Fi.

New accounts work too: any 10-digit number starting with 6–9, OTP `123456`.

## Demo script (2 minutes)

1. Log in with **98765 43210** and PIN **1234**. Home shows ₹618 in the wallet, still short of the ₹1,000 Small Cap minimum.
2. Tap **Pay** → Café → ₹32 → ₹5 step. The preview shows ₹35 to pay, +₹3 to the wallet. Pay with PIN 1234.
3. On Invest → Small Cap the balance is below the minimum, so it carries forward. Use **Add money** to top up the shortfall, then **Invest**.
4. Show Goals and the dark mode toggle on Profile.

Run `pnpm seed` again to reset the demo account.

## Project layout

| Folder | What's inside |
|---|---|
| `client/` | React 19 + Vite + Tailwind v4 mobile web app (installable PWA) |
| `server/` | Express 5 REST API, MongoDB via Mongoose, JWT auth |
| `shared/` | Round-up, carry-forward and money helpers + API types, used by both |

`agents.md` has the detailed conventions.

## Deploy

- **Database:** MongoDB Atlas. In Network Access, allow `0.0.0.0/0` (or Render's IPs).
- **API on Render:** Web Service, root directory = repo root.
  - Build command: `pnpm install --frozen-lockfile`
  - Start command: `pnpm start`
  - Env vars: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN=https://<your-app>.vercel.app`
- **App on Vercel:** root directory `client`.
  - Build command: `pnpm build`
  - Output directory: `dist`
  - Env var: `VITE_API_URL=https://<your-api>.onrender.com`

## Team split

- **Frontend:** `client/src/pages`, `client/src/components`
- **Backend:** `server/src/routes`, `server/src/services`
- **Data and investing:** `shared/`, `server/src/models`, the NAV service, the seed script
- **Integration and demo:** deploy, seed data, testing, slides
