"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { StatsCard } from "@/components/ui/stats-card";
import { DashboardDataService } from "@/lib/services/dashboard-data-service";
import { logger } from "@/lib/logger";

interface UserCredits {
  credits: number;
  subscriptionTier: string;
}

export default function DashboardPage() {
  const { isSignedIn } = useUser();
  const [userCredits, setUserCredits] = useState<UserCredits>({
    credits: 0,
    subscriptionTier: "free",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSignedIn) {
      fetchUserCredits();
    }
  }, [isSignedIn]);

  const fetchUserCredits = async () => {
    try {
      // Service Layer: Use centralized DashboardDataService instead of direct API calls
      const data = await DashboardDataService.getCreditsData();
      setUserCredits({
        credits: data.credits,
        subscriptionTier: data.subscriptionTier,
      });
    } catch (error) {
      // Log errors properly using the centralized logger
      logger.error("Failed to fetch user credits in dashboard", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome to your dashboard. Navigate to different sections using the
            sidebar.
          </p>
          {!loading && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800">
                You have{" "}
                <span className="font-bold">{userCredits.credits}</span> credits
                available
                {userCredits.subscriptionTier !== "free" && (
                  <span className="ml-2 text-sm">
                    ({userCredits.subscriptionTier} tier)
                  </span>
                )}
              </p>
            </div>
          )}
        </header>

        <section
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          aria-label="Dashboard features"
        >
          <DashboardCard
            title="Credits Management"
            description="View your credit balance, purchase credits, and manage your subscription tier."
            buttonText="Manage Credits"
            href="/dashboard/credits"
            badge={{
              text: `${userCredits.credits} Credits`,
              variant: "neutral",
            }}
          />

          <DashboardCard
            title="Blueprint Management"
            description="Create, view, and manage AI-generated blueprints for your projects."
            buttonText="Manage Blueprints"
            href="/dashboard/blueprints"
          />

          <DashboardCard
            title="Monitoring"
            description="View system performance, health metrics, and real-time monitoring data."
            buttonText="View Monitoring"
            href="/dashboard/monitoring"
          />

          <DashboardCard
            title="Enterprise Themes"
            description="Manage white-label themes and custom branding for enterprise customers."
            buttonText="Manage Themes"
            href="/dashboard/enterprise/themes"
          />

          <DashboardCard
            title="GitHub Deployment"
            description="Deploy your blueprints directly to GitHub repositories with one click."
            buttonText="Deploy to GitHub"
            href="/dashboard/projects"
            buttonVariant="primary"
            badge={{
              text: "Production Ready",
              variant: "success",
            }}
          />

          <DashboardCard
            title="Analytics"
            description="View detailed analytics and insights about your platform usage, performance metrics, and API statistics."
            buttonText="View Analytics"
            href="/api/metrics"
            target="_blank"
            rel="noopener noreferrer"
            badge={{
              text: "Live Data",
              variant: "neutral",
            }}
          />
        </section>

        <section
          className="mt-8 bg-white p-6 rounded-lg border border-gray-200"
          aria-label="Quick stats"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quick Stats
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatsCard label="System Health" value="Good" />
            <StatsCard label="Active Services" value="18" />
            <StatsCard label="Response Time" value="45ms" />
            <StatsCard label="Uptime" value="99.9%" />
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
