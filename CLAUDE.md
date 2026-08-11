# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository structure

This is a monorepo for the mdcard platform: a prepaid-card e-commerce system (accounts, card catalog, orders, transactions) split into independently deployed apps that all talk to one Node/Express API.

| Path | Description | Stack |
| --- | --- | --- |
| [server/](server/) | REST API — auth, card catalog, orders, transactions, search, stats | Node.js, Express 5, MongoDB (Mongoose) |
| [client/](client/) | Public marketing/landing site (about, services, terms, privacy) — no auth, no cart, not the storefront | React 19, Vite, Tailwind CSS 4, React Router |
| [mdcard-mobile/](mdcard-mobile/) | The actual customer storefront: browsing, cart, checkout, order/transaction history | Expo / React Native |
| `mdcard-panel/` | Admin panel (referenced in the root README, not present in this checkout) | React, Node.js |

`mdcard-mobile/` has its own nested `.git` — it is a separate repository, not a submodule of this one, and shows up as untracked from the root repo's perspective.

Each app manages its own `.env`; there are no `.env.example` files checked in, so check with the user or the deployed environment for required values.

## Commands

### server/
```bash
cd server
npm install
npm run dev     # nodemon index.js
```
There is no test suite and no lint script in `server/`. `package.json` also defines `npm run seed`, but `utils/seed.js` does not exist in this checkout — it will fail if run.

### client/
```bash
cd client
npm install
npm run dev      # Vite dev server
npm run build
npm run lint      # eslint
```

### mdcard-mobile/
```bash
cd mdcard-mobile
npm install
npm start           # expo start
npm run android      # or ios / web
npm run lint         # expo lint
```

No package in this repo has an automated test suite — do not assume `npm test` works anywhere.

## Server architecture

Standard layered Express app: `routes/` → `middleware/` → `controllers/` → `models/` (Mongoose). Entry point is [server/index.js](server/index.js), which mounts routes under `/api/*` and serves OpenAPI docs at `/api/docs` (spec built in [server/docs/openapi.js](server/docs/openapi.js)).

- **Auth**: `verifyToken`/`getUserInfo` in [server/middleware/auth.middleware.js](server/middleware/auth.middleware.js) read a JWT from either an `Authorization: Bearer` header or an `access_token` cookie, then attach `req.user`. `verifyToken` rejects unauthenticated/inactive users; `getUserInfo` is the soft variant for routes that behave differently for logged-in vs anonymous callers.
- **Error convention**: handlers return `{ code: "SOME_CODE" }` machine-readable codes (never free-text messages) via `handleError` in [server/utils/errorHandler.js](server/utils/errorHandler.js) or inline `res.status(...).json({ code })`. Both frontends match on these codes rather than parsing messages.
- **Card catalog hierarchy**: `CardCategory` → `CardType` (has `fulfillmentSource`: `local` or `bamboo`, plus the printable `redeemFormat` template) → `CardTier` (pricing, `bambooProductId`/`value` for the external provider) → `Card` (one purchasable inventory unit; `code` is AES-256-GCM encrypted at rest via [server/utils/cardCodeCrypto.js](server/utils/cardCodeCrypto.js), with a separate `codeHash` used only for duplicate detection).
- **Pricing** ([server/utils/priceCalculator.js](server/utils/priceCalculator.js)): `individual`-role users always pay `sellPrice`. `business`-role users pay a per-user `CustomPricing` override if one exists for that tier, else the tier's effective buy price — `buyPriceUsd × dollarRate` if `buyPriceUsd` is set, otherwise `buyPrice`. `dollarRate` comes from the `Setting` document keyed `"سعر الدولار"`.
- **Checkout** ([server/controllers/order.controller.js](server/controllers/order.controller.js) `checkoutCart`) is the most involved flow in the codebase: for each cart line it first tries to reserve existing local `Card` stock (atomic `findOneAndUpdate` setting `soldTo`), and only for `bamboo`-sourced tiers with remaining unmet quantity does it call out to the external provider ([server/services/bambooCard.js](server/services/bambooCard.js): `POST orders/checkout` then poll `GET orders/:id` until enough card codes are returned). Any failure at any step (insufficient local stock, Bamboo out-of-stock, incomplete order) triggers `cancelCheckout`, which releases every card reserved so far in that request before returning `409`. Balance is only debited and the `Order`/`Transaction` documents only written after all items are fully resolved.
- **Sandbox mode**: `SANDBOX_MODE`/`SANDBOX=true` or `APP_ENV=sandbox` (checked in [server/utils/sandbox.js](server/utils/sandbox.js)) switches checkout to generate fake local cards instead of touching Bamboo, auto-tops-up a user's balance by a fixed amount when insufficient, and skips phone-verification/deposit-admin requirements elsewhere. It exists for demoing/testing without hitting the real provider or SMS gateway — be careful not to treat sandbox-only code paths as representative of production behavior.
- There is no server-side cart model — the cart lives entirely client-side (see mobile below) and is posted as an `items: [{ tierId, quantity }]` array directly to `POST /api/orders/checkout`.

## Client (web) architecture

Plain marketing SPA, not connected to the API. Language toggle is `ar`/`en` via [client/src/contexts/LanguageContext.jsx](client/src/contexts/LanguageContext.jsx), with copy for both languages centralized in [client/src/content/siteContent.js](client/src/content/siteContent.js) rather than scattered per-component. Dark mode is a `localStorage`-backed class toggle on `<html>`, independent of the language state.

## Mobile architecture

Expo Router file-based routing under [mdcard-mobile/app/](mdcard-mobile/app/) (route groups like `(tabs)/`, dynamic segments like `cards/[typeId].jsx` and `order/[id].jsx`). The app is RTL-forced (`I18nManager.forceRTL(true)` in [mdcard-mobile/app/_layout.jsx](mdcard-mobile/app/_layout.jsx)) with Tajawal as the default font — this is an Arabic-first app, not one with a language switch.

- **State**: Redux Toolkit store ([mdcard-mobile/state/store.js](mdcard-mobile/state/store.js)) with `redux-persist` backed by `AsyncStorage`, persisting the `user` and `cart` slices. Cart contents survive app restarts by design; there is no server-side cart to reconcile against.
- **API access**: every `services/*Api.js` module calls through the single axios instance in [mdcard-mobile/services/api.js](mdcard-mobile/services/api.js), which injects the bearer token from `authStorage` on every request and, on a `403 AUTH_USER_INACTIVE` response, routes through [mdcard-mobile/services/sessionManager.js](mdcard-mobile/services/sessionManager.js) to clear Redux state and redirect to `/inactive`. `sessionManager` also owns the "session expired" redirect-to-login path — new API modules should go through this shared client rather than instantiating their own axios instance, to keep that interceptor behavior.
- **Auth token expiry**: controlled server-side by `ACCESS_TOKEN_EXPIRATION` (default 14d) vs `REMEMBER_ME_ACCESS_EXPIRATION` (default 90d) in [server/controllers/auth.controller.js](server/controllers/auth.controller.js).
