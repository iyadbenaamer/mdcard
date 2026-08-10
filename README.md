# mdcard

Monorepo for the mdcard platform: a card-based e-commerce system (accounts, card types/tiers, orders, transactions, search) split across a public web client, a customer mobile app, and an admin panel, all backed by a shared Node/Express API.

## Structure

| Path | Description | Stack |
| --- | --- | --- |
| [server/](server/) | REST API: auth, cards, card types/tiers, orders, search, stats, users | Node.js, Express 5, MongoDB (Mongoose) |
| [client/](client/) | Public-facing web app | React 19, Vite, Tailwind CSS |
| [mdcard-mobile/](mdcard-mobile/) | Customer mobile app | Expo / React Native |
| [mdcard-panel/](mdcard-panel/) | Admin panel (separate client + server) | React, Node.js |

## Server

Entry point: [server/index.js](server/index.js)

- **Controllers**: [server/controllers/](server/controllers/) — auth, card, cardTier, cardType, order, search, stats, user
- **Models**: [server/models/](server/models/) — Mongoose schemas
- **Routes**: [server/routes/](server/routes/)
- **Docs**: OpenAPI spec at [server/docs/openapi.js](server/docs/openapi.js), served via `swagger-ui-express`

### Scripts

```bash
cd server
npm install
npm run dev    # start with nodemon
npm run seed   # seed the database
```

## Client (web)

```bash
cd client
npm install
npm run dev       # start Vite dev server
npm run build      # production build
npm run lint       # eslint
```

## Mobile

```bash
cd mdcard-mobile
npm install
npm start           # expo start
npm run android     # or ios / web
```

## Admin panel

```bash
cd mdcard-panel/server && npm install
cd ../client && npm install
```

## Environment

Each app (`server`, `client`, `mdcard-mobile`, `mdcard-panel/*`) manages its own environment variables — check for a `.env.example` in the respective directory before running.
