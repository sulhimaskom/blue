"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { TeamDetails } from "@/components/dashboard/team-details";
import { TeamMemberList } from "@/components/dashboard/team-member-list";
import type { Team } from "@/lib/hooks/use-teams-data";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export default function TeamDetailsPage({ params }: RouteParams) {
  const router = useRouter();
  const [teamId, setTeamId] = useState<string | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadTeamData = async () => {
      const { id } = await params;
      setTeamId(id);

      try {
        setLoading(true);
        setError(null);

        const [teamResponse, membersResponse] = await Promise.all([
          fetch(`/api/teams/${id}`),
          fetch(`/api/teams/${id}/members`),
        ]);

        const teamResult = await teamResponse.json();
        const membersResult = await membersResponse.json();

        if (teamResult.success) {
          setTeam(teamResult.data);
        } else {
          setError(teamResult.error || "Failed to load team");
        }

        if (membersResult.success) {
          setTeamMembers(membersResult.data.members || []);
        } else {
          setError(membersResult.error || "Failed to load team members");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load team data");
      } finally {
        setLoading(false);
      }
    };

    loadTeamData();
  }, [params]);

  const handleUpdateTeam = async (id: string, data: { name: string; description?: string }) => {
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
      setTeam(result.data);
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteTeam = async (id: string) => {
    try {
      setDeleting(true);
      const response = await fetch(`/api/teams/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to delete team");
      }
      router.push("/dashboard/teams");
    } catch (err) {
      setDeleting(false);
      throw err;
    }
  };

  const handleAddMember = async (email: string, role: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, role }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to add team member");
      }
      setTeamMembers([...teamMembers, result.data]);
    } catch (err) {
      throw err;
    }
  };

  const handleRemoveMember = async (userId: number) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members/${userId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to remove team member");
      }
      setTeamMembers(teamMembers.filter((m: any) => m.userId !== userId));
    } catch (err) {
      throw err;
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

  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-red-800 mb-2">
              Team Not Found
            </h2>
            <p className="text-red-700 mb-6">{error}</p>
            <Button onClick={() => router.push("/dashboard/teams")}>
              Back to Teams
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!team) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Team Not Found
            </h2>
            <p className="text-gray-600 mb-6">
              The team you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
            </p>
            <Button onClick={() => router.push("/dashboard/teams")}>
              Back to Teams
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/teams")}
          >
            ← Back to Teams
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TeamDetails
              team={team}
              onUpdateTeam={handleUpdateTeam}
              onDeleteTeam={handleDeleteTeam}
              loading={deleting}
            />

            <TeamMemberList
              members={teamMembers}
              onAddMember={handleAddMember}
              onRemoveMember={handleRemoveMember}
              loading={deleting}
            />
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Quick Actions
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <Button
                  className="w-full"
                  onClick={() => router.push("/dashboard/projects")}
                >
                  Create Project
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => router.push("/dashboard/blueprints")}
                >
                  Create Blueprint
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => router.push("/dashboard/credits")}
                >
                  View Credits
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
