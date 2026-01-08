import { useState, useEffect, useCallback } from "react";
import {
  DashboardDataService,
  BlueprintData,
  ProjectBlueprintsData,
  CreditsData,
  DeploymentRequest,
  DeploymentResponse,
} from "@/lib/services/dashboard-data-service";

/**
 * Custom hook for blueprints data management
 * Consolidates data fetching logic from blueprints/page.tsx (lines 67-97, 99-118, 136-165)
 *
 * Features:
 * - Automatic data fetching on mount
 * - Consistent error handling
 * - Loading state management
 * - Refetch functionality
 * - Blueprint creation
 * - Project blueprint fetching
 */
export function useBlueprintsData() {
  const [data, setData] = useState<BlueprintData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectBlueprints, setSelectedProjectBlueprints] = useState<
    ProjectBlueprintsData["blueprints"]
  >([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await DashboardDataService.getBlueprintsData();
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load blueprints",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProjectBlueprints = useCallback(async (projectId: string) => {
    try {
      const result = await DashboardDataService.getProjectBlueprints(projectId);
      setSelectedProjectBlueprints(result.blueprints || []);
    } catch (err) {
      setSelectedProjectBlueprints([]);
    }
  }, []);

  const createBlueprint = useCallback(
    async (formData: any) => {
      try {
        setError(null);
        await DashboardDataService.createBlueprint(formData);
        await fetchData(); // Refresh data after successful creation
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create blueprint",
        );
        throw err;
      }
    },
    [fetchData],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    projects: data?.projects || [],
    stats: data
      ? {
          totalProjects: data.projects.length,
          totalBlueprints: data.performanceMetrics?.totalOptimizations || 0,
          completedBlueprints: data.performanceMetrics?.totalOptimizations || 0,
          draftBlueprints: 0,
          lastActivity: new Date().toISOString(),
        }
      : null,
    credits: data?.credits || 0,
    loading,
    error,
    refetch: fetchData,
    fetchProjectBlueprints,
    selectedProjectBlueprints,
    createBlueprint,
  };
}

/**
 * Custom hook for projects data management with deployment status
 * Consolidates data fetching logic from projects/page.tsx (lines 57-91, 93-112, 130-177)
 *
 * Features:
 * - Projects with deployment status
 * - Project blueprint fetching
 * - Deployment functionality
 * - Deployment form management
 */
export function useProjectsData() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [blueprints, setBlueprints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await DashboardDataService.getProjectsWithDeployment();
      setProjects(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProjectBlueprints = useCallback(async (project: any) => {
    try {
      const result = await DashboardDataService.getProjectBlueprints(
        project.id,
      );
      setBlueprints(result.blueprints || []);
    } catch (err) {
      setBlueprints([]);
    }
  }, []);

  const handleProjectSelect = useCallback(
    (project: any) => {
      setSelectedProject(project);
      fetchProjectBlueprints(project);
    },
    [fetchProjectBlueprints],
  );

  const deployToRepository = useCallback(
    async (
      deployId: string,
      deploymentForm: DeploymentRequest,
    ): Promise<DeploymentResponse> => {
      try {
        setDeploying(true);
        setError(null);
        const result = await DashboardDataService.deployToRepository(
          deployId,
          deploymentForm,
        );

        // Update project deployment status in local state
        if (selectedProject && selectedProject.id === deployId) {
          setProjects((prev) =>
            prev.map((p) =>
              p.id === selectedProject.id
                ? {
                    ...p,
                    deploymentStatus: {
                      isDeployed: true,
                      repoUrl: result.repoUrl,
                      deployedAt: new Date().toISOString(),
                      githubOrg: deploymentForm.githubOrg,
                      repoName: deploymentForm.repoName,
                    },
                  }
                : p,
            ),
          );
        }

        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Deployment failed");
        throw err;
      } finally {
        setDeploying(false);
      }
    },
    [selectedProject],
  );

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    selectedProject,
    blueprints,
    loading,
    error,
    deploying,
    refetch: fetchProjects,
    handleProjectSelect,
    deployToRepository,
  };
}

/**
 * Custom hook for credits data management
 * Consolidates data fetching logic from credits/page.tsx (lines 49-62, 82-108)
 *
 * Features:
 * - Credits and transaction data
 * - Purchase functionality
 * - Stripe configuration status
 * - Transaction history
 */
export function useCreditsData() {
  const [data, setData] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await DashboardDataService.getCreditsData();
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load credits data",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const purchaseCredits = useCallback(
    async (
      amount: number,
      paymentMethodId: string = "mock_payment_method",
      confirmImmediate: boolean = true,
    ) => {
      try {
        setPurchaseLoading(true);
        setError(null);
        await DashboardDataService.purchaseCredits(
          amount,
          paymentMethodId,
          confirmImmediate,
        );
        await fetchData(); // Refresh data after successful purchase
      } catch (err) {
        setError(err instanceof Error ? err.message : "Purchase failed");
        throw err;
      } finally {
        setPurchaseLoading(false);
      }
    },
    [fetchData],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    credits: data?.credits || 0,
    subscriptionTier: data?.subscriptionTier || "free",
    transactions: data?.transactions || [],
    pricing: data?.pricing || { creditValue: "$0.01", packages: [] },
    stripeConfig: data?.stripeConfig || { configured: false },
    loading,
    error,
    purchaseLoading,
    refetch: fetchData,
    purchaseCredits,
  };
}
