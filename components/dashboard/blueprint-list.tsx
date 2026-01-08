import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/constants/ui-themes";

interface Project {
  id: string;
  name: string;
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

interface BlueprintListProps {
  selectedProject: Project | null;
  blueprints: Blueprint[];
  onCreateBlueprint: () => void;
}

export const BlueprintList = React.memo(
  ({ selectedProject, blueprints, onCreateBlueprint }: BlueprintListProps) => (
    <div className="lg:col-span-2">
      {selectedProject ? (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                {selectedProject.name} - Blueprints
              </h2>
              <Button
                onClick={onCreateBlueprint}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Create New Blueprint
              </Button>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            {blueprints.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
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
                <p className="text-sm text-gray-500 mb-4 px-4 sm:px-0">
                  Get started by creating your first AI-generated blueprint for
                  this project.
                </p>
                <Button
                  onClick={onCreateBlueprint}
                  className="w-full sm:w-auto"
                >
                  Create Blueprint
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {blueprints.map((blueprint) => (
                  <div
                    key={blueprint.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {blueprint.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {blueprint.description}
                        </p>
                        <div className="flex items-center mt-2 flex-wrap gap-3">
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
                      <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 sm:flex-none"
                        >
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 sm:flex-none"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white border-green-600 flex-1 sm:flex-none"
                          onClick={() => {
                            window.location.href = `/dashboard/projects?blueprint=${blueprint.id}`;
                          }}
                        >
                          Deploy
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
          <div className="p-8 sm:p-12 text-center">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
              Select a project
            </h3>
            <p className="text-sm sm:text-base text-gray-500 px-4 sm:px-0">
              Choose a project from the list to view and manage its blueprints.
            </p>
          </div>
        </div>
      )}
    </div>
  ),
);

BlueprintList.displayName = "BlueprintList";
