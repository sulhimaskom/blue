import React from "react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/forms/form-input";
import { Modal } from "@/components/ui/modal";

type FormSubmitHandler = (_e: React.FormEvent) => Promise<void>;

export interface TeamCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: FormSubmitHandler;
  loading: boolean;
}

  export const TeamCreateModal = React.memo(
    ({ isOpen, onClose, onSubmit, loading }: TeamCreateModalProps) => {
      const [teamName, setTeamName] = React.useState("");
      const [description, setDescription] = React.useState("");
      const [error, setError] = React.useState<string>("");

      const handleSubmit = async (e: React.FormEvent) => {
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
          await onSubmit(e);
          handleClose();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to create team");
        }
      };

      const handleClose = () => {
        onClose();
        setTeamName("");
        setDescription("");
        setError("");
      };

      return (
        <Modal
          isOpen={isOpen}
          onClose={handleClose}
          title="Create New Team"
          size="md"
          aria-label="Create new team modal"
        >
          <form onSubmit={handleSubmit} name="teamForm">
            <div className="space-y-6">
              <FormInput
                name="teamName"
                label="Team Name"
                id="teamName"
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
                name="description"
                label="Description (Optional)"
                id="description"
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
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create Team"}
                </Button>
              </div>
          </div>
        </form>
      </Modal>
    );
  },
);

TeamCreateModal.displayName = "TeamCreateModal";
