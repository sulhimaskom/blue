import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { NextRequest } from "next/server";

// Mock NextResponse
const mockJson = jest.fn();
jest.mock("next/server", () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: mockJson,
  },
}));

// Import after mocking
let POST: any, GET: any;

// Mock the StripePaymentService
const mockStripeService = {
  processWebhookEvent: jest.fn(),
  isConfigured: jest.fn(),
  getPublishableKey: jest.fn(),
};

jest.mock("@/lib/services/stripe-payment-service", () => ({
  StripePaymentService: {
    getInstance: jest.fn(() => mockStripeService),
  },
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    systemEvent: jest.fn(),
    info: jest.fn(),
  },
}));

beforeEach(() => {
  // Reset mocks
  mockJson.mockReset();
  mockStripeService.processWebhookEvent.mockReset();
  mockStripeService.isConfigured.mockReset();
  mockStripeService.getPublishableKey.mockReset();

  // Setup default mock responses
  mockJson.mockImplementation((data: any, init?: any) => ({
    status: init?.status || 200,
    json: async () => data,
  }));

  // Import route handlers after setup
  jest.isolateModules(() => {
    const route = require("@/app/api/stripe/webhook/route");
    POST = route.POST;
    GET = route.GET;
  });
});

describe("/api/stripe/webhook", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Re-setup mocks after clearing
    mockJson.mockImplementation((data: any, init?: any) => ({
      status: init?.status || 200,
      json: async () => data,
    }));
  });

  describe("POST", () => {
    it("should process webhook successfully", async () => {
      mockStripeService.processWebhookEvent.mockResolvedValue({
        processed: true,
        type: "payment_intent.succeeded",
      });

      const mockRequest = {
        text: jest.fn().mockResolvedValue("webhook_payload"),
        headers: {
          get: jest.fn((header: string) =>
            header === "stripe-signature" ? "test_signature" : null,
          ),
        },
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        received: true,
        type: "payment_intent.succeeded",
      });

      expect(mockRequest.text).toHaveBeenCalled();
      expect(mockRequest.headers.get).toHaveBeenCalledWith("stripe-signature");
      expect(mockStripeService.processWebhookEvent).toHaveBeenCalledWith(
        "webhook_payload",
        "test_signature",
        { requestId: expect.any(String) },
      );
    });

    it("should return 400 for missing stripe-signature header", async () => {
      const mockRequest = {
        text: jest.fn().mockResolvedValue("webhook_payload"),
        headers: {
          get: jest.fn(() => null),
        },
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: "Missing webhook signature",
      });
    });

    it("should return 401 for invalid webhook signature", async () => {
      const mockError = new Error("Invalid signature");
      mockStripeService.processWebhookEvent.mockRejectedValue(mockError);

      const mockRequest = {
        text: jest.fn().mockResolvedValue("webhook_payload"),
        headers: {
          get: jest.fn((header: string) =>
            header === "stripe-signature" ? "invalid_signature" : null,
          ),
        },
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        error: "Invalid webhook signature",
      });
    });

    it("should handle webhook processing errors", async () => {
      mockStripeService.processWebhookEvent.mockRejectedValue(
        new Error("Processing failed"),
      );

      const mockRequest = {
        text: jest.fn().mockResolvedValue("webhook_payload"),
        headers: {
          get: jest.fn((header: string) =>
            header === "stripe-signature" ? "test_signature" : null,
          ),
        },
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: "Webhook processing failed",
      });
    });
  });

  describe("GET", () => {
    it("should return health check status when configured", async () => {
      mockStripeService.isConfigured.mockReturnValue(true);
      mockStripeService.getPublishableKey.mockReturnValue("pk_test_123");

      const mockRequest = {} as NextRequest;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        status: "ok",
        configured: true,
        hasPublishableKey: true,
        timestamp: expect.any(String),
      });

      expect(mockStripeService.isConfigured).toHaveBeenCalled();
      expect(mockStripeService.getPublishableKey).toHaveBeenCalled();
    });

    it("should return health check status when not configured", async () => {
      mockStripeService.isConfigured.mockReturnValue(false);

      const mockRequest = {} as NextRequest;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        status: "ok",
        configured: false,
        hasPublishableKey: false,
        timestamp: expect.any(String),
      });

      expect(mockStripeService.isConfigured).toHaveBeenCalled();
      expect(mockStripeService.getPublishableKey).not.toHaveBeenCalled();
    });

    it("should handle health check errors", async () => {
      mockStripeService.isConfigured.mockImplementation(() => {
        throw new Error("Health check failed");
      });

      const mockRequest = {} as NextRequest;

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        status: "error",
        message: "Health check failed",
      });
    });
  });
});
