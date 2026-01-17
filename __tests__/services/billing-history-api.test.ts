import { GET } from "@/app/api/subscription/billing/history/route";
import { ProjectDataService } from "@/lib/services/project-data-service";
import { Mock } from "vitest";

describe("Subscription Billing History API - Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/subscription/billing/history", () => {
    it("should return billing history with default pagination", async () => {
      const mockTransactions = [
        {
          id: "tx1",
          amount: 1000,
          creditsAdded: 10,
          stripePaymentId: "pi_123",
          createdAt: new Date("2026-01-15T10:00:00Z"),
        },
        {
          id: "tx2",
          amount: 2000,
          creditsAdded: 20,
          stripePaymentId: "pi_456",
          createdAt: new Date("2026-01-14T10:00:00Z"),
        },
      ];

      jest
        .spyOn(ProjectDataService, "getUserTransactions")
        .mockResolvedValue({ transactions: mockTransactions } as any);

      const mockRequest = new Request(
        "http://localhost/api/subscription/billing/history",
        {
          headers: {
            Authorization: "Bearer test-token",
          },
        },
      );

      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.transactions).toHaveLength(2);
      expect(data.data.totalCount).toBe(2);
      expect(data.data.limit).toBe(50);
      expect(data.data.offset).toBe(0);
    });

    it("should apply limit parameter", async () => {
      const mockTransactions = [
        {
          id: "tx1",
          amount: 1000,
          creditsAdded: 10,
          stripePaymentId: "pi_123",
          createdAt: new Date("2026-01-15T10:00:00Z"),
        },
        {
          id: "tx2",
          amount: 2000,
          creditsAdded: 20,
          stripePaymentId: "pi_456",
          createdAt: new Date("2026-01-14T10:00:00Z"),
        },
      ];

      jest
        .spyOn(ProjectDataService, "getUserTransactions")
        .mockResolvedValue({ transactions: mockTransactions } as any);

      const mockRequest = new Request(
        "http://localhost/api/subscription/billing/history?limit=1",
        {
          headers: {
            Authorization: "Bearer test-token",
          },
        },
      );

      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.transactions).toHaveLength(1);
      expect(data.data.limit).toBe(1);
    });

    it("should apply offset parameter", async () => {
      const mockTransactions = [
        {
          id: "tx1",
          amount: 1000,
          creditsAdded: 10,
          stripePaymentId: "pi_123",
          createdAt: new Date("2026-01-15T10:00:00Z"),
        },
        {
          id: "tx2",
          amount: 2000,
          creditsAdded: 20,
          stripePaymentId: "pi_456",
          createdAt: new Date("2026-01-14T10:00:00Z"),
        },
      ];

      jest
        .spyOn(ProjectDataService, "getUserTransactions")
        .mockResolvedValue({ transactions: mockTransactions } as any);

      const mockRequest = new Request(
        "http://localhost/api/subscription/billing/history?offset=1",
        {
          headers: {
            Authorization: "Bearer test-token",
          },
        },
      );

      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.transactions).toHaveLength(1);
      expect(data.data.offset).toBe(1);
    });

    it("should filter by startDate", async () => {
      const mockTransactions = [
        {
          id: "tx1",
          amount: 1000,
          creditsAdded: 10,
          stripePaymentId: "pi_123",
          createdAt: new Date("2026-01-15T10:00:00Z"),
        },
        {
          id: "tx2",
          amount: 2000,
          creditsAdded: 20,
          stripePaymentId: "pi_456",
          createdAt: new Date("2026-01-10T10:00:00Z"),
        },
      ];

      jest
        .spyOn(ProjectDataService, "getUserTransactions")
        .mockResolvedValue({ transactions: mockTransactions } as any);

      const mockRequest = new Request(
        "http://localhost/api/subscription/billing/history?startDate=2026-01-12T00:00:00Z",
        {
          headers: {
            Authorization: "Bearer test-token",
          },
        },
      );

      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.transactions).toHaveLength(1);
      expect(data.data.transactions[0].id).toBe("tx1");
    });

    it("should filter by endDate", async () => {
      const mockTransactions = [
        {
          id: "tx1",
          amount: 1000,
          creditsAdded: 10,
          stripePaymentId: "pi_123",
          createdAt: new Date("2026-01-15T10:00:00Z"),
        },
        {
          id: "tx2",
          amount: 2000,
          creditsAdded: 20,
          stripePaymentId: "pi_456",
          createdAt: new Date("2026-01-10T10:00:00Z"),
        },
      ];

      jest
        .spyOn(ProjectDataService, "getUserTransactions")
        .mockResolvedValue({ transactions: mockTransactions } as any);

      const mockRequest = new Request(
        "http://localhost/api/subscription/billing/history?endDate=2026-01-12T00:00:00Z",
        {
          headers: {
            Authorization: "Bearer test-token",
          },
        },
      );

      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.transactions).toHaveLength(1);
      expect(data.data.transactions[0].id).toBe("tx2");
    });

    it("should return error for invalid startDate", async () => {
      jest
        .spyOn(ProjectDataService, "getUserTransactions")
        .mockResolvedValue({ transactions: [] } as any);

      const mockRequest = new Request(
        "http://localhost/api/subscription/billing/history?startDate=invalid-date",
        {
          headers: {
            Authorization: "Bearer test-token",
          },
        },
      );

      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should return error for invalid endDate", async () => {
      jest
        .spyOn(ProjectDataService, "getUserTransactions")
        .mockResolvedValue({ transactions: [] } as any);

      const mockRequest = new Request(
        "http://localhost/api/subscription/billing/history?endDate=invalid-date",
        {
          headers: {
            Authorization: "Bearer test-token",
          },
          },
      );

      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should require authentication", async () => {
      const mockRequest = new Request(
        "http://localhost/api/subscription/billing/history",
      );

      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it("should format dates as ISO strings", async () => {
      const testDate = new Date("2026-01-15T10:00:00Z");

      const mockTransactions = [
        {
          id: "tx1",
          amount: 1000,
          creditsAdded: 10,
          stripePaymentId: "pi_123",
          createdAt: testDate,
        },
      ];

      jest
        .spyOn(ProjectDataService, "getUserTransactions")
        .mockResolvedValue({ transactions: mockTransactions } as any);

      const mockRequest = new Request(
        "http://localhost/api/subscription/billing/history",
        {
          headers: {
            Authorization: "Bearer test-token",
          },
        },
      );

      const response = await GET(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.transactions[0].createdAt).toBe(
        "2026-01-15T10:00:00.000Z",
      );
    });
  });
});