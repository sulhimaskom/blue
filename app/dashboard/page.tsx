import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { StatsCard } from "@/components/ui/stats-card";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome to your dashboard. Navigate to different sections using the
            sidebar.
          </p>
        </header>

        <section
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          aria-label="Dashboard features"
        >
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
