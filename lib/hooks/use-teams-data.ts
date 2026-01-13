import { useState, useEffect, useCallback } from "react";

export interface Team {
  id: string;
  name: string;
  description: string | null;
  ownerId: number;
  subscriptionTier: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  projectCount?: number;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: number;
  role: "admin" | "member" | "viewer";
  user: {
    id: number;
    email: string;
    clerkId: string;
  };
  joinedAt: string;
}

/**
 * Custom hook for teams data management
 * Consolides data fetching logic for team management UI
 *
 * Features:
 * - Automatic data fetching on mount
 * - Consistent error handling
 * - Loading state management
 * - Team creation
 * - Team member management
 * - Refetch functionality
 */
export function useTeamsData() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/teams");
      const result = await response.json();
      if (result.success) {
        setTeams(result.data.teams || []);
      } else {
        setError(result.error || "Failed to load teams");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeamMembers = useCallback(async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members`);
      const result = await response.json();
      if (result.success) {
        setTeamMembers(result.data.members || []);
      } else {
        setError(result.error || "Failed to load team members");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team members");
    }
  }, []);

  const createTeam = useCallback(
    async (formData: { name: string; description?: string }) => {
      try {
        setCreating(true);
        setError(null);
        const response = await fetch("/api/teams", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });
        const result = await response.json();
        if (result.success) {
          await fetchTeams();
          return result.data;
        } else {
          setError(result.error || "Failed to create team");
          throw new Error(result.error || "Failed to create team");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create team";
        setError(errorMessage);
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [fetchTeams],
  );

  const deleteTeam = useCallback(
    async (teamId: string) => {
      try {
        setError(null);
        const response = await fetch(`/api/teams/${teamId}`, {
          method: "DELETE",
        });
        const result = await response.json();
        if (result.success) {
          await fetchTeams();
        } else {
          setError(result.error || "Failed to delete team");
          throw new Error(result.error || "Failed to delete team");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete team");
        throw err;
      }
    },
    [fetchTeams],
  );

  const addTeamMember = useCallback(
    async (teamId: string, email: string, role: string) => {
      try {
        setError(null);
        const response = await fetch(`/api/teams/${teamId}/members`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, role }),
        });
        const result = await response.json();
        if (result.success) {
          await fetchTeamMembers(teamId);
        } else {
          setError(result.error || "Failed to add team member");
          throw new Error(result.error || "Failed to add team member");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add team member");
        throw err;
      }
    },
    [fetchTeamMembers],
  );

  const removeTeamMember = useCallback(
    async (teamId: string, userId: number) => {
      try {
        setError(null);
        const response = await fetch(
          `/api/teams/${teamId}/members/${userId}`,
          {
            method: "DELETE",
          },
        );
        const result = await response.json();
        if (result.success) {
          await fetchTeamMembers(teamId);
        } else {
          setError(result.error || "Failed to remove team member");
          throw new Error(result.error || "Failed to remove team member");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove team member");
        throw err;
      }
    },
    [fetchTeamMembers],
  );

  const handleTeamSelect = useCallback(async (team: Team) => {
    setSelectedTeam(team);
    await fetchTeamMembers(team.id);
  }, [fetchTeamMembers]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  return {
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
    refetch: fetchTeams,
  };
}
