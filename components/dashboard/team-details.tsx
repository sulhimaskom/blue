import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/forms/form-input";
import { formatStandardDate } from "@/lib/utils/time-formatting";
import type { Team } from "@/lib/hooks/use-teams-data";

interface TeamDetailsProps {
  team: Team;
  onUpdateTeam: (_id: string, _data: { name: string; description?: string }) => Promise<void>;
  onDeleteTeam: (_id: string) => Promise<void>;
  loading?: boolean;
}

  export const TeamDetails = React.memo(
    ({ team, onUpdateTeam, onDeleteTeam, loading = false }: TeamDetailsProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [teamName, setTeamName] = useState(team.name);
    const [description, setDescription] = useState(team.description || "");
    const [error, setError] = useState<string>("");
    const [updating, setUpdating] = useState(false);

    const handleUpdateTeam = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!teamName.trim()) {
        setError("Team name is required");
        return;
      }

      if (teamName.length > 100) {
        setError("Team name must be 100 characters or less");
        return;
      }

      try {
        setUpdating(true);
        await onUpdateTeam(team.id, { name: teamName, description });
        setIsEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update team");
      } finally {
        setUpdating(false);
      }
    };

    const handleDeleteTeam = async () => {
      if (!confirm(`Are you sure you want to delete "${team.name}"? This action cannot be undone.`)) {
        return;
      }

      try {
        await onDeleteTeam(team.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete team");
      }
    };

    const handleCancelEdit = () => {
      setIsEditing(false);
      setTeamName(team.name);
      setDescription(team.description || "");
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Team Settings</h2>
            {!isEditing && (
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {isEditing ? (
            <form onSubmit={handleUpdateTeam} className="space-y-4">
              <FormInput
                label="Team Name"
                id="editTeamName"
                type="text"
                placeholder="Enter team name"
                required
                maxLength={100}
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                error={error}
                helperText="Use a clear, descriptive team name (1-100 characters)"
              />

              <FormInput
                label="Description (Optional)"
                id="editDescription"
                type="textarea"
                placeholder="Describe your team's purpose and goals"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                helperText="Optional team description for context"
              />

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={updating || loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updating || loading}>
                  {updating ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Team Name
                </h3>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {team.name}
                </p>
              </div>

              {team.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </h3>
                  <p className="mt-1 text-gray-700">{team.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Subscription Tier
                  </h3>
                  <p className="mt-1 text-lg font-semibold text-blue-600">
                    {team.subscriptionTier || "free"}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Members
                  </h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {team.memberCount || 0}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Projects
                  </h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {team.projectCount || 0}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </h3>
                  <p className="mt-1 text-gray-700">
                    {formatStandardDate(new Date(team.createdAt))}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </h3>
                  <p className="mt-1 text-gray-700">
                    {formatStandardDate(new Date(team.updatedAt))}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <Button
                  variant="destructive"
                  onClick={handleDeleteTeam}
                  disabled={loading}
                  className="w-full md:w-auto"
                >
                  Delete Team
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  },
);

TeamDetails.displayName = "TeamDetails";
