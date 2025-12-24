import { POST, OPTIONS } from "@/app/api/webhooks/stripe/route";
import { createApiTestHelper } from "../helpers/test-helper";

describe("Stripe Webhook API - Integration Tests", () => {
  let testHelper: ReturnType<typeof createApiTestHelper>;

  beforeEach(() => {
    testHelper = createApiTestHelper({
      authenticated: false, // Webhooks don't require auth
    });
  });

  afterEach(() => {
    testHelper.resetAll();
  });

  describe("POST /api/webhooks/stripe", () => {
    it("should process payment_intent.succeeded event successfully", async () => {
      const mockDb = testHelper.getMock("database");
      const mockWebhookService = testHelper.getMock("webhookService");
      const mockSecurityService = testHelper.getMock("securityService");

      // Mock successful webhook processing
      mockSecurityService.verifyStripeWebhook.mockResolvedValue(true);
      mockWebhookService.processWebhook.mockImplementation(
        async (req, options) => {
          const event = {
            type: "payment_intent.succeeded",
            data: {
              object: {
                id: "pi_1234567890",
                amount: 1000, // $10.00 in cents
                metadata: {
                  userId: "user_test_123",
                  creditsAdded: "100",
                },
              },
            },
          };

          await options.processEvent(event, { requestId: "req_test_123" });
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
          });
        },
      );

      // Mock database responses
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              {
                id: 1,
                clerkId: "user_test_123",
                credits: 25,
                subscriptionTier: "free",
              },
            ]),
          }),
        }),
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ credits: 125 }]),
        }),
      });

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue([{ id: "txn_test_123" }]),
      });

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/webhooks/stripe",
        headers: {
          "stripe-signature": "stripe_signature_test",
        },
        body: {
          type: "payment_intent.succeeded",
          data: {
            object: {
              id: "pi_1234567890",
              amount: 1000,
              metadata: {
                userId: "user_test_123",
                creditsAdded: "100",
              },
            },
          },
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);

      // Verify database operations
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should handle invoice.payment_succeeded (subscription) event", async () => {
      const mockWebhookService = testHelper.getMock("webhookService");
      const mockSecurityService = testHelper.getMock("securityService");

      mockSecurityService.verifyStripeWebhook.mockResolvedValue(true);
      mockWebhookService.processWebhook.mockImplementation(
        async (req, options) => {
          const event = {
            type: "invoice.payment_succeeded",
            data: {
              object: {
                id: "in_1234567890",
                subscription: "sub_1234567890",
              },
            },
          };

          await options.processEvent(event, { requestId: "req_test_123" });
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
          });
        },
      );

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/webhooks/stripe",
        headers: {
          "stripe-signature": "stripe_signature_test",
        },
        body: {
          type: "invoice.payment_succeeded",
          data: {
            object: {
              id: "in_1234567890",
              subscription: "sub_1234567890",
              amount: 2000,
            },
          },
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });

    it("should reject invalid webhook signatures", async () => {
      const mockWebhookService = testHelper.getMock("webhookService");
      const mockSecurityService = testHelper.getMock("securityService");

      mockSecurityService.verifyStripeWebhook.mockResolvedValue(false);
      mockWebhookService.processWebhook.mockImplementation(
        async (req, options) => {
          const error = new Error("Invalid webhook signature");
          throw error;
        },
      );

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/webhooks/stripe",
        headers: {
          "stripe-signature": "invalid_signature",
        },
        body: {
          type: "payment_intent.succeeded",
          data: { object: { id: "pi_123", metadata: {} } },
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it("should handle user not found gracefully", async () => {
      const mockWebhookService = testHelper.getMock("webhookService");
      const mockSecurityService = testHelper.getMock("securityService");
      const mockDb = testHelper.getMock("database");

      mockSecurityService.verifyStripeWebhook.mockResolvedValue(true);
      mockWebhookService.processWebhook.mockImplementation(
        async (req, options) => {
          const event = {
            type: "payment_intent.succeeded",
            data: {
              object: {
                id: "pi_1234567890",
                amount: 1000,
                metadata: {
                  userId: "nonexistent_user",
                  creditsAdded: "100",
                },
              },
            },
          };

          await options.processEvent(event, { requestId: "req_test_123" });
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
          });
        },
      );

      // Mock user not found
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]), // Empty array = user not found
          }),
        }),
      });

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/webhooks/stripe",
        headers: {
          "stripe-signature": "stripe_signature_test",
        },
        body: {
          type: "payment_intent.succeeded",
          data: {
            object: {
              id: "pi_1234567890",
              amount: 1000,
              metadata: {
                userId: "nonexistent_user",
                creditsAdded: "100",
              },
            },
          },
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      // Should not attempt to update database for nonexistent user
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("should upgrade user to pro tier when credits exceed threshold", async () => {
      const mockWebhookService = testHelper.getMock("webhookService");
      const mockSecurityService = testHelper.getMock("securityService");
      const mockDb = testHelper.getMock("database");

      mockSecurityService.verifyStripeWebhook.mockResolvedValue(true);
      mockWebhookService.processWebhook.mockImplementation(
        async (req, options) => {
          const event = {
            type: "payment_intent.succeeded",
            data: {
              object: {
                id: "pi_1234567890",
                amount: 5000, // $50.00 - above pro threshold
                metadata: {
                  userId: "user_test_123",
                  creditsAdded: "500", // Above PRO_THRESHOLD
                },
              },
            },
          };

          await options.processEvent(event, { requestId: "req_test_123" });
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
          });
        },
      );

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              {
                id: 1,
                clerkId: "user_test_123",
                credits: 100,
                subscriptionTier: "free",
              },
            ]),
          }),
        }),
      });

      const updateMock = mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([
            {
              credits: 600,
              subscriptionTier: "pro", // Should be upgraded to pro
            },
          ]),
        }),
      });

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/webhooks/stripe",
        headers: {
          "stripe-signature": "stripe_signature_test",
        },
        body: {
          type: "payment_intent.succeeded",
          data: {
            object: {
              id: "pi_1234567890",
              amount: 5000,
              metadata: {
                userId: "user_test_123",
                creditsAdded: "500",
              },
            },
          },
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);

      // Verify pro tier upgrade
      expect(updateMock).toHaveBeenCalled();
      const setCall = updateMock.mock.results[0].value.set.mock.calls[0][0];
      expect(setCall.subscriptionTier).toBe("pro");
    });

    it("should create transaction record with proper data", async () => {
      const mockWebhookService = testHelper.getMock("webhookService");
      const mockSecurityService = testHelper.getMock("securityService");
      const mockDb = testHelper.getMock("database");

      mockSecurityService.verifyStripeWebhook.mockResolvedValue(true);
      mockWebhookService.processWebhook.mockImplementation(
        async (req, options) => {
          const event = {
            type: "payment_intent.succeeded",
            data: {
              object: {
                id: "pi_1234567890",
                amount: 1500, // $15.00
                metadata: {
                  userId: "user_test_123",
                  creditsAdded: "150",
                },
              },
            },
          };

          await options.processEvent(event, { requestId: "req_test_123" });
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
          });
        },
      );

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              {
                id: 1,
                clerkId: "user_test_123",
                credits: 25,
                subscriptionTier: "free",
              },
            ]),
          }),
        }),
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ credits: 175 }]),
        }),
      });

      const insertMock = mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue([{ id: "txn_test_123" }]),
      });

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/webhooks/stripe",
        headers: {
          "stripe-signature": "stripe_signature_test",
        },
        body: {
          type: "payment_intent.succeeded",
          data: {
            object: {
              id: "pi_1234567890",
              amount: 1500,
              metadata: {
                userId: "user_test_123",
                creditsAdded: "150",
              },
            },
          },
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);

      // Verify transaction record creation
      expect(insertMock).toHaveBeenCalled();
      const valuesCall =
        insertMock.mock.results[0].value.values.mock.calls[0][0];
      expect(valuesCall).toEqual({
        userId: 1,
        amount: 1500,
        creditsAdded: 150,
        stripePaymentId: "pi_1234567890",
      });
    });

    it("should handle missing metadata gracefully", async () => {
      const mockWebhookService = testHelper.getMock("webhookService");
      const mockSecurityService = testHelper.getMock("securityService");

      mockSecurityService.verifyStripeWebhook.mockResolvedValue(true);
      mockWebhookService.processWebhook.mockImplementation(
        async (req, options) => {
          const event = {
            type: "payment_intent.succeeded",
            data: {
              object: {
                id: "pi_1234567890",
                amount: 1000,
                metadata: null, // No metadata
              },
            },
          };

          await options.processEvent(event, { requestId: "req_test_123" });
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
          });
        },
      );

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/webhooks/stripe",
        headers: {
          "stripe-signature": "stripe_signature_test",
        },
        body: {
          type: "payment_intent.succeeded",
          data: {
            object: {
              id: "pi_1234567890",
              amount: 1000,
              metadata: null,
            },
          },
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });

    it("should handle database errors gracefully", async () => {
      const mockWebhookService = testHelper.getMock("webhookService");
      const mockSecurityService = testHelper.getMock("securityService");
      const mockDb = testHelper.getMock("database");

      mockSecurityService.verifyStripeWebhook.mockResolvedValue(true);
      mockWebhookService.processWebhook.mockImplementation(
        async (req, options) => {
          const event = {
            type: "payment_intent.succeeded",
            data: {
              object: {
                id: "pi_1234567890",
                amount: 1000,
                metadata: {
                  userId: "user_test_123",
                  creditsAdded: "100",
                },
              },
            },
          };

          await options.processEvent(event, { requestId: "req_test_123" });
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
          });
        },
      );

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest
              .fn()
              .mockRejectedValue(new Error("Database connection failed")),
          }),
        }),
      });

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/webhooks/stripe",
        headers: {
          "stripe-signature": "stripe_signature_test",
        },
        body: {
          type: "payment_intent.succeeded",
          data: {
            object: {
              id: "pi_1234567890",
              amount: 1000,
              metadata: {
                userId: "user_test_123",
                creditsAdded: "100",
              },
            },
          },
        },
      });

      const response = await POST(request);

      // Should handle database error gracefully
      expect(response.status).toBe(500);
    });
  });

  describe("OPTIONS /api/webhooks/stripe", () => {
    it("should handle CORS preflight request", async () => {
      const mockWebhookService = testHelper.getMock("webhookService");
      mockWebhookService.handleOptions.mockReturnValue(
        new Response(null, {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, stripe-signature",
          },
        }),
      );

      const request = testHelper.createRequest({
        method: "OPTIONS",
        path: "/api/webhooks/stripe",
      });

      const response = await OPTIONS(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
        "POST",
      );
      expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
        "stripe-signature",
      );
    });
  });

  describe("Security and Validation", () => {
    it("should reject requests without stripe-signature header", async () => {
      const mockWebhookService = testHelper.getMock("webhookService");
      const mockSecurityService = testHelper.getMock("securityService");

      mockSecurityService.verifyStripeWebhook.mockResolvedValue(false);
      mockWebhookService.processWebhook.mockImplementation(
        async (req, options) => {
          throw new Error("Missing signature");
        },
      );

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/webhooks/stripe",
        body: {
          type: "payment_intent.succeeded",
          data: { object: { id: "pi_123" } },
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it("should handle malformed webhook payload", async () => {
      const mockSecurityService = testHelper.getMock("securityService");
      mockSecurityService.verifyStripeWebhook.mockRejectedValue(
        new Error("Invalid payload"),
      );

      const request = testHelper.createRequest({
        method: "POST",
        path: "/api/webhooks/stripe",
        headers: {
          "stripe-signature": "invalid_signature",
        },
        body: "invalid_json_payload",
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });
});
