"use client";

import { useState, lazy, Suspense } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useBlueprintValidation } from "@/lib/hooks/use-blueprint-validation";
import { useBlueprintsData } from "@/lib/hooks/use-dashboard-data";
import { ValidationError } from "@/lib/api-utils";
import { DashboardSkeleton } from "@/components/ui/skeleton";

const BlueprintCreateModal = lazy(() =>
  import("@/components/dashboard/blueprint-create-modal").then((m) => ({
    default: m.BlueprintCreateModal,
  })),
);

const StatsOverview = lazy(() =>
  import("@/components/dashboard/stats-overview").then((m) => ({
    default: m.StatsOverview,
  })),
);

const ProjectList = lazy(() =>
  import("@/components/dashboard/project-list").then((m) => ({
    default: m.ProjectList,
  })),
);

const BlueprintList = lazy(() =>
  import("@/components/dashboard/blueprint-list").then((m) => ({
    default: m.BlueprintList,
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

export default function BlueprintsPage() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { formData, validateForm, resetValidation } = useBlueprintValidation(
    {
      debounceMs: 300,
      enableRealtimeValidation: true,
      enableSuggestions: true,
    },
    {},
  );

  const {
    projects,
    stats,
    credits,
    loading,
    error,
    fetchProjectBlueprints,
    selectedProjectBlueprints,
    createBlueprint,
  } = useBlueprintsData();

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    fetchProjectBlueprints(project.id);
  };

  const handleCreateBlueprint = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate entire form before submission
    const validationResult = await validateForm();

    if (!validationResult.isValid) {
      // Error will be handled by the hook's error state
      throw new ValidationError("Please fix the validation errors before submitting");
    }

    try {
      await createBlueprint(formData);
      setShowCreateForm(false);
      resetValidation(); // Reset validation state
    } catch (err) {
      // Error is handled by the hook
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

        {stats && (
          <Suspense fallback={<DashboardSkeleton />}>
            <StatsOverview stats={stats} credits={credits} />
          </Suspense>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Suspense fallback={<DashboardSkeleton />}>
            <ProjectList
              projects={projects}
              selectedProject={selectedProject}
              onProjectSelect={handleProjectSelect}
              onCreateBlueprint={() => {
                setShowCreateForm(true);
                resetValidation();
              }}
            />
          </Suspense>
          <Suspense fallback={<DashboardSkeleton />}>
            <BlueprintList
              selectedProject={selectedProject}
              blueprints={selectedProjectBlueprints}
              onCreateBlueprint={() => setShowCreateForm(true)}
            />
          </Suspense>
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
