"use client";

import { useState, lazy, Suspense } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useTeamsData } from "@/lib/hooks/use-teams-data";
import { DashboardSkeleton } from "@/components/ui/skeleton";

const TeamList = lazy(() =>
  import("@/components/dashboard/team-list").then((m) => ({
    default: m.TeamList,
  })),
);

const TeamCreateModal = lazy(() =>
  import("@/components/dashboard/team-create-modal").then((m) => ({
    default: m.TeamCreateModal,
  })),
);

const TeamDetails = lazy(() =>
  import("@/components/dashboard/team-details").then((m) => ({
    default: m.TeamDetails,
  })),
);

const TeamMemberList = lazy(() =>
  import("@/components/dashboard/team-member-list").then((m) => ({
    default: m.TeamMemberList,
  })),
);


export default function TeamsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTeamDetails, setShowTeamDetails] = useState(false);

  const {
    teams,
    selectedTeam,
    teamMembers,
    loading,
    error,
    creating,
    createTeam,
    deleteTeam,
    addTeamMember,
    removeTeamMember,
    handleTeamSelect,
  } = useTeamsData();

  const handleCreateTeam = async (e: React.FormEvent) => {
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const teamName = formData.get("teamName") as string;
    const description = formData.get("description") as string;

    await createTeam({
      name: teamName,
      description: description || undefined,
    });
    setShowCreateModal(false);
  };

  const handleUpdateTeam = async (
    id: string,
    data: { name: string; description?: string },
  ) => {
    try {
      const response = await fetch(`/api/teams/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to update team");
      }
      await handleTeamSelect(selectedTeam!);
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteTeam = async (id: string) => {
    await deleteTeam(id);
    setShowTeamDetails(false);
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
            Team Management
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your teams, invite members, and collaborate on projects.
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
                    d="M10 18a8 8 0 100-16 8 8 0 016 0zm1-13a1 1 0 00-1 1v4a1 1 0 001 1v1a1 1 0 00-2 0v-1a1 1 0 00-1-1zm0 9a1 1 0 011-1 1 1 0 01-1 1v-1a1 1 0 00-2 0v1a1 1 0 011 1zM10 2a8 8 0 00-8 8 8 0 000 16 8 8 0 000-16zM9 9a1 1 0 011-1V7a1 1 0 10-2h2a1 1 0 110 2v2a1 1 0 110 1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Suspense fallback={<DashboardSkeleton />}>
              <TeamList
                teams={teams}
                selectedTeam={selectedTeam}
                onTeamSelect={(team) => {
                  handleTeamSelect(team);
                  setShowTeamDetails(true);
                }}
                onCreateTeam={() => setShowCreateModal(true)}
              />
            </Suspense>
          </div>

          <div className="lg:col-span-2">
            {selectedTeam && showTeamDetails ? (
              <div className="space-y-6">
                <Suspense fallback={<DashboardSkeleton />}>
                  <TeamDetails
                    team={selectedTeam}
                    onUpdateTeam={handleUpdateTeam}
                    onDeleteTeam={handleDeleteTeam}
                    loading={creating}
                  />
                </Suspense>
                <Suspense fallback={<DashboardSkeleton />}>
                  <TeamMemberList
                    members={teamMembers}
                    onAddMember={async (email, role) => {
                      await addTeamMember(selectedTeam.id, email, role);
                    }}
                    onRemoveMember={async (userId) => {
                      await removeTeamMember(selectedTeam.id, userId);
                    }}
                    loading={creating}
                  />
                </Suspense>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v-1m0 0a6 6 0 00-12 0v1m3.17-5a2 2 0 00-1.11-1.82l-3.39-3.14A6 6 0 006 13H4a6 6 0 00-6 6v1a6 6 0 0012 0v-1M20 15v1a2 2 0 002 2h-1.37m0-6.83l-2.89 2.68"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Select a team
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Choose a team from list to view details and manage members
                </p>
              </div>
            )}
          </div>
        </div>

        <Suspense fallback={<DashboardSkeleton />}>
          <TeamCreateModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateTeam}
            loading={creating}
          />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
