# MD Card API — Developer Guide

This guide shows how to integrate with the MD Card API as a business partner: authenticating, browsing the catalog, and completing a purchase, with a runnable example for each step. For the complete endpoint reference (every field, every error code), use the interactive docs:

- Swagger UI: `GET /api/docs`
- Raw OpenAPI JSON: `GET /api/docs.json`

All paths below are relative to `/api` (e.g. `/verify-access` means `GET /api/verify-access`).

## Who this is for

This API is for third-party business applications integrating with MD Card — it is not tied to any particular first-party app. A couple of features that exist purely for the official mobile app (self-service account creation, device push notifications) are intentionally left out of this reference; don't assume they're part of the contract.

## 1. Getting access

Business accounts are set up by MD Card directly — there's no public signup form, and no login step either. As part of onboarding, MD Card issues your integration an API key (a string starting with `mdc_live_`). Send it as a bearer token on every request:

```
Authorization: Bearer mdc_live_...
```

That's the entire authentication flow. There's no token expiry to manage and nothing to refresh — the key works until MD Card revokes or rotates it for you. Treat it as a secret: keep it server-side only, never in a client app.

```
GET /verify-access
Authorization: Bearer mdc_live_...

→ 200
{ "valid": true, "role": "business", "id": "64f1a2b3c4d5e6f7a8b9c0d1" }
```

Want to check the key is still active without making a "real" request? `GET /verify-access` is a cheap way to do that.

Need a new key, or need one revoked (an integration was retired, a key leaked)? Contact MD Card directly — key issuance is admin-managed, not self-service.

**Testing without a live key:** sandbox (a separate deployment with relaxed stock/balance rules, see §8) is self-service — get your own test key against the sandbox base URL, no need to contact MD Card:

```
POST /signup
{ "name": "Test Co", "phone": "0912345678", "password": "Test1234!", "role": "business" }
→ 201 { "code": "AUTH_USER_CREATED" }

POST /get-api-key
{ "phone": "0912345678", "password": "Test1234!" }
→ 200 { "name": "Sandbox Testing Key", "keyPrefix": "mdc_live_...", "secret": "mdc_live_...", "createdAt": "..." }
```

`/signup` and `/get-api-key` only exist in sandbox — there's no self-service signup against production, and `role` is always forced to `"business"` regardless of what you send, since that's the only role API keys can be issued for. `/get-api-key` skips phone verification, admin activation, and login entirely; it just returns the one key `/signup` already created for the account, identified by phone+password. Calling it again returns that same key, not a new one — unlike a real key, a sandbox key stays retrievable this way instead of being shown only once.

## 2. Errors

Every error response, from every endpoint, looks like:

```json
{ "code": "SOME_MACHINE_CODE" }
```

There's no human-readable message field — branch on `code`. A few you'll see across many endpoints:

| Code | Meaning |
| --- | --- |
| `AUTH_LOGIN_REQUIRED` | No token was sent. |
| `AUTH_API_KEY_INVALID` | The key is missing, unknown, or revoked. Check with MD Card. |
| `AUTH_USER_INACTIVE` | This account isn't active yet — check with MD Card. |
| `SERVER_ERROR` | Something broke on our end; not caused by your request. |

## 3. Browsing the catalog

```
GET /card-categories
→ [{ "_id": "...", "name": "Gaming", "order": 1, "count": 8 }]

GET /card-types/by-category?categoryId=...&page=1&limit=10
→ { "name": "Gaming", "cardTypes": [{ "_id": "...", "name": "Steam Wallet", "image": "..." }] }

GET /card-types/get-one?id=...
→ {
    "_id": "...",
    "name": "Steam Wallet",
    "tiers": [
      { "_id": "...", "title": "$25", "sellPrice": 25, "buyPrice": 22.5, "isAvailable": true },
      { "_id": "...", "title": "$50", "sellPrice": 50, "buyPrice": 45, "isAvailable": false }
    ]
  }
```

`GET /card-types/get-one` is the endpoint to build a product page from — each tier's `buyPrice` is already the price your account pays, and `isAvailable` tells you whether it's currently purchasable. Use those values directly; there's no need to recalculate pricing on your end.

```
GET /search/card-types?query=steam
→ [{ "_id": "...", "name": "Steam Wallet", "image": "..." }]
```

`GET /favorites`, `POST /favorites { "cardTypeId": "..." }`, and `DELETE /favorites?cardTypeId=...` let you save/unsave card types for quick access later.

## 4. Cart and checkout

There's no server-side cart — build one on your side as a list of `{ tierId, quantity }` and only send it to the API when you're ready to buy.

**1. Optionally check availability first**, to warn about anything out of stock before showing a final confirmation:

```
POST /card-tiers/availability
{ "items": [{ "tierId": "64f...", "quantity": 3 }] }

→ [{ "tierId": "64f...", "requested": 3, "available": 2 }]
```

**2. Check out:**

```
POST /orders/checkout
{
  "items": [{ "tierId": "64f...", "quantity": 2 }],
  "checkoutKey": "b1e2c3d4-5f6a-7b8c-9d0e-1f2a3b4c5d6e"
}

→ 201
{
  "cards": [
    { "_id": "...", "serialNumber": "1234567890", "code": "9999-8888-7777", "pin": null },
    { "_id": "...", "serialNumber": "1234567891", "code": "6666-5555-4444", "pin": null }
  ],
  "order": { "_id": "...", "totalAmount": 45, "createdAt": "2026-08-11T12:00:00.000Z" },
  "balance": 455
}
```

`checkoutKey` should be a fresh unique value (e.g. a UUID) for every checkout **attempt**. If a request times out or the response gets lost, retry with the *same* `checkoutKey` — you'll safely get back the original result instead of being charged twice.

Checkout either fully succeeds or doesn't charge you at all — there's no partial purchase. If any item in the cart can't be fulfilled, you get:

```
409
{
  "code": "CART_AVAILABILITY_CHANGED",
  "details": [{ "tierId": "64f...", "requested": 2, "available": 0, "code": "OUT_OF_STOCK" }]
}
```

Adjust the cart based on `details` and try again with a new `checkoutKey`.

## 5. Order and transaction history

```
GET /orders?page=1&limit=10
→ { "orders": [{ "_id": "...", "totalAmount": 45, "items": [...] }], "pagination": { "page": 1, "limit": 10, "total": 12, "totalPages": 2, "hasMore": true } }

GET /orders/{id}
→ { "_id": "...", "totalAmount": 45, "items": [{ "title": "$25", "price": 22.5, "quantity": 2, "cards": [...] }] }

GET /transactions?type=purchase&page=1&limit=10
→ { "transactions": [{ "_id": "...", "type": "purchase", "amount": 45, "balanceBefore": 500, "balanceAfter": 455 }], "pagination": {...} }
```

`GET /orders` omits card codes (cheap to page through); fetch `GET /orders/{id}` when you need the actual redeemable codes for a specific order. `GET /transactions` is the full balance ledger — deposits, purchases, and refunds — and can be filtered with `type`, sorted with `sortBy`/`sortOrder`.

## 6. Pagination

Any endpoint that supports it takes `page` (default `1`) and `limit` (default `10`, capped at `100`) as query parameters, and returns a `pagination` object alongside the results:

```json
{ "page": 1, "limit": 10, "total": 42, "totalPages": 5, "hasMore": true }
```

## 7. Rate limits

| Scope | Limit |
| --- | --- |
| General API use | 300 requests / minute per IP |
| Per API key | 1000 requests / minute, on top of the general limit — so a single busy integration doesn't get throttled by traffic from a completely different one |

If you're building something that calls the API frequently (e.g. syncing a catalog), cache what you can rather than polling — catalog data doesn't change every second.

## 8. Sandbox mode

For integration testing, MD Card can provision you a sandbox environment and a sandbox API key where:

- Stock/availability checks are relaxed and low balances are topped up automatically, so you can run through checkout end-to-end without needing real inventory or funds.

Behavior in sandbox is called out endpoint-by-endpoint in the interactive docs at `/api/docs` — treat it as a testing convenience, not a preview of production behavior.
