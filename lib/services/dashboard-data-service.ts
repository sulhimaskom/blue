import { logger } from "@/lib/logger";
import { ServiceError } from "./service-error-handler";
import type { BlueprintFormData } from "./blueprint-validation-service";
import type { PricingPackage } from "@/lib/constants";

/**
 * Service interfaces for dashboard data operations
 */
export interface BlueprintData {
  projects: Array<{
    id: string;
    name: string;
    description: string;
    blueprintCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
  performanceMetrics?: {
    totalOptimizations: number;
  };
  credits: number;
}

export interface ProjectBlueprintsData {
  blueprints: Array<{
    id: string;
    title: string;
    description: string;
    version: number;
    status: string;
    projectId: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface CreditsData {
  credits: number;
  subscriptionTier: string;
  transactions: Array<{
    id: string;
    amount: number;
    creditsAdded: number;
    createdAt: string;
    paymentId?: string;
  }>;
  pricing: {
    creditValue: string;
    packages: PricingPackage[];
  };
  stripeConfig: {
    configured: boolean;
    publishableKey?: string | null;
  };
}

export interface DeploymentRequest {
  githubOrg: string;
  repoName: string;
  isPrivate: boolean;
}

export interface DeploymentResponse {
  repoUrl: string;
  success: boolean;
  message: string;
}

/**
 * Dashboard Data Service
 *
 * Centralizes all dashboard data fetching operations following Service Layer principles.
 * Eliminates duplicate fetch logic across dashboard components and provides consistent error handling.
 *
 * Key Features:
 * - Centralized API calls with consistent error handling
 * - Type-safe interfaces for all data operations
 * - Proper error logging and user-friendly error messages
 * - Service Layer compliance (blueprint.md:208-209)
 */
export class DashboardDataService {
  private static readonly API_BASE = "/api";
  private static readonly DEFAULT_HEADERS = {
    "Content-Type": "application/json",
  };

  /**
   * Generic fetch wrapper with consistent error handling
   */
  private static async apiCall<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    try {
      const response = await fetch(`${this.API_BASE}${endpoint}`, {
        headers: this.DEFAULT_HEADERS,
        ...options,
      });

      if (!response.ok) {
        const errorText = response.statusText;
        throw ServiceError.database(
          `API call failed: ${endpoint} - ${errorText}`,
          "DashboardDataService",
          "makeApiCall",
          undefined,
          { endpoint, status: response.status, statusText: errorText }
        );
      }

      return await response.json();
    } catch (error) {
      logger.error("DashboardDataService API call failed", {
        endpoint,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Fetch comprehensive blueprints data including projects and stats
   * Consolidates fetchBlueprintsData logic from blueprints/page.tsx (lines 67-97)
   */
  static async getBlueprintsData(): Promise<BlueprintData> {
    try {
      const data = await this.apiCall<BlueprintData>("/blueprints");

      // Normalize data structure to match component expectations
      return {
        projects: data.projects || [],
        performanceMetrics: data.performanceMetrics || {
          totalOptimizations: 0,
        },
        credits: data.credits || 0,
      };
    } catch (error) {
      throw ServiceError.database(
        error instanceof Error
          ? error.message
          : "Failed to load blueprints data",
        "DashboardDataService",
        "getBlueprintData",
        error instanceof Error ? error : new Error("Failed to load blueprints data"),
        { endpoint: "/blueprints/dashboard" }
      );
    }
  }

  /**
   * Fetch blueprints for a specific project
   * Consolidates fetchProjectBlueprints logic from multiple components (lines 99-118, 93-112)
   */
  static async getProjectBlueprints(
    projectId: string,
  ): Promise<ProjectBlueprintsData> {
    try {
      const data = await this.apiCall<ProjectBlueprintsData>(
        `/projects/${projectId}/blueprints`,
      );
      return data;
    } catch (error) {
      throw ServiceError.database(
        error instanceof Error
          ? error.message
          : "Failed to load project blueprints",
        "DashboardDataService",
        "getProjectBlueprints",
        error instanceof Error ? error : new Error("Failed to load project blueprints"),
        { projectId }
      );
    }
  }

  /**
   * Fetch user credits and transaction data
   * Consolidates fetchCreditsData logic from credits/page.tsx (lines 49-62)
   */
  static async getCreditsData(): Promise<CreditsData> {
    try {
      const data = await this.apiCall<CreditsData>("/credits");
      return data;
    } catch (error) {
      throw ServiceError.database(
        error instanceof Error ? error.message : "Failed to load credits data",
        "DashboardDataService",
        "getCreditsData",
        error instanceof Error ? error : new Error("Failed to load credits data"),
        { endpoint: "/credits" }
      );
    }
  }

  /**
   * Create a new blueprint
   * Consolidates blueprint creation logic from blueprints/page.tsx (lines 136-165)
   */
  static async createBlueprint(formData: BlueprintFormData): Promise<void> {
    try {
      await this.apiCall("/blueprints", {
        method: "POST",
        body: JSON.stringify(formData),
      });
    } catch (error) {
      throw ServiceError.database(
        error instanceof Error ? error.message : "Failed to create blueprint",
        "DashboardDataService",
        "createBlueprint",
        error instanceof Error ? error : new Error("Failed to create blueprint"),
        { formData }
      );
    }
  }

  /**
   * Deploy project or blueprint to GitHub
   * Consolidates deployment logic from projects/page.tsx (lines 133-177)
   */
  static async deployToRepository(
    deployId: string,
    deploymentForm: DeploymentRequest,
  ): Promise<DeploymentResponse> {
    try {
      const data = await this.apiCall<DeploymentResponse>(
        `/deploy/${deployId}`,
        {
          method: "POST",
          body: JSON.stringify(deploymentForm),
        },
      );
      return data;
    } catch (error) {
      throw ServiceError.database(
        error instanceof Error ? error.message : "Deployment failed",
        "DashboardDataService", 
        "deployToRepository",
        error instanceof Error ? error : new Error("Deployment failed"),
        { deployId, deploymentForm }
      );
    }
  }

  /**
   * Purchase credits
   * Consolidates purchase logic from credits/page.tsx (lines 82-108)
   */
  static async purchaseCredits(
    amount: number,
    paymentMethodId: string,
    confirmImmediate: boolean = true,
  ): Promise<void> {
    try {
      await this.apiCall("/credits", {
        method: "POST",
        body: JSON.stringify({
          amount,
          paymentMethodId,
          confirmImmediate,
        }),
      });
    } catch (error) {
      throw ServiceError.database(
        error instanceof Error ? error.message : "Purchase failed",
        "DashboardDataService",
        "purchaseCredits",
        error instanceof Error ? error : new Error("Purchase failed"),
        { amount, paymentMethodId }
      );
    }
  }

  /**
   * Projects data with deployment status (mock data for now)
   * Consolidates fetchProjects logic from projects/page.tsx (lines 57-91)
   */
  static async getProjectsWithDeployment(): Promise<BlueprintData["projects"]> {
    try {
      const data = await this.getBlueprintsData();

      // Mock deployment status (should be replaced with real API data)
      const projectsWithDeployment = data.projects.map((project) => ({
        ...project,
        deploymentStatus: {
          isDeployed: Math.random() > 0.5,
          repoUrl: project.name
            ? `https://github.com/demo/${project.name}`
            : undefined,
          deployedAt: project.updatedAt,
          githubOrg: "demo",
          repoName: project.name,
        },
      }));

      return projectsWithDeployment;
    } catch (error) {
      throw ServiceError.database(
        error instanceof Error ? error.message : "Failed to load projects",
        "DashboardDataService",
        "getProjectsWithDeployment",
        error instanceof Error ? error : new Error("Failed to load projects"),
        {}
      );
    }
  }

  /**
   * Fetch circuit breaker metrics for monitoring
   * Consolidates fetchMetrics logic from circuit-breaker-status-panel.tsx (lines 62-86)
   */
  static async getCircuitBreakerMetrics<T = any>(): Promise<{
    success: boolean;
    data: T;
    error?: string;
  }> {
    try {
      const data = await this.apiCall<{
        success: boolean;
        data: T;
        error?: string;
      }>("/circuit-breakers/metrics");
      return data;
    } catch (error) {
      throw ServiceError.database(
        error instanceof Error
          ? error.message
          : "Failed to load circuit breaker metrics",
        "DashboardDataService",
        "getCircuitBreakerMetrics",
        error instanceof Error ? error : new Error("Failed to load circuit breaker metrics"),
        { endpoint: "/circuit-breakers/metrics" }
      );
    }
  }

  /**
   * Reset circuit breaker state
   * Consolidates circuit breaker reset logic for monitoring components
   */
  static async resetCircuitBreaker(circuitName?: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const data = await this.apiCall<{
        success: boolean;
        message: string;
      }>("/circuit-breakers/reset", {
        method: "POST",
        body: JSON.stringify({ circuit: circuitName }),
      });
      return data;
    } catch (error) {
      throw ServiceError.database(
        error instanceof Error
          ? error.message
          : "Failed to reset circuit breaker",
        "DashboardDataService",
        "resetCircuitBreaker",
        error instanceof Error ? error : new Error("Failed to reset circuit breaker"),
        { circuitName }
      );
    }
  }
}
