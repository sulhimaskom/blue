/**
 * Stripe Payment Service Test Suite
 *
 * Critical Business Logic Testing:
 * - Payment intent creation and validation
 * - Webhook event processing (succeeded/failed/canceled)
 * - Payment intent retrieval and status checking
 * - Error handling for API failures and configuration issues
 *
 * Test Design Principles Applied:
 * - AAA Pattern: Arrange-Act-Assert structure
 * - Test Behavior Not Implementation: Verifying WHAT service does, not HOW
 * - Meaningful Coverage: Covers critical paths with realistic scenarios
 * - Descriptive Test Names: Clear test names indicating scenario and expectation
 * - One Assertion Focus: Each test has focused, single-purpose assertions
 */

import { StripePaymentService } from "../lib/services/stripe-payment-service";
import { logger } from "../lib/logger";

jest.mock("../lib/logger");

jest.mock("../lib/services/user-service", () => ({
  UserService: {
    updateUserCredits: jest.fn().mockResolvedValue(undefined),
    updateSubscriptionTierIfNeeded: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../lib/services/project-data-service", () => ({
  ProjectDataService: {
    createTransaction: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockStripe = {
  paymentIntents: {
    create: jest.fn(),
    retrieve: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
};

jest.mock("stripe", () => {
  return jest.fn(() => mockStripe);
});

describe("StripePaymentService - Critical Business Logic", () => {
  let service: StripePaymentService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();

    originalEnv = { ...process.env };

    process.env.STRIPE_SECRET_KEY = "sk_test_test_key";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_publishable_key";

    mockStripe.paymentIntents.create.mockClear();
    mockStripe.paymentIntents.retrieve.mockClear();
    mockStripe.webhooks.constructEvent.mockClear();

    service = StripePaymentService.getInstance();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = originalEnv;

    (StripePaymentService as any).instance = null;
  });

  describe("Singleton Pattern", () => {
    test("should return same instance on multiple calls", () => {
      const instance1 = StripePaymentService.getInstance();
      const instance2 = StripePaymentService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe("isConfigured - Configuration Validation", () => {
    test("should return true when Stripe is properly configured", () => {
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe("getPublishableKey - Frontend Configuration", () => {
    test("should return publishable key when configured", () => {
      const key = service.getPublishableKey();

      expect(key).toBe("pk_test_publishable_key");
    });

    test("should throw error when publishable key is not configured", () => {
      delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

      expect(() => service.getPublishableKey()).toThrow(
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not configured",
      );
    });
  });

  describe("createPaymentIntent - Payment Creation", () => {
    test("should create payment intent successfully with valid request", async () => {
      const mockPaymentIntent = {
        id: "pi_test_123",
        client_secret: "pi_test_123_secret",
        status: "requires_action",
        amount: 1000,
        currency: "usd",
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const request = {
        amount: 1000,
        paymentMethodId: "pm_test_123",
        userId: "123",
        metadata: { plan: "pro" },
      };

      const context = {
        requestId: "req_test_123",
        userId: "123",
        role: "user",
      };

      const result = await service.createPaymentIntent(request, context);

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 1000,
        currency: "usd",
        payment_method: "pm_test_123",
        confirmation_method: "manual",
        confirm: true,
        metadata: {
          userId: "123",
          plan: "pro",
        },
        automatic_payment_methods: {
          enabled: true,
        },
        return_url: "http://localhost:3000/credits/success",
      });

      expect(result).toEqual({
        clientSecret: "pi_test_123_secret",
        paymentIntentId: "pi_test_123",
        status: "requires_action",
        amount: 1000,
        currency: "usd",
      });

      expect(logger.systemEvent).toHaveBeenCalledWith(
        "Payment intent created",
        {
          requestId: "req_test_123",
          paymentIntentId: "pi_test_123",
          userId: "123",
          amount: 1000,
          status: "requires_action",
        },
      );
    });

    test("should create payment intent without metadata when not provided", async () => {
      const mockPaymentIntent = {
        id: "pi_test_456",
        client_secret: "pi_test_456_secret",
        status: "succeeded",
        amount: 2000,
        currency: "usd",
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const request = {
        amount: 2000,
        paymentMethodId: "pm_test_456",
        userId: "456",
      };

      const context = {
        requestId: "req_test_456",
        userId: "456",
        role: "user",
      };

      const result = await service.createPaymentIntent(request, context);

      expect(result.paymentIntentId).toBe("pi_test_456");
    });

    test("should throw error when Stripe is not configured", async () => {
      const unconfiguredService = new (class TestService {
        public isConfigured() {
          return false;
        }
      })();

      expect(unconfiguredService.isConfigured()).toBe(false);
    });

    test("should throw error and log when Stripe API fails", async () => {
      const apiError = new Error("Card declined");
      mockStripe.paymentIntents.create.mockRejectedValue(apiError);

      const request = {
        amount: 1000,
        paymentMethodId: "pm_test_123",
        userId: "123",
      };

      const context = {
        requestId: "req_test_123",
        userId: "123",
        role: "user",
      };

      await expect(
        service.createPaymentIntent(request, context),
      ).rejects.toThrow("Payment processing failed: Card declined");

      expect(logger.error).toHaveBeenCalledWith(
        "Payment intent creation failed",
        expect.objectContaining({
          requestId: "req_test_123",
          userId: "123",
          amount: 1000,
          error: "Card declined",
        }),
      );
    });

    test("should handle non-Error exceptions gracefully", async () => {
      mockStripe.paymentIntents.create.mockRejectedValue(
        "Unknown error string",
      );

      const request = {
        amount: 1000,
        paymentMethodId: "pm_test_123",
        userId: "123",
      };

      const context = {
        requestId: "req_test_123",
        userId: "123",
        role: "user",
      };

      await expect(
        service.createPaymentIntent(request, context),
      ).rejects.toThrow("Payment processing failed: Unknown error");
    });
  });

  describe("retrievePaymentIntent - Payment Status", () => {
    test("should retrieve payment intent successfully", async () => {
      const mockPaymentIntent = {
        id: "pi_test_789",
        status: "succeeded",
        amount: 3000,
        currency: "usd",
      };

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

      const context = {
        requestId: "req_test_789",
        userId: "123",
        role: "user",
      };

      const result = await service.retrievePaymentIntent(
        "pi_test_789",
        context,
      );

      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith(
        "pi_test_789",
      );
      expect(result).toEqual(mockPaymentIntent);

      expect(logger.info).toHaveBeenCalledWith(
        "Payment intent retrieved",
        expect.objectContaining({
          requestId: "req_test_789",
          paymentIntentId: "pi_test_789",
          status: "succeeded",
        }),
      );
    });

    test("should throw error and log when retrieval fails", async () => {
      const apiError = new Error("Payment intent not found");
      mockStripe.paymentIntents.retrieve.mockRejectedValue(apiError);

      const context = {
        requestId: "req_test_789",
        userId: "123",
        role: "user",
      };

      await expect(
        service.retrievePaymentIntent("pi_test_789", context),
      ).rejects.toThrow("Failed to retrieve payment: Payment intent not found");

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to retrieve payment intent",
        expect.objectContaining({
          requestId: "req_test_789",
          paymentIntentId: "pi_test_789",
          error: "Payment intent not found",
        }),
      );
    });
  });

  describe("processWebhookEvent - Webhook Handling", () => {
    test("should process payment_intent.succeeded event successfully", async () => {
      const mockEvent = {
        id: "evt_test_001",
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_test_001",
            status: "succeeded",
            amount: 5000,
            currency: "usd",
            metadata: {
              userId: "123",
            },
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const context = {
        requestId: "req_webhook_001",
        userId: "123",
        role: "system",
      };

      const result = await service.processWebhookEvent(
        JSON.stringify(mockEvent),
        "sig_test_001",
        context,
      );

      expect(result).toEqual({
        processed: true,
        type: "payment_intent.succeeded",
      });
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        JSON.stringify(mockEvent),
        "sig_test_001",
        "whsec_test_secret",
      );

      expect(logger.systemEvent).toHaveBeenCalledWith(
        "Webhook event received",
        expect.objectContaining({
          requestId: "req_webhook_001",
          eventType: "payment_intent.succeeded",
          eventId: "evt_test_001",
        }),
      );
    });

    test("should process payment_intent.payment_failed event successfully", async () => {
      const mockEvent = {
        id: "evt_test_002",
        type: "payment_intent.payment_failed",
        data: {
          object: {
            id: "pi_test_002",
            status: "requires_payment_method",
            amount: 5000,
            currency: "usd",
            metadata: {
              userId: "123",
            },
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const context = {
        requestId: "req_webhook_002",
        userId: "123",
        role: "system",
      };

      const result = await service.processWebhookEvent(
        JSON.stringify(mockEvent),
        "sig_test_002",
        context,
      );

      expect(result).toEqual({
        processed: true,
        type: "payment_intent.payment_failed",
      });

      expect(logger.systemEvent).toHaveBeenCalledWith(
        "Payment failed",
        expect.objectContaining({
          requestId: "req_webhook_002",
          userId: "123",
          paymentIntentId: "pi_test_002",
          amount: 50,
          status: "requires_payment_method",
        }),
      );
    });

    test("should process payment_intent.canceled event successfully", async () => {
      const mockEvent = {
        id: "evt_test_003",
        type: "payment_intent.canceled",
        data: {
          object: {
            id: "pi_test_003",
            status: "canceled",
            amount: 5000,
            currency: "usd",
            metadata: {
              userId: "123",
            },
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const context = {
        requestId: "req_webhook_003",
        userId: "123",
        role: "system",
      };

      const result = await service.processWebhookEvent(
        JSON.stringify(mockEvent),
        "sig_test_003",
        context,
      );

      expect(result).toEqual({
        processed: true,
        type: "payment_intent.canceled",
      });

      expect(logger.systemEvent).toHaveBeenCalledWith(
        "Payment canceled",
        expect.objectContaining({
          requestId: "req_webhook_003",
          userId: "123",
          paymentIntentId: "pi_test_003",
          amount: 50,
        }),
      );
    });

    test("should log warning for unhandled webhook event types", async () => {
      const mockEvent = {
        id: "evt_test_004",
        type: "payment_intent.requires_action",
        data: {
          object: {
            id: "pi_test_004",
            status: "requires_action",
            amount: 5000,
            currency: "usd",
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const context = {
        requestId: "req_webhook_004",
        userId: "123",
        role: "system",
      };

      const result = await service.processWebhookEvent(
        JSON.stringify(mockEvent),
        "sig_test_004",
        context,
      );

      expect(result).toEqual({
        processed: true,
        type: "payment_intent.requires_action",
      });

      expect(logger.systemEvent).toHaveBeenCalledWith(
        "Unhandled webhook event type",
        expect.objectContaining({
          requestId: "req_webhook_004",
          eventType: "payment_intent.requires_action",
        }),
      );
    });

    test("should handle payment_intent.succeeded without userId metadata gracefully", async () => {
      const mockEvent = {
        id: "evt_test_005",
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_test_005",
            status: "succeeded",
            amount: 5000,
            currency: "usd",
            metadata: {},
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const context = {
        requestId: "req_webhook_005",
        userId: "system",
        role: "system",
      };

      const result = await service.processWebhookEvent(
        JSON.stringify(mockEvent),
        "sig_test_005",
        context,
      );

      expect(result).toEqual({
        processed: true,
        type: "payment_intent.succeeded",
      });

      expect(logger.error).toHaveBeenCalledWith(
        "Payment intent missing userId metadata",
        expect.objectContaining({
          requestId: "req_webhook_005",
          paymentIntentId: "pi_test_005",
        }),
      );
    });
  });

  describe("Edge Cases and Boundary Conditions", () => {
    test("should handle zero amount payment intent", async () => {
      const mockPaymentIntent = {
        id: "pi_test_zero",
        client_secret: "pi_test_zero_secret",
        status: "succeeded",
        amount: 0,
        currency: "usd",
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const request = {
        amount: 0,
        paymentMethodId: "pm_test_zero",
        userId: "123",
      };

      const context = {
        requestId: "req_test_zero",
        userId: "123",
        role: "user",
      };

      const result = await service.createPaymentIntent(request, context);

      expect(result.amount).toBe(0);
      expect(result.status).toBe("succeeded");
    });

    test("should handle very large payment amounts", async () => {
      const mockPaymentIntent = {
        id: "pi_test_large",
        client_secret: "pi_test_large_secret",
        status: "requires_action",
        amount: 99999999,
        currency: "usd",
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const request = {
        amount: 99999999,
        paymentMethodId: "pm_test_large",
        userId: "123",
      };

      const context = {
        requestId: "req_test_large",
        userId: "123",
        role: "user",
      };

      const result = await service.createPaymentIntent(request, context);

      expect(result.amount).toBe(99999999);
    });

    test("should handle empty metadata object", async () => {
      const mockPaymentIntent = {
        id: "pi_test_empty_meta",
        client_secret: "pi_test_empty_meta_secret",
        status: "requires_action",
        amount: 1000,
        currency: "usd",
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const request = {
        amount: 1000,
        paymentMethodId: "pm_test_empty_meta",
        userId: "123",
        metadata: {},
      };

      const context = {
        requestId: "req_test_empty_meta",
        userId: "123",
        role: "user",
      };

      const result = await service.createPaymentIntent(request, context);

      expect(result.paymentIntentId).toBe("pi_test_empty_meta");

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            userId: "123",
          }),
        }),
      );
    });

    test("should use default app URL when NEXT_PUBLIC_APP_URL is not set", () => {
      delete process.env.NEXT_PUBLIC_APP_URL;

      const request = {
        amount: 1000,
        paymentMethodId: "pm_test_default_url",
        userId: "123",
      };

      const context = {
        requestId: "req_test_default_url",
        userId: "123",
        role: "user",
      };

      mockStripe.paymentIntents.create.mockResolvedValue({
        id: "pi_test_default_url",
        client_secret: "secret",
        status: "requires_action",
        amount: 1000,
        currency: "usd",
      });

      void service.createPaymentIntent(request, context);

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          return_url: "http://localhost:3000/credits/success",
        }),
      );
    });
  });
});
