# MD Card API — Developer Guide

This guide shows how to integrate with the MD Card API as a business partner: authenticating, browsing the catalog, and completing a purchase, with a runnable example for each step. For the complete endpoint reference (every field, every error code), use the interactive docs:

- Swagger UI: `GET /api/docs`
- Raw OpenAPI JSON: `GET /api/docs.json`

All paths below are relative to `/api` (e.g. `/login` means `POST /api/login`).

## Who this is for

This API is for third-party business applications integrating with MD Card — it is not tied to any particular first-party app. A couple of features that exist purely for the official mobile app (self-service account creation, device push notifications) are intentionally left out of this reference; don't assume they're part of the contract.

## 1. Getting access

Business accounts are set up by MD Card directly — there's no public signup form. Once you have a phone number and password, authenticate with:

```
POST /login
{ "phone": "0912345678", "password": "Str0ng!Pass" }

→ 200
{
  "profile": { "id": "64f1a2b3c4d5e6f7a8b9c0d1", "name": "Acme Trading", "role": "business", "balance": 500, ... },
  "accessToken": "eyJhbGciOi..."
}
```

Send that token on every request after that:

```
Authorization: Bearer eyJhbGciOi...
```

A token is valid for a while and then expires; when it does, calls start returning `401 { "code": "AUTH_TOKEN_EXPIRED" }` and you simply log in again — there's no separate refresh step. Passing `"rememberMe": true` in the login request issues a longer-lived token, useful for a server-to-server integration that shouldn't need to re-authenticate often.

Already logged in and just want to change the password? `PATCH /user { "password": "N3wPass!23" }`. Forgot it entirely, or need a new account provisioned? Contact MD Card directly — there's no self-service recovery flow in this API.

**Testing without a live account:** a sandbox environment is available where self-service signup (`POST /signup { "name", "phone", "password", "role": "business" }`) is turned on, so you can create disposable test accounts instead of waiting on a real one. Ask MD Card for sandbox access; the interactive docs at `/api/docs` will show the `/signup` endpoint whenever you're pointed at a sandbox deployment (it isn't shown, and doesn't exist, in production).

## 2. Errors

Every error response, from every endpoint, looks like:

```json
{ "code": "SOME_MACHINE_CODE" }
```

There's no human-readable message field — branch on `code`. A few you'll see across many endpoints:

| Code | Meaning |
| --- | --- |
| `AUTH_LOGIN_REQUIRED` | No token was sent. |
| `AUTH_TOKEN_EXPIRED` | Log in again. |
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
| General API use | 300 requests / minute |
| Login | 20 requests / 15 minutes |

If you're building something that calls the API frequently (e.g. syncing a catalog), cache what you can rather than polling — catalog data doesn't change every second.

## 8. Sandbox mode

For integration testing, MD Card can provision you a sandbox environment where:

- Self-service signup is available (see §1), so you can create test accounts on demand instead of waiting on a real one.
- Stock/availability checks are relaxed and low balances are topped up automatically, so you can run through checkout end-to-end without needing real inventory or funds.

Behavior in sandbox is called out endpoint-by-endpoint in the interactive docs at `/api/docs` — treat it as a testing convenience, not a preview of production behavior.
