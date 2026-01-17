import React from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
              <EmptyState
                variant="document"
                title="No blueprints yet"
                description="Get started by creating your first AI-generated blueprint for this project"
                action={
                  <Button
                    onClick={onCreateBlueprint}
                    className="w-full sm:w-auto"
                  >
                    Create Blueprint
                  </Button>
                }
              />
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
          <EmptyState
            variant="folder"
            title="Select a project"
            description="Choose a project from the list to view and manage its blueprints"
          />
        </div>
      )}
    </div>
  ),
);

BlueprintList.displayName = "BlueprintList";
