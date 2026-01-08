"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { useProjectsData } from "@/lib/hooks/use-dashboard-data";

interface DeploymentForm {
  githubOrg: string;
  repoName: string;
  isPrivate: boolean;
}

interface DeploymentForm {
  githubOrg: string;
  repoName: string;
  isPrivate: boolean;
}

export default function ProjectsPage() {
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deploymentForm, setDeploymentForm] = useState<DeploymentForm>({
    githubOrg: "",
    repoName: "",
    isPrivate: false,
  });

  const {
    projects,
    selectedProject,
    blueprints,
    loading,
    error,
    deploying,
    handleProjectSelect,
    deployToRepository,
  } = useProjectsData();

  const handleDeploy = async (blueprintId?: string) => {
    if (!selectedProject) return;

    const deployId = blueprintId || selectedProject.id;

    try {
      await deployToRepository(deployId, deploymentForm);
      setShowDeployModal(false);
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
            Projects & Deployment
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your projects and deploy blueprints to GitHub repositories.
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
                  </div>
                ) : (
                  projects.map((project) => (
                    <div
                      key={project.id}
                      className={`p-4 cursor-pointer hover:bg-gray-50 ${
                        selectedProject?.id === project.id ? "bg-blue-50" : ""
                      }`}
                      onClick={() => handleProjectSelect(project)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {project.name}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {project.description}
                          </p>
                          <div className="flex items-center mt-2 space-x-4">
                            <span className="text-sm text-blue-600">
                              {project.blueprintCount} blueprints
                            </span>
                            {project.deploymentStatus?.isDeployed && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Deployed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Project Details & Deployment */}
          <div className="lg:col-span-2">
            {selectedProject ? (
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedProject.name}
                    </h2>
                    <Button
                      onClick={() => setShowDeployModal(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Deploy to GitHub
                    </Button>
                  </div>
                </div>
                <div className="p-6">
                  {/* Deployment Status */}
                  {selectedProject.deploymentStatus?.isDeployed && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center">
                        <svg
                          className="w-5 h-5 text-green-500 mr-2"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <div>
                          <h3 className="text-sm font-medium text-green-800">
                            Successfully Deployed
                          </h3>
                          <p className="text-sm text-green-700 mt-1">
                            Repository{" "}
                            <a
                              href={selectedProject.deploymentStatus.repoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium underline"
                            >
                              {selectedProject.deploymentStatus.githubOrg}/
                              {selectedProject.deploymentStatus.repoName}
                            </a>{" "}
                            is ready for development.
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            Deployed on{" "}
                            {new Date(
                              selectedProject.deploymentStatus.deployedAt!,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Project Info */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                      Project Details
                    </h3>
                    <dl className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm text-gray-600">Status</dt>
                        <dd className="text-sm font-medium text-gray-900">
                          {selectedProject.status}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-600">Blueprints</dt>
                        <dd className="text-sm font-medium text-gray-900">
                          {selectedProject.blueprintCount}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-600">Created</dt>
                        <dd className="text-sm font-medium text-gray-900">
                          {new Date(
                            selectedProject.createdAt,
                          ).toLocaleDateString()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-600">Last Updated</dt>
                        <dd className="text-sm font-medium text-gray-900">
                          {new Date(
                            selectedProject.updatedAt,
                          ).toLocaleDateString()}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Blueprints List */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">
                      Blueprints
                    </h3>
                    {blueprints.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No blueprints found</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {blueprints.map((blueprint) => (
                          <div
                            key={blueprint.id}
                            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">
                                  {blueprint.title}
                                </h4>
                                <p className="text-sm text-gray-600 mt-1">
                                  {blueprint.description}
                                </p>
                                <div className="flex items-center mt-2 space-x-4">
                                  <span className="text-sm text-gray-500">
                                    Version {blueprint.version}
                                  </span>
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      blueprint.status === "completed"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-yellow-100 text-yellow-800"
                                    }`}
                                  >
                                    {blueprint.status}
                                  </span>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeploy(blueprint.id)}
                                disabled={deploying}
                              >
                                Deploy
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                    Choose a project to view details and deploy to GitHub.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Deployment Modal */}
        {showDeployModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Deploy to GitHub
                  </h2>
                  <button
                    onClick={() => setShowDeployModal(false)}
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
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="githubOrg"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      GitHub Organization/Username
                    </label>
                    <input
                      type="text"
                      id="githubOrg"
                      value={deploymentForm.githubOrg}
                      onChange={(e) =>
                        setDeploymentForm({
                          ...deploymentForm,
                          githubOrg: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="my-org"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="repoName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Repository Name
                    </label>
                    <input
                      type="text"
                      id="repoName"
                      value={deploymentForm.repoName}
                      onChange={(e) =>
                        setDeploymentForm({
                          ...deploymentForm,
                          repoName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="my-project"
                    />
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={deploymentForm.isPrivate}
                        onChange={(e) =>
                          setDeploymentForm({
                            ...deploymentForm,
                            isPrivate: e.target.checked,
                          })
                        }
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">
                        Private repository
                      </span>
                    </label>
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeployModal(false)}
                    disabled={deploying}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleDeploy()}
                    disabled={
                      deploying ||
                      !deploymentForm.githubOrg ||
                      !deploymentForm.repoName
                    }
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {deploying ? (
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
                        Deploying...
                      </>
                    ) : (
                      "Deploy Project"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
