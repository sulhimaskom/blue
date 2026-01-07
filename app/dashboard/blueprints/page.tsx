"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/constants/ui-themes";
import { useBlueprintValidation } from "@/lib/hooks/use-blueprint-validation";
import {
  ValidatedInput,
  FormProgress,
} from "@/components/ui/validation-feedback";

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

  const {
    formData,
    validateForm,
    resetValidation,
    getFieldProps,
    canSubmit,
    validationState,
    fieldStates,
  } = useBlueprintValidation(
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

  const [credits, setCredits] = useState(0);

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

        {/* Stats Overview */}
        {stats && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalProjects}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">Total Blueprints</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.totalBlueprints}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">Available Credits</p>
              <p className="text-2xl font-bold text-green-600">{credits}</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">Last Activity</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date(stats.lastActivity).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Projects List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Projects
                </h2>
              </div>
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {projects.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-gray-500">No projects found</p>
                    <Button
                      onClick={() => {
                        setShowCreateForm(true);
                        resetValidation(); // Reset validation when opening form
                      }}
                      className="mt-4"
                    >
                      Create First Blueprint
                    </Button>
                  </div>
                ) : (
                  projects.map((project) => (
                    <div
                      key={project.id}
                      className={cn(
                        "p-4 cursor-pointer hover:bg-gray-50",
                        selectedProject?.id === project.id ? "bg-blue-50" : "",
                      )}
                      onClick={() => handleProjectSelect(project)}
                    >
                      <h3 className="font-medium text-gray-900">
                        {project.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {project.description}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-blue-600">
                          {project.blueprintCount} blueprints
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Blueprints Detail */}
          <div className="lg:col-span-2">
            {selectedProject ? (
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedProject.name} - Blueprints
                    </h2>
                    <Button
                      onClick={() => {
                        setShowCreateForm(true);
                        resetValidation(); // Reset validation when opening form
                      }}
                      variant="outline"
                    >
                      Create New Blueprint
                    </Button>
                  </div>
                </div>
                <div className="p-6">
                  {blueprints.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg
                          className="w-6 h-6 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2">
                        No blueprints yet
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Get started by creating your first AI-generated
                        blueprint for this project.
                      </p>
                      <Button onClick={() => setShowCreateForm(true)}>
                        Create Blueprint
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {blueprints.map((blueprint) => (
                        <div
                          key={blueprint.id}
                          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">
                                {blueprint.title}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">
                                {blueprint.description}
                              </p>
                              <div className="flex items-center mt-2 space-x-4">
                                <span className="text-sm text-gray-500">
                                  Version {blueprint.version}
                                </span>
                                <span
                                  className={cn(
                                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                    blueprint.status === "completed"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-yellow-100 text-yellow-800",
                                  )}
                                >
                                  {blueprint.status}
                                </span>
                              </div>
                            </div>
                            <div className="flex space-x-2 ml-4">
                              <Button variant="outline" size="sm">
                                View
                              </Button>
                              <Button variant="outline" size="sm">
                                Edit
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-12 text-center">
                  <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg
                      className="w-6 h-6 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select a project
                  </h3>
                  <p className="text-gray-500">
                    Choose a project from the list to view and manage its
                    blueprints.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create Blueprint Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Create New Blueprint
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      resetValidation(); // Reset validation when closing form
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <form onSubmit={handleCreateBlueprint} className="p-6">
                {/* Form Progress Indicator */}
                <FormProgress
                  fieldStates={fieldStates}
                  formData={{
                    projectName: formData.projectName,
                    input: formData.input,
                    projectDescription: formData.projectDescription || "",
                  }}
                  requiredFields={["projectName", "input"]}
                />

                <div className="space-y-6">
                  <ValidatedInput
                    label="Project Name"
                    id="projectName"
                    type="text"
                    placeholder="Enter project name"
                    required
                    maxLength={50}
                    validationProps={{
                      value: getFieldProps("projectName").value || "",
                      onChange: getFieldProps("projectName").onChange,
                      onBlur: getFieldProps("projectName").onBlur,
                      error: getFieldProps("projectName").error,
                      warning: getFieldProps("projectName").warning,
                      isValid: getFieldProps("projectName").isValid,
                      isTouched: getFieldProps("projectName").isTouched,
                      isValidating: getFieldProps("projectName").isValidating,
                      suggestions: getFieldProps("projectName").suggestions,
                    }}
                    helperText="Use clear, descriptive naming (3-50 characters)"
                  />

                  <ValidatedInput
                    label="Blueprint Description"
                    id="input"
                    type="textarea"
                    placeholder="Describe the blueprint you want to generate (10-1000 characters)"
                    required
                    maxLength={1000}
                    rows={6}
                    validationProps={{
                      value: getFieldProps("input").value || "",
                      onChange: getFieldProps("input").onChange,
                      onBlur: getFieldProps("input").onBlur,
                      error: getFieldProps("input").error,
                      warning: getFieldProps("input").warning,
                      isValid: getFieldProps("input").isValid,
                      isTouched: getFieldProps("input").isTouched,
                      isValidating: getFieldProps("input").isValidating,
                      suggestions: getFieldProps("input").suggestions,
                    }}
                    helperText="Be specific about features, target users, and purpose"
                  />
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div className="flex">
                      <svg
                        className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="text-sm text-blue-800">
                        <p className="font-medium">
                          Real-time Validation Active
                        </p>
                        <p>
                          Creating a blueprint will deduct 1 credit from your
                          account. You currently have {credits} credits
                          available. Your form is validated in real-time to help
                          create better blueprints.
                        </p>
                        {!canSubmit && (
                          <p className="mt-2 text-yellow-700">
                            Complete all required fields and fix validation
                            errors to submit.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      resetValidation();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      credits < 1 ||
                      !canSubmit ||
                      validationState.form.isSubmitting
                    }
                  >
                    {validationState.form.isSubmitting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Creating Blueprint...
                      </>
                    ) : (
                      `Create Blueprint (1 Credit)`
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
