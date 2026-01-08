"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useBlueprintValidation } from "@/lib/hooks/use-blueprint-validation";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { ProjectList } from "@/components/dashboard/project-list";
import { BlueprintList } from "@/components/dashboard/blueprint-list";

const BlueprintCreateModal = lazy(() =>
  import("@/components/dashboard/blueprint-create-modal").then((m) => ({
    default: m.BlueprintCreateModal,
  })),
);

interface Project {
  id: string;
  name: string;
  description: string;
  blueprintCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Blueprint {
  id: string;
  title: string;
  description: string;
  version: number;
  status: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

interface BlueprintStats {
  totalProjects: number;
  totalBlueprints: number;
  completedBlueprints: number;
  draftBlueprints: number;
  lastActivity: string;
}

export default function BlueprintsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [stats, setStats] = useState<BlueprintStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [credits, setCredits] = useState(0);

  const { formData, validateForm, resetValidation } = useBlueprintValidation(
    {
      debounceMs: 300,
      enableRealtimeValidation: true,
      enableSuggestions: true,
    },
    {},
  );

  useEffect(() => {
    fetchBlueprintsData();
  }, []);

  const fetchBlueprintsData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/blueprints", {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch blueprints: ${response.statusText}`);
      }

      const data = await response.json();
      setProjects(data.projects || []);
      setStats({
        totalProjects: data.projects?.length || 0,
        totalBlueprints: data.performanceMetrics?.totalOptimizations || 0,
        completedBlueprints: data.performanceMetrics?.totalOptimizations || 0,
        draftBlueprints: 0,
        lastActivity: new Date().toISOString(),
      });
      setCredits(data.credits || 0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load blueprints",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectBlueprints = async (project: Project) => {
    try {
      const response = await fetch(`/api/projects/${project.id}/blueprints`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch project blueprints: ${response.statusText}`,
        );
      }

      const data = await response.json();
      setBlueprints(data.blueprints || []);
    } catch (err) {
      setBlueprints([]);
    }
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    fetchProjectBlueprints(project);
  };

  const handleCreateBlueprint = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate entire form before submission
    const validationResult = await validateForm();

    if (!validationResult.isValid) {
      setError("Please fix the validation errors before submitting");
      return;
    }

    try {
      const response = await fetch("/api/blueprints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            `Failed to create blueprint: ${response.statusText}`,
        );
      }

      await response.json();
      setShowCreateForm(false);
      resetValidation(); // Reset validation state
      fetchBlueprintsData(); // Refresh data

      // Show success message
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create blueprint",
      );
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Blueprint Management
          </h1>
          <p className="mt-2 text-gray-600">
            Create, view, and manage your AI-generated blueprints.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {stats && <StatsOverview stats={stats} credits={credits} />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <ProjectList
            projects={projects}
            selectedProject={selectedProject}
            onProjectSelect={handleProjectSelect}
            onCreateBlueprint={() => {
              setShowCreateForm(true);
              resetValidation();
            }}
          />
          <BlueprintList
            selectedProject={selectedProject}
            blueprints={blueprints}
            onCreateBlueprint={() => setShowCreateForm(true)}
          />
        </div>

        {showCreateForm && (
          <Suspense fallback={<div>Loading...</div>}>
            <BlueprintCreateModal
              isOpen={showCreateForm}
              onClose={() => {
                setShowCreateForm(false);
                resetValidation();
              }}
              onSubmit={handleCreateBlueprint}
              credits={credits}
            />
          </Suspense>
        )}
      </div>
    </DashboardLayout>
  );
}
