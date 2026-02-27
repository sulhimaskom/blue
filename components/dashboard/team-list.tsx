import React from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/constants/ui-themes";
import { formatStandardDate } from "@/lib/utils/time-formatting";
import type { Team } from "@/lib/hooks/use-teams-data";

// eslint-disable-next-line no-unused-vars -- Type definition parameters are intentionally unused
export type TeamSelectHandler = (team: Team) => void;

interface TeamListProps {
  teams: Team[];
  selectedTeam: Team | null;
  onTeamSelect: TeamSelectHandler;
  onCreateTeam: () => void;
}

export const TeamList = React.memo(
  ({ teams, selectedTeam, onTeamSelect, onCreateTeam }: TeamListProps) => (
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Teams</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {teams.length === 0 ? (
              <EmptyState
                variant="folder"
                title="No teams found"
                description="Get started by creating your first team to collaborate on projects"
                action={
                  <Button onClick={onCreateTeam}>
                    Create First Team
                  </Button>
                }
              />
            ) : (
              teams.map((_team) => (
                <div
                  key={_team.id}
                  className={cn(
                    "p-4 cursor-pointer hover:bg-gray-50 hover:scale-[1.01] transition-all duration-200",
                    selectedTeam?.id === _team.id ? "bg-blue-50" : "",
                  )}
                  onClick={() => onTeamSelect(_team)}
                >
                  <h3 className="font-medium text-gray-900">{_team.name}</h3>
                  {_team.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {_team.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-blue-600">
                        {_team.memberCount || 0} members
                      </span>
                      <span className="text-sm text-blue-600">
                        {_team.projectCount || 0} projects
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatStandardDate(new Date(_team.updatedAt))}
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

TeamList.displayName = "TeamList";
