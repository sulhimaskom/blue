import { describe, it, expect } from "@jest/globals";

describe("Service Import Tests", () => {
  it("should import ClientStorageService", async () => {
    const { ClientStorageService } = await import("@/lib/services/client-storage-service");
    expect(ClientStorageService).toBeDefined();
  });

  it("should import form-service functions", async () => {
    const { generateFormId, validateFormField } = await import("@/lib/services/form-service");
    expect(generateFormId).toBeDefined();
    expect(validateFormField).toBeDefined();
  });

  it("should import NotificationPreferencesService", async () => {
    const { NotificationPreferencesService } = await import("@/lib/services/notification-preferences-service");
    expect(NotificationPreferencesService).toBeDefined();
  });

  it("should import APIResponseFormatter", async () => {
    const { APIResponseFormatter } = await import("@/lib/services/api-response-formatter");
    expect(APIResponseFormatter).toBeDefined();
  });

  it("should import MetricsCalculatorService", async () => {
    const { MetricsCalculatorService } = await import("@/lib/services/metrics-calculator-service");
    expect(MetricsCalculatorService).toBeDefined();
  });
});
