import type { WebhookConfigurationInput } from "@/lib/schemas/webhook-schema";
import { ServiceError } from "./service-error-handler";

export interface WebhookConfiguration {
  id: string;
  name: string;
  url: string;
  eventTypes: string[];
  isActive: boolean;
  retryCount: number;
  timeoutSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookTestResult {
  success: boolean;
  status: number;
  responseTime: number;
  error?: string;
}

export interface WebhookEvent {
  id: string;
  webhookId: string;
  eventType: string;
  status: "success" | "failed" | "retrying" | "pending";
  responseStatus?: number;
  attemptCount: number;
  createdAt: string;
}

export interface WebhookEventListOptions {
  limit?: number;
  offset?: number;
}

interface ServiceState {
  webhooks: Map<string, WebhookConfiguration>;
  loading: boolean;
  error: string | null;
}

export class WebhookManagementService {
  private static instance: WebhookManagementService;
  private state: ServiceState;

  private constructor() {
    this.state = {
      webhooks: new Map(),
      loading: false,
      error: null,
    };
  }

  public static getInstance(): WebhookManagementService {
    if (!WebhookManagementService.instance) {
      WebhookManagementService.instance = new WebhookManagementService();
    }
    return WebhookManagementService.instance;
  }

  public static resetInstance(): void {
    WebhookManagementService.instance = new WebhookManagementService();
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const response = await fetch(endpoint, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  public async loadWebhooks(): Promise<WebhookConfiguration[]> {
    try {
      const result = await this.request<WebhookConfiguration[]>(
        "/api/webhooks/configure",
      );

      if (result.success && result.data) {
        const webhookMap = new Map<string, WebhookConfiguration>();
        result.data.forEach((webhook) => {
          webhookMap.set(webhook.id, webhook);
        });
        this.state.webhooks = webhookMap;
        return result.data;
      }

      throw ServiceError.database(
          result.error || "Failed to load webhooks",
          "WebhookManagementService",
          "loadWebhooks",
          undefined,
          { result }
        );
    } catch (error) {
      this.state.error =
        error instanceof Error ? error.message : "Error loading webhooks";
      throw error;
    }
  }

  public async createWebhook(
    data: WebhookConfigurationInput,
  ): Promise<WebhookConfiguration> {
    try {
      const result = await this.request<WebhookConfiguration>(
        "/api/webhooks/configure",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      );

      if (result.success && result.data) {
        this.state.webhooks.set(result.data.id, result.data);
        return result.data;
      }

      throw ServiceError.database(
          result.error || "Failed to create webhook",
          "WebhookManagementService",
          "createWebhook",
          undefined,
          { result, data }
        );
    } catch (error) {
      this.state.error =
        error instanceof Error ? error.message : "Error creating webhook";
      throw error;
    }
  }

  public async updateWebhook(
    id: string,
    data: WebhookConfigurationInput,
  ): Promise<WebhookConfiguration> {
    try {
      const result = await this.request<WebhookConfiguration>(
        `/api/webhooks/configure/${id}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        },
      );

      if (result.success && result.data) {
        this.state.webhooks.set(result.data.id, result.data);
        return result.data;
      }

      throw ServiceError.database(
          result.error || "Failed to update webhook",
          "WebhookManagementService",
          "updateWebhook",
          undefined,
          { result, id, data }
        );
    } catch (error) {
      this.state.error =
        error instanceof Error ? error.message : "Error updating webhook";
      throw error;
    }
  }

  public async deleteWebhook(id: string): Promise<void> {
    try {
      const result = await this.request<void>(`/api/webhooks/configure/${id}`, {
        method: "DELETE",
      });

      if (result.success) {
        this.state.webhooks.delete(id);
      } else {
        throw ServiceError.database(
          result.error || "Failed to delete webhook",
          "WebhookManagementService",
          "deleteWebhook",
          undefined,
          { result, id }
        );
      }
    } catch (error) {
      this.state.error =
        error instanceof Error ? error.message : "Error deleting webhook";
      throw error;
    }
  }

  public async testWebhook(id: string): Promise<WebhookTestResult> {
    try {
      const result = await this.request<WebhookTestResult>(
        `/api/webhooks/test/${id}`,
        {
          method: "POST",
          body: JSON.stringify({
            eventType: "test.event",
            payload: { test: true, timestamp: new Date().toISOString() },
          }),
        },
      );

      if (result.success && result.data) {
        return result.data;
      }

      throw ServiceError.database(
          result.error || "Failed to test webhook",
          "WebhookManagementService",
          "testWebhook",
          undefined,
          { result, id }
        );
    } catch (error) {
      this.state.error =
        error instanceof Error ? error.message : "Error testing webhook";
      throw error;
    }
  }

  public async rotateSecret(id: string): Promise<void> {
    try {
      const result = await this.request<void>("/api/webhooks/rotate-secret", {
        method: "POST",
        body: JSON.stringify({ webhookId: id }),
      });

      if (!result.success) {
        throw ServiceError.database(
          result.error || "Failed to rotate secret",
          "WebhookManagementService",
          "rotateSecret",
          undefined,
          { result, id }
        );
      }
    } catch (error) {
      this.state.error =
        error instanceof Error ? error.message : "Error rotating secret";
      throw error;
    }
  }

  public async loadWebhookEvents(
    webhookId: string,
    options: WebhookEventListOptions = {},
  ): Promise<WebhookEvent[]> {
    try {
      const params = new URLSearchParams({
        limit: (options.limit || 50).toString(),
        offset: (options.offset || 0).toString(),
      });

      const result = await this.request<WebhookEvent[]>(
        `/api/webhooks/history/${webhookId}?${params}`,
      );

      if (result.success && result.data) {
        return result.data;
      }

      throw ServiceError.database(
          result.error || "Failed to load webhook events",
          "WebhookManagementService",
          "loadWebhookEvents",
          undefined,
          { result, webhookId, options }
        );
    } catch (error) {
      this.state.error =
        error instanceof Error ? error.message : "Error loading webhook events";
      throw error;
    }
  }

  public async retryEvent(eventId: string): Promise<void> {
    try {
      const result = await this.request<void>("/api/webhooks/retry", {
        method: "POST",
        body: JSON.stringify({ eventId }),
      });

      if (!result.success) {
        throw ServiceError.database(
          result.error || "Failed to retry event",
          "WebhookManagementService",
          "retryEvent",
          undefined,
          { result, eventId }
        );
      }
    } catch (error) {
      this.state.error =
        error instanceof Error ? error.message : "Error retrying event";
      throw error;
    }
  }

  public getWebhookById(id: string): WebhookConfiguration | undefined {
    return this.state.webhooks.get(id);
  }

  public getAllWebhooks(): WebhookConfiguration[] {
    return Array.from(this.state.webhooks.values());
  }

  public clearCache(): void {
    this.state.webhooks.clear();
    this.state.error = null;
  }
}
