import { StripePaymentService } from "../../lib/services/stripe-payment-service";
import type { RequestContext } from "../../lib/services/user-service";
import { logger } from "../../lib/logger";

// Mock Stripe library
jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  }));
});

// Mock dependencies
jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    systemEvent: jest.fn(),
    serviceError: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock("../../lib/services/retry-service", () => ({
  retryService: {
    executeWithRetry: jest.fn(async (fn: any) => await fn()),
    isRetryableError: jest.fn(() => true),
    createErrorFilter: jest.fn().mockReturnValue(() => true),
  },
  RETRY_CONFIGS: {
    STANDARD: { maxRetries: 3, baseDelay: 100 },
  },
}));

jest.mock("@/lib/services/user-service");
jest.mock("@/lib/services/project-data-service");
jest.mock("@/lib/constants", () => ({
  CREDIT_RULES: {
    CONVERSION_RATE: 100, // 1 USD = 100 credits
  },
}));

describe("StripePaymentService", () => {
  let service: StripePaymentService;
  let mockStripe: any;
  const mockRequestContext: RequestContext = {
    requestId: "test-request-id",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance to ensure fresh initialization
    (StripePaymentService as any).instance = undefined;

    // Set required environment variables
    process.env.STRIPE_SECRET_KEY = "sk_test_mock_key";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_mock_secret";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_mock_key";

    // Get service instance
    service = StripePaymentService.getInstance();

    // Trigger initialization to set up Stripe mock
    service.initialize();

    // Get actual Stripe instance that service is using
    // Access private property using type assertion
    mockStripe = (service as any).stripe;
  });

  afterEach(() => {
    // Reset singleton instance after each test
    (StripePaymentService as any).instance = undefined;
    // Restore environment variables
    process.env.STRIPE_SECRET_KEY = "sk_test_mock_key";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_mock_secret";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_mock_key";
  });

  describe("Singleton Pattern", () => {
    test("should return same instance on multiple calls", () => {
      const instance1 = StripePaymentService.getInstance();
      const instance2 = StripePaymentService.getInstance();
      expect(instance1).toBe(instance2);
    });

    test("should initialize Stripe with secret key", () => {
      expect(mockStripe).toBeDefined();
      expect(mockStripe.paymentIntents).toBeDefined();
      expect(mockStripe.webhooks).toBeDefined();
    });
  });

  describe("Initialization", () => {
    test("should initialize with STRIPE_SECRET_KEY configured", () => {
      const instance = StripePaymentService.getInstance();
      expect(instance).toBeDefined();
      expect(instance.isConfigured()).toBe(true);
    });

    test("should return correct publishable key", () => {
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_123";
      expect(service.getPublishableKey()).toBe("pk_test_123");
    });

    test("should throw error when publishable key not configured", () => {
      delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      expect(() => service.getPublishableKey()).toThrow(
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not configured",
      );
    });
  });

  describe("createPaymentIntent", () => {
    test("should create payment intent successfully", async () => {
      const paymentIntentRequest = {
        amount: 1000, // $10.00 in cents
        paymentMethodId: "pm_test_123",
        userId: "123",
        metadata: { customField: "test" },
      };

      const mockPaymentIntent = {
        id: "pi_test_123",
        client_secret: "pi_test_123_secret",
        status: "requires_payment_method",
        amount: 1000,
        currency: "usd",
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await service.createPaymentIntent(
        paymentIntentRequest,
        mockRequestContext,
      );
      expect(logger.systemEvent).toHaveBeenCalledWith(
        "Payment intent created",
        expect.objectContaining({
          paymentIntentId: "pi_test_123",
          userId: "123",
          amount: 1000,
        }),
      );
      expect(result).toEqual({
        clientSecret: "pi_test_123_secret",
        paymentIntentId: "pi_test_123",
        status: "requires_payment_method",
        amount: 1000,
        currency: "usd",
      });
    });

    test("should throw error when Stripe not configured", async () => {
      // Reset singleton instance and remove STRIPE_SECRET_KEY
      const originalStripeSecretKey = process.env.STRIPE_SECRET_KEY;
      (StripePaymentService as any).instance = undefined;
      delete process.env.STRIPE_SECRET_KEY;

      // Create a new service instance
      const unconfiguredService = StripePaymentService.getInstance();

      await expect(
        unconfiguredService.createPaymentIntent(
          { amount: 1000, paymentMethodId: "pm_test", userId: "123" },
          mockRequestContext,
        ),
      ).rejects.toThrow("STRIPE_SECRET_KEY is not configured");

      // Restore environment variable
      process.env.STRIPE_SECRET_KEY = originalStripeSecretKey;
      (StripePaymentService as any).instance = undefined;
    });

    test("should handle payment intent creation failure", async () => {
      const paymentIntentRequest = {
        amount: 1000,
        paymentMethodId: "pm_test_123",
        userId: "123",
      };

      const error = new Error("Card declined");
      mockStripe.paymentIntents.create.mockRejectedValue(error);

      await expect(
        service.createPaymentIntent(
          paymentIntentRequest,
          mockRequestContext,
        ),
      ).rejects.toThrow("Payment processing failed: Card declined");

      expect(logger.error).toHaveBeenCalledWith(
        "Payment intent creation failed",
        expect.objectContaining({
          userId: "123",
          error: "Card declined",
        }),
      );
    });

    test("should include idempotency key in metadata", async () => {
      const paymentIntentRequest = {
        amount: 1000,
        paymentMethodId: "pm_test_123",
        userId: "123",
      };

      mockStripe.paymentIntents.create.mockResolvedValue({
        id: "pi_test_123",
        client_secret: "pi_test_123_secret",
        status: "requires_payment_method",
        amount: 1000,
        currency: "usd",
      });

      const { retryService } = require("@/lib/services/retry-service");
      retryService.executeWithRetry.mockImplementation(
        async (fn: any) => await fn(),
      );

      await service.createPaymentIntent(
        paymentIntentRequest,
        mockRequestContext,
      );

      const createCall = mockStripe.paymentIntents.create.mock.calls[0][0];
      expect(createCall.metadata.idempotencyKey).toMatch(
        /^payment_123_\d+$/,
      );
    });

    test("should merge custom metadata with required fields", async () => {
      const paymentIntentRequest = {
        amount: 1000,
        paymentMethodId: "pm_test_123",
        userId: "123",
        metadata: { plan: "pro", billingCycle: "monthly" },
      };

      mockStripe.paymentIntents.create.mockResolvedValue({
        id: "pi_test_123",
        client_secret: "pi_test_123_secret",
        status: "requires_payment_method",
        amount: 1000,
        currency: "usd",
      });

      const { retryService } = require("@/lib/services/retry-service");
      retryService.executeWithRetry.mockImplementation(
        async (fn: any) => await fn(),
      );

      await service.createPaymentIntent(
        paymentIntentRequest,
        mockRequestContext,
      );

      const createCall = mockStripe.paymentIntents.create.mock.calls[0][0];
      expect(createCall.metadata.plan).toBe("pro");
      expect(createCall.metadata.billingCycle).toBe("monthly");
      expect(createCall.metadata.userId).toBe("123");
    });
  });

  describe("processWebhookEvent", () => {
    test("should process payment_intent.succeeded event", async () => {
      const payload = JSON.stringify({
        id: "evt_test_123",
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_test_123",
            status: "succeeded",
            amount: 1000,
            currency: "usd",
            metadata: { userId: "123" },
          },
        },
      });

      const signature = "t_test_signature";

      mockStripe.webhooks.constructEvent.mockReturnValue({
        id: "evt_test_123",
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_test_123",
            status: "succeeded",
            amount: 1000,
            currency: "usd",
            metadata: { userId: "123" },
          },
        },
      });

      // Mock service methods
      const { UserService } = await import("../../lib/services/user-service");
      const { ProjectDataService } =
        await import("../../lib/services/project-data-service");

      UserService.updateUserCredits = jest.fn().mockResolvedValue(undefined);
      UserService.updateSubscriptionTierIfNeeded = jest
        .fn()
        .mockResolvedValue(undefined);
      ProjectDataService.createTransaction = jest
        .fn()
        .mockResolvedValue(undefined);

      const result = await service.processWebhookEvent(
        payload,
        signature,
        mockRequestContext,
      );

      expect(logger.systemEvent).toHaveBeenCalledWith(
        "Payment processed successfully",
        expect.objectContaining({
          userId: "123",
          paymentIntentId: "pi_test_123",
          creditsAdded: 1,
        }),
      );
      expect(result).toEqual({ processed: true, type: "payment_intent.succeeded" });
    });

    test("should process payment_intent.payment_failed event", async () => {
      const payload = JSON.stringify({
        id: "evt_test_456",
        type: "payment_intent.payment_failed",
        data: {
          object: {
            id: "pi_test_456",
            status: "requires_payment_method",
            amount: 1000,
            currency: "usd",
            metadata: { userId: "123" },
          },
        },
      });

      const signature = "t_test_signature";

      mockStripe.webhooks.constructEvent.mockReturnValue({
        id: "evt_test_456",
        type: "payment_intent.payment_failed",
        data: {
          object: {
            id: "pi_test_456",
            status: "requires_payment_method",
            amount: 1000,
            currency: "usd",
            metadata: { userId: "123" },
          },
        },
      });

      const result = await service.processWebhookEvent(
        payload,
        signature,
        mockRequestContext,
      );

      expect(logger.systemEvent).toHaveBeenCalledWith("Payment failed", expect.any(Object));
      expect(result).toEqual({
        processed: true,
        type: "payment_intent.payment_failed",
      });
    });

    test("should process payment_intent.canceled event", async () => {
      const payload = JSON.stringify({
        id: "evt_test_789",
        type: "payment_intent.canceled",
        data: {
          object: {
            id: "pi_test_789",
            status: "canceled",
            amount: 1000,
            currency: "usd",
            metadata: { userId: "123" },
          },
        },
      });

      const signature = "t_test_signature";

      mockStripe.webhooks.constructEvent.mockReturnValue({
        id: "evt_test_789",
        type: "payment_intent.canceled",
        data: {
          object: {
            id: "pi_test_789",
            status: "canceled",
            amount: 1000,
            currency: "usd",
            metadata: { userId: "123" },
          },
        },
      });

      const result = await service.processWebhookEvent(
        payload,
        signature,
        mockRequestContext,
      );

      expect(logger.systemEvent).toHaveBeenCalledWith(
        "Payment canceled",
        expect.any(Object),
      );
      expect(result).toEqual({
        processed: true,
        type: "payment_intent.canceled",
      });
    });

    test("should log unhandled webhook event type", async () => {
      const payload = JSON.stringify({
        id: "evt_test_unknown",
        type: "unknown.event.type",
        data: { object: { id: "pi_test_unknown" } },
      });

      const signature = "t_test_signature";

      mockStripe.webhooks.constructEvent.mockReturnValue({
        id: "evt_test_unknown",
        type: "unknown.event.type",
        data: { object: { id: "pi_test_unknown" } },
      });

      const result = await service.processWebhookEvent(
        payload,
        signature,
        mockRequestContext,
      );

      expect(logger.systemEvent).toHaveBeenCalledWith(
        "Unhandled webhook event type",
        expect.objectContaining({
          eventType: "unknown.event.type",
        }),
      );
      expect(result).toEqual({
        processed: true,
        type: "unknown.event.type",
      });
    });

    test("should throw error when Stripe not configured", async () => {
      const originalStripeSecretKey = process.env.STRIPE_SECRET_KEY;
      (StripePaymentService as any).instance = undefined;
      delete process.env.STRIPE_SECRET_KEY;

      const unconfiguredService = StripePaymentService.getInstance();

      await expect(
        unconfiguredService.processWebhookEvent(
          "{}",
          "signature",
          mockRequestContext,
        ),
      ).rejects.toThrow("STRIPE_SECRET_KEY is not configured");

      process.env.STRIPE_SECRET_KEY = originalStripeSecretKey;
      (StripePaymentService as any).instance = undefined;
    });

    test("should throw error when webhook secret not configured", async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;

      await expect(
        service.processWebhookEvent(
          "{}",
          "signature",
          mockRequestContext,
        ),
      ).rejects.toThrow("Webhook secret not configured");
    });

    test("should handle webhook processing errors gracefully", async () => {
      const payload = "{}";
      const signature = "invalid_signature";

      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      await expect(
        service.processWebhookEvent(payload, signature, mockRequestContext),
      ).rejects.toThrow("Webhook processing failed: Invalid signature");

      expect(logger.serviceError).toHaveBeenCalledWith(
        "StripePaymentService",
        "Webhook processing failed",
        expect.objectContaining({
          requestId: "test-request-id",
          error: "Invalid signature",
        }),
      );
    });

    test("should handle missing userId in payment_intent.succeeded", async () => {
      const payload = JSON.stringify({
        id: "evt_test_missing_user",
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_test_missing",
            status: "succeeded",
            amount: 1000,
            currency: "usd",
            metadata: {},
          },
        },
      });

      const signature = "t_test_signature";

      mockStripe.webhooks.constructEvent.mockReturnValue({
        id: "evt_test_missing_user",
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_test_missing",
            status: "succeeded",
            amount: 1000,
            currency: "usd",
            metadata: {},
          },
        },
      });

      const result = await service.processWebhookEvent(
        payload,
        signature,
        mockRequestContext,
      );

      expect(logger.error).toHaveBeenCalledWith(
        "Payment intent missing userId metadata",
        expect.objectContaining({
          paymentIntentId: "pi_test_missing",
        }),
      );
      expect(result).toEqual({
        processed: true,
        type: "payment_intent.succeeded",
      });
    });
  });

  describe("retrievePaymentIntent", () => {
    test("should retrieve payment intent successfully", async () => {
      const paymentIntentId = "pi_test_123";

      const mockPaymentIntent = {
        id: paymentIntentId,
        status: "succeeded",
        amount: 1000,
        currency: "usd",
      };

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

      const result = await service.retrievePaymentIntent(
        paymentIntentId,
        mockRequestContext,
      );

      expect(logger.info).toHaveBeenCalledWith(
        "Payment intent retrieved",
        expect.objectContaining({
          paymentIntentId,
          status: "succeeded",
        }),
      );
      expect(result).toEqual(mockPaymentIntent);
    });

    test("should throw error when Stripe not configured", async () => {
      const originalStripeSecretKey = process.env.STRIPE_SECRET_KEY;
      (StripePaymentService as any).instance = undefined;
      delete process.env.STRIPE_SECRET_KEY;

      const unconfiguredService = StripePaymentService.getInstance();

      await expect(
        unconfiguredService.retrievePaymentIntent("pi_test", mockRequestContext),
      ).rejects.toThrow("STRIPE_SECRET_KEY is not configured");

      process.env.STRIPE_SECRET_KEY = originalStripeSecretKey;
      (StripePaymentService as any).instance = undefined;
    });

    test("should handle payment intent retrieval failure", async () => {
      const paymentIntentId = "pi_nonexistent";

      const error = new Error("Payment intent not found");
      mockStripe.paymentIntents.retrieve.mockRejectedValue(error);

      await expect(
        service.retrievePaymentIntent(paymentIntentId, mockRequestContext),
      ).rejects.toThrow("Failed to retrieve payment: Payment intent not found");

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to retrieve payment intent",
        expect.objectContaining({
          paymentIntentId,
          error: "Payment intent not found",
        }),
      );
    });
  });

  describe("isConfigured", () => {
    test("should return true when properly configured", () => {
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    test("should handle zero amount payment intent", async () => {
      const paymentIntentRequest = {
        amount: 0,
        paymentMethodId: "pm_test_123",
        userId: "123",
      };

      const mockPaymentIntent = {
        id: "pi_test_zero",
        client_secret: "pi_test_zero_secret",
        status: "succeeded",
        amount: 0,
        currency: "usd",
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await service.createPaymentIntent(
        paymentIntentRequest,
        mockRequestContext,
      );

      expect(result.amount).toBe(0);
      expect(result.paymentIntentId).toBe("pi_test_zero");
    });

    test("should handle large amount payment intent", async () => {
      const paymentIntentRequest = {
        amount: 99999999, // $999,999.99
        paymentMethodId: "pm_test_large",
        userId: "123",
      };

      mockStripe.paymentIntents.create.mockResolvedValue({
        id: "pi_test_large",
        client_secret: "pi_test_large_secret",
        status: "requires_payment_method",
        amount: 99999999,
        currency: "usd",
      });

      const result = await service.createPaymentIntent(
        paymentIntentRequest,
        mockRequestContext,
      );

      expect(result.amount).toBe(99999999);
    });

    test("should handle empty metadata object", async () => {
      const paymentIntentRequest = {
        amount: 1000,
        paymentMethodId: "pm_test",
        userId: "123",
        metadata: {},
      };

      const mockPaymentIntent = {
        id: "pi_test",
        client_secret: "pi_test_secret",
        status: "requires_payment_method",
        amount: 1000,
        currency: "usd",
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await service.createPaymentIntent(
        paymentIntentRequest,
        mockRequestContext,
      );

      expect(result).toBeDefined();
      expect(result.paymentIntentId).toBe("pi_test");
    });

    test("should handle malformed webhook payload", async () => {
      const payload = "invalid json";
      const signature = "t_test_signature";

      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error("Invalid payload");
      });

      await expect(
        service.processWebhookEvent(payload, signature, mockRequestContext),
      ).rejects.toThrow("Webhook processing failed");
    });
  });
});
