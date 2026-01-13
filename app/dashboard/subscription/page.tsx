"use client";

import { SubscriptionDashboard } from "@/components/dashboard/usage/subscription-dashboard";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function SubscriptionPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Subscription Management
          </h1>
          <p className="mt-2 text-gray-600">
            View your current subscription, manage usage, and upgrade your plan.
          </p>
        </div>

        <SubscriptionDashboard />
      </div>
    </DashboardLayout>
  );
}
