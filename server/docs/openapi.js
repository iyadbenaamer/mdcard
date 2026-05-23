const bearerAuth = [{ bearerAuth: [] }];
const authErrorResponses = {
  401: {
    description: "Token expired",
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ErrorResponse" },
        examples: {
          tokenExpired: { value: { code: "AUTH_TOKEN_EXPIRED" } },
        },
      },
    },
  },
  403: {
    description: "Authentication required or token invalid",
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ErrorResponse" },
        examples: {
          loginRequired: { value: { code: "AUTH_LOGIN_REQUIRED" } },
          tokenInvalid: { value: { code: "AUTH_TOKEN_INVALID" } },
        },
      },
    },
  },
};

export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "MD Card API",
    version: "1.0.0",
    description:
      "User-facing endpoints (routes without verifyAdmin). Use Bearer token in the Authorization header. Some endpoints behave differently in sandbox mode; see endpoint notes.",
  },
  servers: [
    { url: "http://localhost:5000/api", description: "Local development" },
  ],
  tags: [
    { name: "Auth", description: "Authentication and verification" },
    { name: "Users", description: "User profile" },
    { name: "Card Categories", description: "Card categories" },
    { name: "Card Types", description: "Card types" },
    { name: "Card Tiers", description: "Card tiers" },
    { name: "Orders", description: "Orders and checkout" },
    { name: "Search", description: "Search endpoints" },
    { name: "Transactions", description: "User transactions" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
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
      AuthCodeResponse: {
        type: "object",
        properties: {
          code: { type: "string" },
          verificationCode: { type: "string" },
        },
        required: ["code"],
      },
      VerificationRequiredResponse: {
        type: "object",
        properties: {
          code: { type: "string" },
          isVerified: { type: "boolean" },
          verificationCode: { type: "string" },
        },
        required: ["code", "isVerified"],
      },
      VerifyAccessResponse: {
        type: "object",
        properties: {
          valid: { type: "boolean" },
          role: { type: "string", enum: ["user", "admin"] },
          id: { type: "string" },
        },
        required: ["valid", "role", "id"],
      },
      ResetTokenResponse: {
        type: "object",
        properties: {
          token: { type: "string" },
        },
        required: ["token"],
      },
      Profile: {
        type: "object",
        properties: {
          id: { type: "string" },
          phone: { type: "string" },
          name: { type: "string" },
          balance: { type: "number" },
          isActive: { type: "boolean" },
          canBuy: { type: "boolean" },
          canSendCode: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          profile: { $ref: "#/components/schemas/Profile" },
          support: { type: "string" },
          isVerified: { type: "boolean" },
          accessToken: { type: "string" },
        },
        required: ["profile", "isVerified", "accessToken"],
      },
      UserProfileResponse: {
        type: "object",
        properties: {
          profile: { $ref: "#/components/schemas/Profile" },
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
          count: { type: "number" },
        },
      },
      CardTier: {
        type: "object",
        properties: {
          _id: { type: "string" },
          typeId: { type: "string" },
          title: { type: "string" },
          order: { type: "number" },
        },
      },
      CardTierAvailabilityItem: {
        type: "object",
        properties: {
          tierId: { type: "string" },
          requested: { type: "number" },
          available: { type: "number" },
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
          redeemFormat: { type: "string", nullable: true },
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
                items: {
                  allOf: [
                    { $ref: "#/components/schemas/CardTier" },
                    {
                      type: "object",
                      properties: {
                        isAvailable: { type: "boolean" },
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      },
      Card: {
        type: "object",
        properties: {
          _id: { type: "string" },
          tierId: { type: "string" },
          serialNumber: { type: "string" },
          code: { type: "string" },
          pin: { type: "string", nullable: true },
          expiryDate: { type: "string", format: "date-time", nullable: true },
        },
      },
      OrderItem: {
        type: "object",
        properties: {
          tierId: { type: "string" },
          title: { type: "string" },
          price: { type: "number" },
          quantity: { type: "number" },
          cards: { type: "array", items: { type: "string" } },
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
                quantity: { type: "number", minimum: 1 },
              },
              required: ["tierId"],
            },
          },
        },
        required: ["items"],
      },
      CheckoutResponse: {
        type: "object",
        properties: {
          cards: {
            type: "array",
            items: { $ref: "#/components/schemas/Card" },
          },
          order: { $ref: "#/components/schemas/Order" },
          balance: { type: "number" },
          partialFailure: { type: "boolean" },
          failedItems: { type: "array", items: { type: "object" } },
        },
        required: ["cards", "order", "balance"],
      },
      Pagination: {
        type: "object",
        properties: {
          page: { type: "number" },
          limit: { type: "number" },
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
      Transaction: {
        type: "object",
        properties: {
          _id: { type: "string" },
          type: { type: "string", enum: ["deposit", "purchase", "refund"] },
          amount: { type: "number" },
          balanceBefore: { type: "number" },
          balanceAfter: { type: "number" },
          orderId: { type: "object" },
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
    "/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        description:
          "Sandbox: if verification is required, the response includes verificationCode and no SMS is sent.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  phone: { type: "string", example: "0912345678" },
                  password: { type: "string", example: "string" },
                  rememberMe: {
                    type: "boolean",
                    description:
                      "Keep the user logged in for a longer period 90 days instead of the default session duration 14 days.",
                  },
                },
                required: ["phone", "password"],
              },
            },
          },
        },
        responses: {
          200: {
            description: "Login success",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" },
              },
            },
          },
          401: {
            description: "Verification required",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/VerificationRequiredResponse",
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
    "/verify-access": {
      get: {
        tags: ["Auth"],
        summary: "Verify access token",
        description:
          "Check if the provided access token is valid and get user info.",
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
        summary: "Get user profile",
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
        summary: "Update user password",
        security: bearerAuth,
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  password: { type: "string" },
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
            description: "Card categories",
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
    "/card-tiers/availability": {
      post: {
        tags: ["Card Tiers"],
        summary: "Check tier availability",
        description:
          "Sandbox: availability always equals requested quantity (no local stock check).",
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
        description: "Returns active card types for non-admin users.",
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
        summary: "Get card type details",
        description:
          "Returns a card type with tiers. Sandbox: isAvailable is always true for tiers.",
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
          "Sandbox: does not check local stock or call Bamboo, generates 12-digit codes, and auto-topups +1000 on insufficient balance (a deposit transaction is recorded).",
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
            description: "Checkout success",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CheckoutResponse" },
              },
            },
          },
          400: {
            description: "Insufficient balance or validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
        summary: "Get order by id",
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
          { name: "type", in: "query", schema: { type: "string" } },
          { name: "sortBy", in: "query", schema: { type: "string" } },
          { name: "sortOrder", in: "query", schema: { type: "string" } },
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
