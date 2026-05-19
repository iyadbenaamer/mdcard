const bearerAuth = [{ bearerAuth: [] }];

export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "MDCard API",
    version: "1.0.0",
    description:
      "User-facing endpoints (routes without verifyAdmin). Use Bearer token in the Authorization header. Some endpoints behave differently in sandbox mode; see endpoint notes.",
  },
  servers: [
    {
      url: "https://api.mdcard.com.ly",
      description: "Production",
    },
    {
      url: "https://api-sandbox.mdcard.com.ly",
      description: "Sandbox",
    },
  ],
  tags: [
    { name: "Auth", description: "Authentication and verification" },
    { name: "Users", description: "User profile" },
    { name: "Card Categories", description: "Card categories" },
    { name: "Card Types", description: "Card types" },
    { name: "Card Tiers", description: "Card tiers" },
    { name: "Cards", description: "Orders and checkout" },
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
          buyPrice: { type: "number", nullable: true },
          buyPriceUsd: { type: "number", nullable: true },
          sellPrice: { type: "number" },
          bambooProductId: { type: "string" },
          value: { type: "number", nullable: true },
          isActive: { type: "boolean" },
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
          fulfillmentSource: {
            type: "string",
            enum: ["local", "bamboo"],
          },
          image: { type: "string", nullable: true },
          printImage: { type: "string", nullable: true },
          redeemFormat: { type: "string", nullable: true },
          showExpiryDateDay: { type: "boolean" },
          notes: { type: "string", nullable: true },
          order: { type: "number" },
          isActive: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
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
          provider: { type: "string", enum: ["local", "bamboo"] },
          status: { type: "string", enum: ["available", "sold"] },
          soldTo: { type: "string", nullable: true },
          soldAt: { type: "string", format: "date-time", nullable: true },
          externalSerialNumber: { type: "string", nullable: true },
          externalOrderId: { type: "string", nullable: true },
          externalStatus: { type: "string", nullable: true },
        },
      },
      OrderItem: {
        type: "object",
        properties: {
          tierId: { type: "string" },
          title: { type: "string" },
          price: { type: "number" },
          quantity: { type: "number" },
          provider: { type: "string" },
          externalOrderId: { type: "string", nullable: true },
          cards: { type: "array", items: { type: "string" } },
        },
      },
      Order: {
        type: "object",
        properties: {
          _id: { type: "string" },
          userId: { type: "string" },
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
          isActive: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    "/signup": {
      post: {
        tags: ["Auth"],
        summary: "Sign up",
        description:
          "Create a new user account. Sandbox: returns verificationCode in the response and does not send SMS. New users start with balance 1000 in sandbox.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  phone: { type: "string", example: "0912345678" },
                  password: { type: "string" },
                },
                required: ["name", "phone", "password"],
              },
            },
          },
        },
        responses: {
          201: {
            description: "User created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthCodeResponse" },
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
    "/check_phone_availability/register/{phone}": {
      get: {
        tags: ["Auth"],
        summary: "Check phone availability for register",
        parameters: [
          {
            name: "phone",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Availability result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    code: { type: "string" },
                  },
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
    "/check_phone_availability/reset_password/{phone}": {
      get: {
        tags: ["Auth"],
        summary: "Check phone availability for reset password",
        parameters: [
          {
            name: "phone",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Availability result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    code: { type: "string" },
                  },
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
                  password: { type: "string" },
                  rememberMe: { type: "boolean" },
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
    "/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout",
        security: bearerAuth,
        responses: {
          200: {
            description: "Logout success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { success: { type: "boolean" } },
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
    "/verify_access": {
      get: {
        tags: ["Auth"],
        summary: "Verify access token",
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
    "/send_verification_code": {
      post: {
        tags: ["Auth"],
        summary: "Send verification code",
        description:
          "Send a verification code for reset_password or verify_account. Sandbox: returns verificationCode in the response and does not send SMS.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: ["reset_password", "verify_account"],
                  },
                  phone: { type: "string", example: "0912345678" },
                },
                required: ["type", "phone"],
              },
            },
          },
        },
        responses: {
          200: {
            description: "Code sent",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthCodeResponse" },
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
    "/verify_account": {
      post: {
        tags: ["Auth"],
        summary: "Verify account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  phone: { type: "string", example: "0912345678" },
                  code: { type: "string" },
                },
                required: ["phone", "code"],
              },
            },
          },
        },
        responses: {
          200: {
            description: "Account verified",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    isVerified: { type: "boolean" },
                    accessToken: { type: "string" },
                  },
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
    "/verify_reset_password": {
      post: {
        tags: ["Auth"],
        summary: "Verify reset password code",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  phone: { type: "string", example: "0912345678" },
                  code: { type: "string" },
                },
                required: ["phone", "code"],
              },
            },
          },
        },
        responses: {
          200: {
            description: "Reset token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ResetTokenResponse" },
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
      get: {
        tags: ["Auth"],
        summary: "Verify reset password token",
        parameters: [
          {
            name: "token",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Reset token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ResetTokenResponse" },
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
    "/reset_password/{token}": {
      post: {
        tags: ["Auth"],
        summary: "Reset password",
        parameters: [
          {
            name: "token",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  password: { type: "string" },
                },
                required: ["password"],
              },
            },
          },
        },
        responses: {
          200: {
            description: "Password reset",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    isVerified: { type: "boolean" },
                    accessToken: { type: "string" },
                  },
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
    "/user": {
      get: {
        tags: ["Users"],
        summary: "Get user profile",
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
            description: "User profile",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserProfileResponse" },
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
        summary: "List card tiers",
        security: bearerAuth,
        parameters: [
          { name: "isActive", in: "query", schema: { type: "string" } },
          { name: "typeId", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "number" } },
          { name: "limit", in: "query", schema: { type: "number" } },
        ],
        responses: {
          200: {
            description: "Card tiers",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    {
                      type: "array",
                      items: { $ref: "#/components/schemas/CardTier" },
                    },
                    {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        categoryName: { type: "string" },
                        tiers: {
                          type: "array",
                          items: { $ref: "#/components/schemas/CardTier" },
                        },
                      },
                    },
                  ],
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
          { name: "isActive", in: "query", schema: { type: "string" } },
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
        description:
          "For non-admin users, isActive must be provided in the query.",
        security: bearerAuth,
        parameters: [
          {
            name: "categoryId",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
          { name: "isActive", in: "query", schema: { type: "string" } },
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
    "/card-types/get_one": {
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
    "/cards/checkout": {
      post: {
        tags: ["Cards"],
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
    "/cards/orders": {
      get: {
        tags: ["Cards"],
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
    "/cards/orders/{id}": {
      get: {
        tags: ["Cards"],
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
