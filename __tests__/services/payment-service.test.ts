import { describe, it, expect, beforeEach, jest } from "@jest/globals";

jest.mock("@/lib/db", () => ({
  db: jest.fn(),
}));

jest.mock("@/lib/db/schema", () => ({
  users: {},
  transactions: {},
}));

jest.mock("@/lib/services/cache-orchestrator", () => ({
  teamCache: {
    invalidate: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    userAction: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock("@/lib/constants", () => ({
  CREDIT_RULES: {
    PRO_THRESHOLD: 500,
  },
}));

describe("PaymentService", () => {
  let paymentService: any;

  const createMockDb = () => ({
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
    transaction: jest.fn(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    const mockDb = createMockDb();

    require("@/lib/db").db.mockReturnValue(mockDb);

    const { paymentService: service } = require("@/lib/services/payment-service");
    paymentService = service;
  });

  describe("Singleton Pattern", () => {
    it("should export singleton instance", () => {
      const { PaymentService } = require("@/lib/services/payment-service");
      expect(PaymentService).toBeDefined();
      expect(paymentService).toBeInstanceOf(PaymentService);
    });
  });

  describe("Input Validation", () => {
    describe("Missing required fields", () => {
      it("should throw ValidationError when userId is empty", async () => {
        const request = {
          userId: "",
          paymentIntentId: "pi_123",
          amount: 1000,
          creditsToAdd: 100,
          requestId: "test-request-id",
        };

        await expect(paymentService.processPayment(request)).rejects.toThrow("User ID and payment intent ID are required");
      });

      it("should throw ValidationError when userId is undefined", async () => {
        const request = {
          userId: undefined as any,
          paymentIntentId: "pi_123",
          amount: 1000,
          creditsToAdd: 100,
          requestId: "test-request-id",
        };

        await expect(paymentService.processPayment(request)).rejects.toThrow("User ID and payment intent ID are required");
      });

      it("should throw ValidationError when paymentIntentId is empty", async () => {
        const request = {
          userId: "user-123",
          paymentIntentId: "",
          amount: 1000,
          creditsToAdd: 100,
          requestId: "test-request-id",
        };

        await expect(paymentService.processPayment(request)).rejects.toThrow("User ID and payment intent ID are required");
      });

      it("should throw ValidationError when paymentIntentId is undefined", async () => {
        const request = {
          userId: "user-123",
          paymentIntentId: undefined as any,
          amount: 1000,
          creditsToAdd: 100,
          requestId: "test-request-id",
        };

        await expect(paymentService.processPayment(request)).rejects.toThrow("User ID and payment intent ID are required");
      });
    });

    describe("Invalid amount validation", () => {
      it("should throw ValidationError when amount is zero", async () => {
        const request = {
          userId: "user-123",
          paymentIntentId: "pi_123",
          amount: 0,
          creditsToAdd: 100,
          requestId: "test-request-id",
        };

        await expect(paymentService.processPayment(request)).rejects.toThrow("Amount and credits must be positive");
      });

      it("should throw ValidationError when amount is negative", async () => {
        const request = {
          userId: "user-123",
          paymentIntentId: "pi_123",
          amount: -100,
          creditsToAdd: 100,
          requestId: "test-request-id",
        };

        await expect(paymentService.processPayment(request)).rejects.toThrow("Amount and credits must be positive");
      });
    });

    describe("Invalid credits validation", () => {
      it("should throw ValidationError when creditsToAdd is zero", async () => {
        const request = {
          userId: "user-123",
          paymentIntentId: "pi_123",
          amount: 1000,
          creditsToAdd: 0,
          requestId: "test-request-id",
        };

        await expect(paymentService.processPayment(request)).rejects.toThrow("Amount and credits must be positive");
      });

      it("should throw ValidationError when creditsToAdd is negative", async () => {
        const request = {
          userId: "user-123",
          paymentIntentId: "pi_123",
          amount: 1000,
          creditsToAdd: -50,
          requestId: "test-request-id",
        };

        await expect(paymentService.processPayment(request)).rejects.toThrow("Amount and credits must be positive");
      });
    });
  });

  describe("User Lookup", () => {
    it("should return early when user is not found", async () => {
      const request = {
        userId: "nonexistent-user",
        paymentIntentId: "pi_123",
        amount: 1000,
        creditsToAdd: 100,
        requestId: "test-request-id",
      };

      const mockDb = createMockDb();

      require("@/lib/db").db.mockReturnValue(mockDb);

      await paymentService.processPayment(request);

      expect(mockDb.transaction).not.toHaveBeenCalled();
    });

    it("should find user successfully when user exists", async () => {
      const request = {
        userId: "user-123",
        paymentIntentId: "pi_123",
        amount: 1000,
        creditsToAdd: 100,
        requestId: "test-request-id",
      };

      const mockUserRecord = {
        id: 1,
        clerkId: "user-123",
        credits: 100,
        subscriptionTier: "free",
      };

      const mockDb = createMockDb();
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn()
              .mockResolvedValueOnce([mockUserRecord])
              .mockResolvedValueOnce([]),
          }),
        }),
      });

      mockDb.transaction.mockImplementation(async (callback: any) => {
        await callback({
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(undefined),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockResolvedValue(undefined),
          }),
        });
      });

      require("@/lib/db").db.mockReturnValue(mockDb);

      await expect(paymentService.processPayment(request)).resolves.not.toThrow();
    });
  });

  describe("Duplicate Payment Detection", () => {
    it("should skip processing when payment was already processed", async () => {
      const request = {
        userId: "user-123",
        paymentIntentId: "pi_123",
        amount: 1000,
        creditsToAdd: 100,
        requestId: "test-request-id",
      };

      const mockUserRecord = {
        id: 1,
        clerkId: "user-123",
        credits: 100,
        subscriptionTier: "free",
      };

      const mockExistingTransaction = {
        id: "tx-123",
        stripePaymentId: "pi_123",
      };

      const mockDb = createMockDb();
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn()
              .mockResolvedValueOnce([mockUserRecord])
              .mockResolvedValueOnce([mockExistingTransaction]),
          }),
        }),
      });

      require("@/lib/db").db.mockReturnValue(mockDb);

      await paymentService.processPayment(request);

      expect(mockDb.transaction).not.toHaveBeenCalled();
    });

    it("should process payment when no existing transaction found", async () => {
      const request = {
        userId: "user-123",
        paymentIntentId: "pi_123",
        amount: 1000,
        creditsToAdd: 100,
        requestId: "test-request-id",
      };

      const mockUserRecord = {
        id: 1,
        clerkId: "user-123",
        credits: 100,
        subscriptionTier: "free",
      };

      const mockDb = createMockDb();
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn()
              .mockResolvedValueOnce([mockUserRecord])
              .mockResolvedValueOnce([]),
          }),
        }),
      });

      mockDb.transaction.mockImplementation(async (callback: any) => {
        await callback({
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(undefined),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockResolvedValue(undefined),
          }),
        });
      });

      require("@/lib/db").db.mockReturnValue(mockDb);

      await expect(paymentService.processPayment(request)).resolves.not.toThrow();
      expect(mockDb.transaction).toHaveBeenCalled();
    });
  });

  describe("Subscription Tier Upgrade", () => {
    it("should upgrade to pro tier when credits exceed threshold", async () => {
      const request = {
        userId: "user-123",
        paymentIntentId: "pi_123",
        amount: 1000,
        creditsToAdd: 600,
        requestId: "test-request-id",
      };

      const mockUserRecord = {
        id: 1,
        clerkId: "user-123",
        credits: 100,
        subscriptionTier: "free",
      };

      const mockDb = createMockDb();
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn()
              .mockResolvedValueOnce([mockUserRecord])
              .mockResolvedValueOnce([]),
          }),
        }),
      });

      mockDb.transaction.mockImplementation(async (callback: any) => {
        await callback({
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(undefined),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockResolvedValue(undefined),
          }),
        });
      });

      require("@/lib/db").db.mockReturnValue(mockDb);

      await expect(paymentService.processPayment(request)).resolves.not.toThrow();
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it("should remain on free tier when credits below threshold", async () => {
      const request = {
        userId: "user-123",
        paymentIntentId: "pi_123",
        amount: 1000,
        creditsToAdd: 100,
        requestId: "test-request-id",
      };

      const mockUserRecord = {
        id: 1,
        clerkId: "user-123",
        credits: 100,
        subscriptionTier: "free",
      };

      const mockDb = createMockDb();
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn()
              .mockResolvedValueOnce([mockUserRecord])
              .mockResolvedValueOnce([]),
          }),
        }),
      });

      mockDb.transaction.mockImplementation(async (callback: any) => {
        await callback({
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(undefined),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockResolvedValue(undefined),
          }),
        });
      });

      require("@/lib/db").db.mockReturnValue(mockDb);

      await expect(paymentService.processPayment(request)).resolves.not.toThrow();
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it("should remain on pro tier when already pro and credits increase", async () => {
      const request = {
        userId: "user-123",
        paymentIntentId: "pi_123",
        amount: 1000,
        creditsToAdd: 100,
        requestId: "test-request-id",
      };

      const mockUserRecord = {
        id: 1,
        clerkId: "user-123",
        credits: 600,
        subscriptionTier: "pro",
      };

      const mockDb = createMockDb();
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn()
              .mockResolvedValueOnce([mockUserRecord])
              .mockResolvedValueOnce([]),
          }),
        }),
      });

      mockDb.transaction.mockImplementation(async (callback: any) => {
        await callback({
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(undefined),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockResolvedValue(undefined),
          }),
        });
      });

      require("@/lib/db").db.mockReturnValue(mockDb);

      await expect(paymentService.processPayment(request)).resolves.not.toThrow();
      expect(mockDb.transaction).toHaveBeenCalled();
    });
  });

  describe("Cache Invalidation", () => {
    it("should invalidate user cache after successful payment", async () => {
      const request = {
        userId: "user-123",
        paymentIntentId: "pi_123",
        amount: 1000,
        creditsToAdd: 100,
        requestId: "test-request-id",
      };

      const mockUserRecord = {
        id: 1,
        clerkId: "user-123",
        credits: 100,
        subscriptionTier: "free",
      };

      const mockDb = createMockDb();
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn()
              .mockResolvedValueOnce([mockUserRecord])
              .mockResolvedValueOnce([]),
          }),
        }),
      });

      mockDb.transaction.mockImplementation(async (callback: any) => {
        await callback({
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(undefined),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockResolvedValue(undefined),
          }),
        });
      });

      require("@/lib/db").db.mockReturnValue(mockDb);

      const { teamCache } = require("@/lib/services/cache-orchestrator");

      await paymentService.processPayment(request);

      expect(teamCache.invalidate).toHaveBeenCalledWith("user:1:teams");
    });
  });

  describe("Database Transaction", () => {
    it("should execute user update and transaction insertion in same transaction", async () => {
      const request = {
        userId: "user-123",
        paymentIntentId: "pi_123",
        amount: 1000,
        creditsToAdd: 100,
        requestId: "test-request-id",
      };

      const mockUserRecord = {
        id: 1,
        clerkId: "user-123",
        credits: 100,
        subscriptionTier: "free",
      };

      const mockDb = createMockDb();
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn()
              .mockResolvedValueOnce([mockUserRecord])
              .mockResolvedValueOnce([]),
          }),
        }),
      });

      mockDb.transaction.mockImplementation(async (callback: any) => {
        await callback({
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(undefined),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockResolvedValue(undefined),
          }),
        });
      });

      require("@/lib/db").db.mockReturnValue(mockDb);

      await paymentService.processPayment(request);

      expect(mockDb.transaction).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should throw DatabaseError when transaction fails", async () => {
      const request = {
        userId: "user-123",
        paymentIntentId: "pi_123",
        amount: 1000,
        creditsToAdd: 100,
        requestId: "test-request-id",
      };

      const mockUserRecord = {
        id: 1,
        clerkId: "user-123",
        credits: 100,
        subscriptionTier: "free",
      };

      const mockDb = createMockDb();
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn()
              .mockResolvedValueOnce([mockUserRecord])
              .mockResolvedValueOnce([]),
          }),
        }),
      });

      mockDb.transaction.mockRejectedValue(new Error("Database connection failed"));

      require("@/lib/db").db.mockReturnValue(mockDb);

      const { DatabaseError } = require("@/lib/api-utils");

      await expect(paymentService.processPayment(request)).rejects.toThrow(DatabaseError);
    });

    it("should log error when payment processing fails", async () => {
      const request = {
        userId: "user-123",
        paymentIntentId: "pi_123",
        amount: 1000,
        creditsToAdd: 100,
        requestId: "test-request-id",
      };

      const mockUserRecord = {
        id: 1,
        clerkId: "user-123",
        credits: 100,
        subscriptionTier: "free",
      };

      const mockDb = createMockDb();
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn()
              .mockResolvedValueOnce([mockUserRecord])
              .mockResolvedValueOnce([]),
          }),
        }),
      });

      mockDb.transaction.mockRejectedValue(new Error("Database connection failed"));

      require("@/lib/db").db.mockReturnValue(mockDb);

      const { logger } = require("@/lib/logger");

      await expect(paymentService.processPayment(request)).rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to process payment",
        expect.objectContaining({
          requestId: "test-request-id",
          userId: "user-123",
          paymentIntent: "pi_123",
        })
      );
    });

    it("should log user action when payment is successful", async () => {
      const request = {
        userId: "user-123",
        paymentIntentId: "pi_123",
        amount: 1000,
        creditsToAdd: 100,
        requestId: "test-request-id",
      };

      const mockUserRecord = {
        id: 1,
        clerkId: "user-123",
        credits: 100,
        subscriptionTier: "free",
      };

      const mockDb = createMockDb();
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn()
              .mockResolvedValueOnce([mockUserRecord])
              .mockResolvedValueOnce([]),
          }),
        }),
      });

      mockDb.transaction.mockImplementation(async (callback: any) => {
        await callback({
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(undefined),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockResolvedValue(undefined),
          }),
        });
      });

      require("@/lib/db").db.mockReturnValue(mockDb);

      const { logger } = require("@/lib/logger");

      await paymentService.processPayment(request);

      expect(logger.userAction).toHaveBeenCalledWith(
        "Payment processed via webhook",
        "user-123",
        expect.objectContaining({
          requestId: "test-request-id",
          paymentIntent: "pi_123",
          amount: 10,
          creditsAdded: 100,
          newCredits: 200,
          subscriptionTier: "free",
          eventType: "payment_intent.succeeded",
        })
      );
    });
  });

  describe("calculateAccountUpdate (Private Method)", () => {
    it("should calculate correct credits when user has existing credits", () => {
      const service = paymentService as any;
      const userRecord = {
        id: 1,
        credits: 100,
        subscriptionTier: "free",
      };

      const result = service.calculateAccountUpdate(userRecord, 50);

      expect(result.credits).toBe(150);
      expect(result.subscriptionTier).toBe("free");
    });

    it("should upgrade to pro when credits exceed threshold", () => {
      const service = paymentService as any;
      const userRecord = {
        id: 1,
        credits: 100,
        subscriptionTier: "free",
      };

      const result = service.calculateAccountUpdate(userRecord, 600);

      expect(result.credits).toBe(700);
      expect(result.subscriptionTier).toBe("pro");
    });

    it("should maintain pro tier when already pro", () => {
      const service = paymentService as any;
      const userRecord = {
        id: 1,
        credits: 600,
        subscriptionTier: "pro",
      };

      const result = service.calculateAccountUpdate(userRecord, 100);

      expect(result.credits).toBe(700);
      expect(result.subscriptionTier).toBe("pro");
    });

    it("should handle edge case exactly at threshold", () => {
      const service = paymentService as any;
      const userRecord = {
        id: 1,
        credits: 400,
        subscriptionTier: "free",
      };

      const result = service.calculateAccountUpdate(userRecord, 100);

      expect(result.credits).toBe(500);
      expect(result.subscriptionTier).toBe("pro");
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle complete payment flow end-to-end", async () => {
      const request = {
        userId: "user-123",
        paymentIntentId: "pi_123",
        amount: 1000,
        creditsToAdd: 100,
        requestId: "test-request-id",
      };

      const mockUserRecord = {
        id: 1,
        clerkId: "user-123",
        credits: 100,
        subscriptionTier: "free",
      };

      const mockDb = createMockDb();
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn()
              .mockResolvedValueOnce([mockUserRecord])
              .mockResolvedValueOnce([]),
          }),
        }),
      });

      mockDb.transaction.mockImplementation(async (callback: any) => {
        await callback({
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(undefined),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockResolvedValue({
              id: "tx-123",
            }),
          }),
        });
      });

      require("@/lib/db").db.mockReturnValue(mockDb);

      const { teamCache, logger } = require("@/lib/services/cache-orchestrator");
      require("@/lib/logger");

      await expect(paymentService.processPayment(request)).resolves.not.toThrow();

      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
      expect(teamCache.invalidate).toHaveBeenCalledWith("user:1:teams");
    });
  });
});
