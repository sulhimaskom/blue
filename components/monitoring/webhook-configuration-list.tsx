"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import type { WebhookConfiguration } from "@/lib/db/schema";

interface WebhookConfigurationListProps {
  configs: WebhookConfiguration[];
  onEdit: (_config: WebhookConfiguration) => void;
  onDelete: (_id: string) => void;
  onTest: (_id: string) => void;
}

export default function WebhookConfigurationList({
  configs,
  onEdit,
  onDelete,
  onTest,
}: WebhookConfigurationListProps) {
  return (
    <div className="space-y-4">
      {configs.map((config) => (
        <div key={config.id} className="border rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{config.name}</h3>
              <p className="text-sm text-gray-600">{config.url}</p>
              <p className="text-sm text-gray-500">
                Status: {config.isActive ? "Active" : "Inactive"}
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(config)}
              >
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTest(config.id)}
              >
                Test
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(config.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
