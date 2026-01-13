import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/forms/form-input";
import { cn } from "@/lib/constants/ui-themes";
import { formatStandardDate } from "@/lib/utils/time-formatting";
import type { TeamMember } from "@/lib/hooks/use-teams-data";

interface TeamMemberListProps {
  members: TeamMember[];
  onAddMember: (_email: string, _role: string) => Promise<void>;
  onRemoveMember: (_userId: number) => Promise<void>;
  loading?: boolean;
}

export const TeamMemberList = React.memo(
  ({ members, onAddMember, onRemoveMember, loading = false }: TeamMemberListProps) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"admin" | "member" | "viewer">("member");
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState<string>("");

    const handleAddMember = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!email.trim()) {
        setError("Email is required");
        return;
      }

      try {
        setAdding(true);
        await onAddMember(email, role);
        setEmail("");
        setRole("member");
        setShowAddForm(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add member");
      } finally {
        setAdding(false);
      }
    };

    const handleRemoveMember = async (_userId: number) => {
      if (!confirm("Are you sure you want to remove this member from the team?")) {
        return;
      }

      try {
        await onRemoveMember(_userId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove member");
      }
    };

    const getRoleBadgeColor = (role: string) => {
      switch (role) {
        case "admin":
          return "bg-purple-100 text-purple-800";
        case "member":
          return "bg-blue-100 text-blue-800";
        case "viewer":
          return "bg-gray-100 text-gray-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
            {!showAddForm && (
              <Button size="sm" onClick={() => setShowAddForm(true)}>
                Add Member
              </Button>
            )}
          </div>
        </div>

        {showAddForm && (
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <form onSubmit={handleAddMember} className="space-y-4">
              <FormInput
                label="Member Email"
                id="memberEmail"
                type="email"
                placeholder="Enter member email address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error}
              />

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(false)}
                  disabled={adding}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={adding}>
                  {adding ? "Adding..." : "Add Member"}
                </Button>
              </div>
            </form>
          </div>
        )}

        <div className="divide-y divide-gray-200">
          {members.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500">No team members yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Add members to collaborate on projects
              </p>
            </div>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-800">
                        {member.user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {member.user.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            getRoleBadgeColor(member.role),
                          )}
                        >
                          {member.role}
                        </span>
                        <span className="text-xs text-gray-500">
                          Joined {formatStandardDate(new Date(member.joinedAt))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMember(member.userId)}
                  disabled={loading}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Remove
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  },
);

TeamMemberList.displayName = "TeamMemberList";
