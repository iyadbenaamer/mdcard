import { isSandboxMode } from "../utils/sandbox.js";

const isSandbox = isSandboxMode();

const bearerAuth = [{ bearerAuth: [] }];
const authErrorResponses = {
  403: {
    description: "No API key sent, or the key is missing/invalid/revoked",
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ErrorResponse" },
        examples: {
          loginRequired: { value: { code: "AUTH_LOGIN_REQUIRED" } },
          apiKeyInvalid: { value: { code: "AUTH_API_KEY_INVALID" } },
          userInactive: { value: { code: "AUTH_USER_INACTIVE" } },
        },
      },
    },
  },
};

export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "MD Card API",
    version: "2.0.0",
    description: [
      "An API for business partners integrating with MD Card: browse the card catalog and place orders. MD Card issues your integration an API key; send it as a `Bearer` token in the `Authorization` header on every request. There is no server-side cart — build one on your side as a list of `{ tierId, quantity }` and only call the API when you're ready to check out.",
      "",
      "All error responses share one shape: `{ \"code\": \"SOME_MACHINE_CODE\" }` (see `ErrorResponse`). Branch on `code`, not on message text (there isn't one). A full walkthrough with worked examples for every step — authenticating, browsing, checking out — is in the accompanying API guide.",
    ].join("\n"),
  },
  servers: [
    {
      url:"http://localhost:5000/api",
    }
  ],
  tags: [
    {
      name: "Auth",
      description: isSandbox
        ? "Verifying an API key, and (sandbox only) self-service test-account creation."
        : "Verifying an API key",
    },
    { name: "Users", description: "User profile" },
    { name: "Card Categories", description: "Top-level card catalog categories" },
    { name: "Card Types", description: "Card types (brands/products) within a category" },
    { name: "Card Tiers", description: "Purchasable denominations/tiers of a card type" },
    { name: "Orders", description: "Cart checkout and order history" },
    { name: "Search", description: "Catalog search" },
    { name: "Transactions", description: "Balance transaction history (deposits, purchases, refunds)" },
    { name: "Favorites", description: "A user's favorited card types" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "mdc_live_...",
        description:
          "An API key issued by MD Card, sent as `Authorization: Bearer mdc_live_...`. There's no login step or token expiry to manage - the key is valid until MD Card revokes or rotates it for you.",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          code: { type: "string" },
        },
        required: ["code"],
      },
      VerifyAccessResponse: {
        type: "object",
        properties: {
          valid: { type: "boolean" },
          role: { type: "string", enum: ["business"] },
          id: { type: "string" },
        },
        required: ["valid", "role", "id"],
      },
      ...(isSandbox
        ? {
            SignupRequest: {
              type: "object",
              properties: {
                name: { type: "string", description: "2-50 chars." },
                phone: { type: "string", description: "Local format, e.g. 0912345678." },
                password: {
                  type: "string",
                  description: "8-50 chars; must include at least one digit and one symbol.",
                },
                role: {
                  type: "string",
                  enum: ["business", "individual"],
                  description: "Required by the shared signup validation, but sandbox accounts are always created as \"business\" regardless of what's sent here - that's the only role API keys can be issued for.",
                },
              },
              required: ["name", "phone", "password", "role"],
            },
            GetApiKeyRequest: {
              type: "object",
              properties: {
                phone: { type: "string" },
                password: { type: "string" },
              },
              required: ["phone", "password"],
            },
            GetApiKeyResponse: {
              type: "object",
              description: "The one API key auto-created for this account by POST /signup. Calling this endpoint again returns the same key, not a new one.",
              properties: {
                name: { type: "string" },
                keyPrefix: { type: "string" },
                secret: {
                  type: "string",
                  description: "The full API key - send this as the Bearer token. Unlike a real (non-sandbox) key, this is retrievable again from this endpoint any time, not shown only once.",
                },
                createdAt: { type: "string", format: "date-time" },
              },
            },
          }
        : {}),
      UserProfile: {
        type: "object",
        description: "The shape of `profile` returned by GET /user.",
        properties: {
          phone: { type: "string" },
          name: { type: "string" },
          role: { type: "string", enum: ["business"] },
          balance: { type: "number" },
          isActive: { type: "boolean" },
          canBuy: { type: "boolean" },
          canSendCode: { type: "boolean" },
          verificationStatus: { $ref: "#/components/schemas/VerificationStatus" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      VerificationStatus: {
        type: "object",
        properties: {
          isVerified: { type: "boolean" },
          remainingAttempts: { type: "number" },
          resendAfter: { type: "string", format: "date-time", nullable: true },
          codesSentCount: { type: "number" },
          windowStart: { type: "string", format: "date-time", nullable: true },
        },
      },
      UserProfileResponse: {
        type: "object",
        properties: {
          profile: { $ref: "#/components/schemas/UserProfile" },
          support: { type: "string" },
        },
        required: ["profile"],
      },
      UserUpdateResponse: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          phone: { type: "string" },
          role: { type: "string", enum: ["business"] },
          balance: { type: "number" },
          isActive: { type: "boolean" },
          canBuy: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      CardCategory: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string" },
          order: { type: "number" },
          count: {
            type: "number",
            description: "Number of card types in this category.",
          },
        },
      },
      CardTier: {
        type: "object",
        description:
          'The tier shape returned nested under a card type (GET /card-types/get-one), already priced for your account. Example: `{ "_id": "64f...", "title": "$25", "sellPrice": 25, "buyPrice": 22.5, "isAvailable": true }`. Use `buyPrice` as-is — it is the final per-unit price to charge, no further calculation needed.',
        properties: {
          _id: { type: "string" },
          typeId: { type: "string" },
          title: { type: "string" },
          order: { type: "number" },
          sellPrice: { type: "number" },
          buyPrice: {
            type: "number",
            description: "The price this account pays per unit.",
          },
          isAvailable: {
            type: "boolean",
            description: "false when this tier is temporarily out of stock; true otherwise.",
          },
        },
      },
      CardTierListItem: {
        type: "object",
        description:
          "A simpler tier listing (GET /card-tiers). Prefer /card-types/get-one or /card-types/by-category for browsing and pricing — those return the CardTier shape above, already priced and availability-checked for your account.",
        properties: {
          _id: { type: "string" },
          typeId: { type: "string" },
          order: { type: "number" },
          title: { type: "string" },
          buyPrice: { type: "number", nullable: true },
          sellPrice: { type: "number" },
          isActive: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CardTierAvailabilityItem: {
        type: "object",
        properties: {
          tierId: { type: "string" },
          requested: { type: "number" },
          available: {
            type: "number",
            description:
              "How many of the requested quantity can actually be fulfilled right now (never more than `requested`).",
          },
        },
        required: ["tierId", "requested", "available"],
      },
      CardType: {
        type: "object",
        properties: {
          _id: { type: "string" },
          categoryId: { type: "string" },
          name: { type: "string" },
          image: { type: "string", nullable: true },
          printImage: { type: "string", nullable: true },
          redeemFormat: {
            type: "string",
            nullable: true,
            description:
              "Printable template for this type's cards; supports {code}, {serial}, {title}, {tier} placeholders.",
          },
          showExpiryDateDay: { type: "boolean" },
          notes: { type: "string", nullable: true },
          order: { type: "number" },
        },
      },
      CardTypeWithTiers: {
        allOf: [
          { $ref: "#/components/schemas/CardType" },
          {
            type: "object",
            properties: {
              tiers: {
                type: "array",
                items: { $ref: "#/components/schemas/CardTier" },
              },
            },
          },
        ],
      },
      Favorite: {
        type: "object",
        properties: {
          _id: { type: "string" },
          userId: { type: "string" },
          cardTypeId: { type: "string" },
          cardTypeName: { type: "string" },
          cardTypeImage: { type: "string", nullable: true },
          cardTypeIsActive: { type: "boolean" },
          categoryId: { type: "string" },
          categoryName: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Card: {
        type: "object",
        description: "A purchased card, ready to display or print.",
        properties: {
          _id: { type: "string" },
          serialNumber: { type: "string" },
          code: { type: "string" },
          pin: { type: "string", nullable: true },
          expiryDate: { type: "string", format: "date-time", nullable: true },
          redeemFormat: { type: "string", nullable: true },
        },
      },
      OrderItem: {
        type: "object",
        properties: {
          tierId: {
            type: "object",
            nullable: true,
            properties: {
              _id: { type: "string" },
              typeId: {
                type: "object",
                nullable: true,
                properties: {
                  _id: { type: "string" },
                  name: { type: "string" },
                  redeemFormat: { type: "string", nullable: true },
                  image: { type: "string", nullable: true },
                  printImage: { type: "string", nullable: true },
                  showExpiryDateDay: { type: "boolean", nullable: true },
                },
              },
            },
          },
          title: {
            type: "string",
            description: "Snapshot of the tier's title at purchase time.",
          },
          price: {
            type: "number",
            description: "Per-unit price actually charged, frozen at checkout time.",
          },
          quantity: { type: "number" },
          cards: {
            type: "array",
            description: "Only populated on GET /orders/{id}, not on the list endpoint.",
            items: { $ref: "#/components/schemas/Card" },
          },
        },
      },
      Order: {
        type: "object",
        properties: {
          _id: { type: "string" },
          totalAmount: { type: "number" },
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/OrderItem" },
          },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      CheckoutRequest: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                tierId: { type: "string" },
                quantity: {
                  type: "number",
                  minimum: 1,
                  description: "Missing or invalid values are treated as 1.",
                },
              },
              required: ["tierId"],
            },
          },
          checkoutKey: {
            type: "string",
            description:
              "Client-generated idempotency key (e.g. a UUID) unique per checkout attempt. Retrying the same checkout with the same key replays the original result instead of charging the user again.",
            minLength: 8,
            maxLength: 100,
          },
        },
        required: ["items", "checkoutKey"],
      },
      CheckoutResponse: {
        type: "object",
        properties: {
          cards: {
            type: "array",
            items: { $ref: "#/components/schemas/Card" },
          },
          order: { $ref: "#/components/schemas/Order" },
          balance: { type: "number", description: "User's balance after the purchase." },
          partialFailure: {
            type: "boolean",
            description:
              "Always false today — any item that can't be fully fulfilled cancels the whole checkout (see the 409 response) rather than completing partially.",
          },
          failedItems: { type: "array", items: { type: "object" } },
        },
        required: ["cards", "order", "balance"],
      },
      CheckoutCancelResponse: {
        type: "object",
        description:
          "409 response: none of the user's balance or cart was touched. `details` explains, per affected cart line, why it couldn't be fulfilled.",
        properties: {
          code: { type: "string", example: "CART_AVAILABILITY_CHANGED" },
          details: {
            type: "array",
            items: {
              type: "object",
              properties: {
                tierId: { type: "string" },
                requested: { type: "number" },
                available: { type: "number" },
                code: {
                  type: "string",
                  description:
                    "A short code explaining why this line failed, e.g. OUT_OF_STOCK or INCOMPLETE_ORDER.",
                },
                message: { type: "string", nullable: true },
              },
            },
          },
        },
        required: ["code"],
      },
      Pagination: {
        type: "object",
        properties: {
          page: { type: "number" },
          limit: { type: "number", description: "Capped at 100." },
          total: { type: "number" },
          totalPages: { type: "number" },
          hasMore: { type: "boolean" },
        },
      },
      OrdersListResponse: {
        type: "object",
        properties: {
          orders: {
            type: "array",
            items: { $ref: "#/components/schemas/Order" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      TransactionOrderSummary: {
        type: "object",
        description:
          "A reduced view of the purchase's order — only present when type is \"purchase\". Note the nested card type only carries _id/name here, unlike the full CardType shape returned from the Orders endpoints.",
        properties: {
          _id: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                tierId: {
                  type: "object",
                  nullable: true,
                  properties: {
                    _id: { type: "string" },
                    typeId: {
                      type: "object",
                      nullable: true,
                      properties: {
                        _id: { type: "string" },
                        name: { type: "string" },
                      },
                    },
                  },
                },
                title: { type: "string" },
                price: { type: "number" },
                quantity: { type: "number" },
              },
            },
          },
        },
      },
      Transaction: {
        type: "object",
        properties: {
          _id: { type: "string" },
          type: { type: "string", enum: ["deposit", "purchase", "refund"] },
          amount: { type: "number" },
          balanceBefore: { type: "number" },
          balanceAfter: { type: "number" },
          orderId: {
            allOf: [{ $ref: "#/components/schemas/TransactionOrderSummary" }],
            nullable: true,
          },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      TransactionsListResponse: {
        type: "object",
        properties: {
          transactions: {
            type: "array",
            items: { $ref: "#/components/schemas/Transaction" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      CardTypeSearchItem: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string" },
          image: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    ...(isSandbox
      ? {
          "/signup": {
            post: {
              tags: ["Auth"],
              summary: "Create a sandbox test account",
              description:
                "Sandbox only - not available in production, where account creation and API key issuance are handled by MD Card directly. Creates a business-role account with no phone verification and no admin activation step; it's active and ready to use immediately. Call POST /get-api-key with the same phone/password right after this to get a working API key.",
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/SignupRequest" },
                  },
                },
              },
              responses: {
                201: {
                  description: "Account created",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: { code: { type: "string", example: "AUTH_USER_CREATED" } },
                      },
                    },
                  },
                },
                400: {
                  description: "Missing/invalid field",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/ErrorResponse" },
                      examples: {
                        missingFields: { value: { code: "AUTH_REQUIRED_FIELDS_MISSING" } },
                        invalidRole: { value: { code: "AUTH_INVALID_ROLE" } },
                        invalidPhone: { value: { code: "CHECK_INVALID_PHONE" } },
                        invalidPassword: { value: { code: "CHECK_INVALID_PASSWORD_FORMAT" } },
                        invalidName: { value: { code: "CHECK_INVALID_NAME" } },
                      },
                    },
                  },
                },
                409: {
                  description: "Phone already registered",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/ErrorResponse" },
                      examples: {
                        exists: { value: { code: "AUTH_PHONE_ALREADY_REGISTERED" } },
                      },
                    },
                  },
                },
                default: {
                  description: "Error",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/ErrorResponse" },
                    },
                  },
                },
              },
            },
          },
          "/get-api-key": {
            post: {
              tags: ["Auth"],
              summary: "Get a sandbox test account's API key",
              description:
                "Sandbox only. Authenticates with phone/password directly - no device session or login step needed - and returns the single API key POST /signup auto-created for that account.",
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/GetApiKeyRequest" },
                  },
                },
              },
              responses: {
                200: {
                  description: "API key",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/GetApiKeyResponse" },
                    },
                  },
                },
                400: {
                  description: "Missing phone or password",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/ErrorResponse" },
                      examples: { invalid: { value: { code: "AUTH_INVALID_LOGIN" } } },
                    },
                  },
                },
                401: {
                  description: "Wrong password",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/ErrorResponse" },
                      examples: { invalid: { value: { code: "AUTH_INVALID_LOGIN" } } },
                    },
                  },
                },
                404: {
                  description: "No account for this phone, or it has no sandbox API key",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/ErrorResponse" },
                      examples: {
                        noAccount: { value: { code: "AUTH_INVALID_LOGIN" } },
                        noKey: { value: { code: "API_KEY_NOT_FOUND" } },
                      },
                    },
                  },
                },
                default: {
                  description: "Error",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/ErrorResponse" },
                    },
                  },
                },
              },
            },
          },
        }
      : {}),
    "/verify-access": {
      get: {
        tags: ["Auth"],
        summary: "Verify access token",
        description: "Check if the provided access token is valid and get user info.",
        security: bearerAuth,
        responses: {
          200: {
            description: "Token is valid",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VerifyAccessResponse" },
              },
            },
          },
          ...authErrorResponses,
          default: {
            description: "Error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/user": {
      get: {
        tags: ["Users"],
        summary: "Get current user's profile",
        security: bearerAuth,
        responses: {
          200: {
            description: "User profile",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserProfileResponse" },
              },
            },
          },
          404: {
            description: "User no longer exists",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: { notFound: { value: { code: "USER_NOT_FOUND" } } },
              },
            },
          },
          ...authErrorResponses,
          default: {
            description: "Error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Change the current user's password",
        description: "Only `password` is settable through this endpoint. Omit the body/field to no-op.",
        security: bearerAuth,
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  password: {
                    type: "string",
                    description: "8-50 chars; must include at least one digit and one symbol.",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "User updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserUpdateResponse" },
              },
            },
          },
          400: {
            description: "Password fails the format check",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  invalidPassword: { value: { code: "CHECK_INVALID_PASSWORD_FORMAT" } },
                },
              },
            },
          },
          404: {
            description: "User no longer exists",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: { notFound: { value: { code: "USER_NOT_FOUND" } } },
              },
            },
          },
          ...authErrorResponses,
          default: {
            description: "Error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/card-categories": {
      get: {
        tags: ["Card Categories"],
        summary: "List card categories",
        security: bearerAuth,
        responses: {
          200: {
            description: "Card categories, sorted by `order`",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/CardCategory" },
                },
              },
            },
          },
          ...authErrorResponses,
          default: {
            description: "Error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/card-tiers": {
      get: {
        tags: ["Card Tiers"],
        summary: "List active card tiers",
        description:
          "A simple tier listing. Prefer GET /card-types/get-one for browsing — it returns tiers already priced and availability-checked for your account (see the Card Types section).",
        security: bearerAuth,
        parameters: [
          {
            name: "typeId",
            in: "query",
            schema: { type: "string" },
            description: "Filter to tiers of a single card type. If given, the response is wrapped with the type/category name.",
          },
          { name: "page", in: "query", schema: { type: "number" } },
          { name: "limit", in: "query", schema: { type: "number" } },
        ],
        responses: {
          200: {
            description: "Tiers",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    {
                      type: "array",
                      items: { $ref: "#/components/schemas/CardTierListItem" },
                    },
                    {
                      type: "object",
                      description: "Shape returned when `typeId` is given.",
                      properties: {
                        name: { type: "string" },
                        categoryName: { type: "string" },
                        tiers: {
                          type: "array",
                          items: { $ref: "#/components/schemas/CardTierListItem" },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          404: {
            description: "typeId does not match any card type",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: { notFound: { value: { code: "CARD_TYPE_NOT_FOUND" } } },
              },
            },
          },
          ...authErrorResponses,
          default: {
            description: "Error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/card-tiers/availability": {
      post: {
        tags: ["Card Tiers"],
        summary: "Check tier availability",
        description:
          "Call this right before checkout to confirm the cart is still fulfillable — checkout itself re-validates and will 409 with CART_AVAILABILITY_CHANGED if stock moved between this call and the checkout request. Sandbox: availability always equals requested quantity (no local stock check).",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        tierId: { type: "string" },
                        quantity: { type: "number" },
                      },
                      required: ["tierId"],
                    },
                  },
                },
                required: ["items"],
              },
            },
          },
        },
        responses: {
          200: {
            description: "Availability list",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/CardTierAvailabilityItem",
                  },
                },
              },
            },
          },
          400: {
            description: "Empty items array",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: { required: { value: { code: "CART_ITEMS_REQUIRED" } } },
              },
            },
          },
          ...authErrorResponses,
          default: {
            description: "Error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/card-types": {
      get: {
        tags: ["Card Types"],
        summary: "List card types",
        security: bearerAuth,
        parameters: [
          { name: "page", in: "query", schema: { type: "number" } },
          { name: "limit", in: "query", schema: { type: "number" } },
        ],
        responses: {
          200: {
            description: "Card types",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/CardType" },
                },
              },
            },
          },
          ...authErrorResponses,
          default: {
            description: "Error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/card-types/by-category": {
      get: {
        tags: ["Card Types"],
        summary: "List card types by category",
        description: "Returns active card types for users. This is the primary category-drilldown endpoint used by the storefront.",
        security: bearerAuth,
        parameters: [
          {
            name: "categoryId",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
          { name: "page", in: "query", schema: { type: "number" } },
          { name: "limit", in: "query", schema: { type: "number" } },
        ],
        responses: {
          200: {
            description: "Card types by category",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    cardTypes: {
                      type: "array",
                      items: { $ref: "#/components/schemas/CardType" },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: "Invalid categoryId",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: { invalid: { value: { code: "CARD_CATEGORY_ID_INVALID" } } },
              },
            },
          },
          404: {
            description: "Category not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: { notFound: { value: { code: "CARD_CATEGORY_NOT_FOUND" } } },
              },
            },
          },
          ...authErrorResponses,
          default: {
            description: "Error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/card-types/get-one": {
      get: {
        tags: ["Card Types"],
        summary: "Get card type details with priced, availability-checked tiers",
        description:
          "The endpoint to call when a user opens a card type's detail screen: tiers come back pre-priced for the caller's role (see CardTier) and each carries isAvailable. Sandbox: isAvailable is always true for tiers.",
        security: bearerAuth,
        parameters: [
          {
            name: "id",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Card type",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CardTypeWithTiers" },
              },
            },
          },
          400: {
            description: "Invalid id",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: { invalid: { value: { code: "CARD_TYPE_ID_INVALID" } } },
              },
            },
          },
          404: {
            description: "Card type not found or inactive",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: { notFound: { value: { code: "CARD_TYPE_NOT_FOUND" } } },
              },
            },
          },
          ...authErrorResponses,
          default: {
            description: "Error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/orders/checkout": {
      post: {
        tags: ["Orders"],
        summary: "Checkout cart",
        description:
          "Buys every item in the cart in one request. Either the whole cart is fulfilled — you get back the purchased card codes, the created order, and the account's new balance — or nothing is charged and you get a 409 explaining which line(s) couldn't be fulfilled; there's no partial checkout.\n\nExample request:\n```json\n{ \"items\": [{ \"tierId\": \"64f1a2b3c4d5e6f7a8b9c0d1\", \"quantity\": 2 }], \"checkoutKey\": \"b1e2c3d4-...\" }\n```\nExample success response:\n```json\n{ \"cards\": [{ \"serialNumber\": \"...\", \"code\": \"...\" }], \"order\": { \"_id\": \"...\", \"totalAmount\": 40 }, \"balance\": 460 }\n```\n`checkoutKey` should be a fresh unique value per checkout attempt (e.g. a UUID); reusing the same value on a retry safely returns the original result instead of charging twice.\n\nSandbox: a test mode is available where card stock/provider checks are relaxed and low balances are topped up automatically, so integrations can be tested end-to-end without real inventory or funds.",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CheckoutRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Checkout success (including idempotent replay of a prior identical checkoutKey)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CheckoutResponse" },
              },
            },
          },
          400: {
            description: "Validation error or insufficient balance (outside sandbox)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  checkoutKeyRequired: { value: { code: "CHECKOUT_KEY_REQUIRED" } },
                  itemsRequired: { value: { code: "CART_ITEMS_REQUIRED" } },
                  invalidTierId: { value: { code: "CARD_TIER_ID_INVALID" } },
                  invalidPrice: { value: { code: "CARD_TIER_PRICE_INVALID" } },
                  insufficientBalance: { value: { code: "USER_BALANCE_INSUFFICIENT" } },
                },
              },
            },
          },
          403: {
            description: "Account can't buy right now",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  inactive: { value: { code: "USER_INACTIVE" } },
                  cannotBuy: { value: { code: "USER_CANNOT_BUY" } },
                },
              },
            },
          },
          404: {
            description: "A tier in the cart no longer exists, or the user no longer exists",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  tierNotFound: { value: { code: "CARD_TIER_NOT_FOUND", tierId: "..." } },
                  userNotFound: { value: { code: "USER_NOT_FOUND" } },
                },
              },
            },
          },
          409: {
            description:
              "One or more cart lines couldn't be fully fulfilled — the whole checkout was cancelled and rolled back",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CheckoutCancelResponse" },
              },
            },
          },
          ...authErrorResponses,
          default: {
            description: "Error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/orders": {
      get: {
        tags: ["Orders"],
        summary: "List user orders",
        description: "Newest first. Cards are omitted from list items — fetch GET /orders/{id} for the redeemable card codes.",
        security: bearerAuth,
        parameters: [
          { name: "page", in: "query", schema: { type: "number" } },
          { name: "limit", in: "query", schema: { type: "number" } },
        ],
        responses: {
          200: {
            description: "Orders list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/OrdersListResponse" },
              },
            },
          },
          ...authErrorResponses,
          default: {
            description: "Error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/orders/{id}": {
      get: {
        tags: ["Orders"],
        summary: "Get order by id (with redeemable card codes)",
        security: bearerAuth,
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Order",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Order" },
              },
            },
          },
          400: {
            description: "Malformed id",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: { invalid: { value: { code: "CHECK_INVALID_CARD_TYPE_ID" } } },
              },
            },
          },
          404: {
            description: "No such order for this user",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: { notFound: { value: { code: "ORDER_NOT_FOUND" } } },
              },
            },
          },
          ...authErrorResponses,
          default: {
            description: "Error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/search/card-types": {
      get: {
        tags: ["Search"],
        summary: "Search card types",
        description: "Case-insensitive name match, whole query and each whitespace-split term OR'd together. Capped at 50 results.",
        security: bearerAuth,
        parameters: [
          {
            name: "query",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Search results",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/CardTypeSearchItem" },
                },
              },
            },
          },
          400: {
            description: "Missing or too-long query",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  required: { value: { code: "SEARCH_QUERY_REQUIRED" } },
                  tooLong: { value: { code: "SEARCH_QUERY_TOO_LONG" } },
                },
              },
            },
          },
          ...authErrorResponses,
          default: {
            description: "Error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/transactions": {
      get: {
        tags: ["Transactions"],
        summary: "List user transactions",
        security: bearerAuth,
        parameters: [
          {
            name: "type",
            in: "query",
            schema: { type: "string", enum: ["deposit", "purchase", "refund"] },
          },
          {
            name: "sortBy",
            in: "query",
            schema: { type: "string", enum: ["createdAt", "type", "amount"] },
            description: "Defaults to createdAt.",
          },
          {
            name: "sortOrder",
            in: "query",
            schema: { type: "string", enum: ["asc", "desc"] },
            description: "Defaults to desc.",
          },
          { name: "page", in: "query", schema: { type: "number" } },
          { name: "limit", in: "query", schema: { type: "number" } },
        ],
        responses: {
          200: {
            description: "Transactions list",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TransactionsListResponse",
                },
              },
            },
          },
          400: {
            description: "Invalid `type` filter",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: { invalid: { value: { code: "TRANSACTION_TYPE_INVALID" } } },
              },
            },
          },
          ...authErrorResponses,
          default: {
            description: "Error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/favorites": {
      get: {
        tags: ["Favorites"],
        summary: "List the current user's favorite card types",
        security: bearerAuth,
        responses: {
          200: {
            description: "Favorites list",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Favorite" },
                },
              },
            },
          },
          ...authErrorResponses,
          default: {
            description: "Error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      post: {
        tags: ["Favorites"],
        summary: "Add a card type to the current user's favorites",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { cardTypeId: { type: "string" } },
                required: ["cardTypeId"],
              },
            },
          },
        },
        responses: {
          201: {
            description: "Favorite created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Favorite" },
              },
            },
          },
          400: {
            description: "Invalid card type id",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  invalid: {
                    value: { code: "FAVORITE_CARD_TYPE_ID_INVALID" },
                  },
                },
              },
            },
          },
          404: {
            description: "Card type not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  notFound: { value: { code: "CARD_TYPE_NOT_FOUND" } },
                },
              },
            },
          },
          409: {
            description: "Already favorited",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  exists: { value: { code: "FAVORITE_EXISTS" } },
                },
              },
            },
          },
          ...authErrorResponses,
          default: {
            description: "Error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Favorites"],
        summary: "Remove a card type from the current user's favorites",
        security: bearerAuth,
        parameters: [
          {
            name: "cardTypeId",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Favorite deleted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  deleted: { value: { code: "FAVORITE_DELETED" } },
                },
              },
            },
          },
          400: {
            description: "Invalid card type id",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  invalid: {
                    value: { code: "FAVORITE_CARD_TYPE_ID_INVALID" },
                  },
                },
              },
            },
          },
          404: {
            description: "Favorite not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                examples: {
                  notFound: { value: { code: "FAVORITE_NOT_FOUND" } },
                },
              },
            },
          },
          ...authErrorResponses,
          default: {
            description: "Error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
  },
};

export default openApiSpec;
