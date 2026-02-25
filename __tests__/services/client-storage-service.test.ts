import { describe, it, expect } from "@jest/globals";
import { ClientStorageService } from "@/lib/services/client-storage-service";

describe("ClientStorageService", () => {
  describe("Service Export", () => {
    it("should be properly exported", () => {
      expect(ClientStorageService).toBeDefined();
    });

    it("should be instantiable", () => {
      const service = new ClientStorageService();
      expect(service).toBeDefined();
    });
  });
});
