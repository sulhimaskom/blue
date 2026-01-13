"use client";

import React from "react";
import { PlusIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { ListLoadingSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { WebhookCard } from "./webhook-card";
import type { WebhookConfiguration } from "@/lib/services/webhook-management-service";

interface WebhookListProps {
  webhooks: WebhookConfiguration[];
  loading: boolean;
  testingWebhookId: string | null;
  showSecrets: Record<string, boolean>;
  onTest: (_id: string) => void;
  onViewHistory: (_id: string, _name: string) => void;
  onToggleSecret: (_id: string) => void;
  onRotateSecret: (_id: string) => void;
  onEdit: (_webhook: WebhookConfiguration) => void;
  onDelete: (_id: string) => void;
  onAddWebhook: () => void;
}

export function WebhookList({
  webhooks,
  loading,
  testingWebhookId,
  showSecrets,
  onTest,
  onViewHistory,
  onToggleSecret,
  onRotateSecret,
  onEdit,
  onDelete,
  onAddWebhook,
}: WebhookListProps) {
  if (loading) {
    return <ListLoadingSkeleton loading={loading} rowCount={5} />;
  }

  if (webhooks.length === 0) {
    return (
      <EmptyState
        title="No webhooks configured"
        description="Create your first webhook to start receiving real-time event notifications"
        action={
          <Button onClick={onAddWebhook}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Webhook
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
          Webhook Configurations
        </h2>
        <Button onClick={onAddWebhook} className="w-full sm:w-auto">
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Webhook
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {webhooks.map((webhook) => (
          <WebhookCard
            key={webhook.id}
            webhook={webhook}
            testingWebhookId={testingWebhookId}
            showSecret={showSecrets[webhook.id] || false}
            onTest={onTest}
            onViewHistory={onViewHistory}
            onToggleSecret={onToggleSecret}
            onRotateSecret={onRotateSecret}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
