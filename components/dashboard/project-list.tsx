import React from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/constants/ui-themes";
import { formatStandardDate } from "@/lib/utils/time-formatting";

export interface Project {
  id: string;
  name: string;
  description: string;
  blueprintCount: number;
  createdAt: string;
  updatedAt: string;
}

/* eslint-disable-next-line no-unused-vars */
export type ProjectSelectHandler = (project: Project) => void;

interface ProjectListProps {
  projects: Project[];
  selectedProject: Project | null;
  onProjectSelect: ProjectSelectHandler;
  onCreateBlueprint: () => void;
}

export const ProjectList = React.memo(
  ({
    projects,
    selectedProject,
    onProjectSelect,
    onCreateBlueprint,
  }: ProjectListProps) => (
    <div className="lg:col-span-1">
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
        </div>
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {projects.length === 0 ? (
            <EmptyState
              variant="folder"
              title="No projects found"
              description="Create your first project to start building AI-powered blueprints"
              action={
                <Button onClick={onCreateBlueprint}>
                  Create First Blueprint
                </Button>
              }
            />
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className={cn(
                  "p-4 cursor-pointer hover:bg-gray-50",
                  selectedProject?.id === project.id ? "bg-blue-50" : "",
                )}
                onClick={() => onProjectSelect(project)}
              >
                <h3 className="font-medium text-gray-900">{project.name}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {project.description}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-blue-600">
                    {project.blueprintCount} blueprints
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatStandardDate(new Date(project.updatedAt))}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  ),
);

ProjectList.displayName = "ProjectList";
