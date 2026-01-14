"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface CloneProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  onClone: (_name: string, _description: string) => Promise<void>;
}

export default function CloneProjectModal({
  isOpen,
  onClose,
  projectName,
  onClone,
}: CloneProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCloning, setIsCloning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(`${projectName} (Clone)`);
      setDescription("");
      setIsCloning(false);
    }
  }, [isOpen, projectName]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setIsCloning(true);
    try {
      await onClone(name, description);
      onClose();
    } catch (_error) {
      // Error handling is done by the caller
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Clone Project
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
              disabled={isCloning}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="clone-name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Project Name
              </label>
              <input
                type="text"
                id="clone-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isCloning}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`${projectName} (Clone)`}
              />
            </div>
            <div>
              <label
                htmlFor="clone-description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description
              </label>
              <textarea
                id="clone-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isCloning}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional description for the cloned project"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isCloning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isCloning || !name.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isCloning ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Cloning...
                </>
              ) : (
                "Clone Project"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
