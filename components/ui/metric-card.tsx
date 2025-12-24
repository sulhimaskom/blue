import { cn } from "@/lib/utils";
import { ActivityIcon, ServerIcon, ChartIcon } from "./icons";
import { StatusIndicator, type StatusType } from "./status-indicator";

interface MetricSummary {
  count: number;
  avg: number;
  min: number;
  max: number;
  unit: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  status?: StatusType;
  icon?: "activity" | "server" | "chart";
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
  };
  className?: string;
  children?: React.ReactNode;
}

export function MetricCard({
  title,
  value,
  subtitle,
  status,
  icon,
  trend,
  className,
  children,
}: MetricCardProps) {
  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case "activity":
        return ActivityIcon;
      case "server":
        return ServerIcon;
      case "chart":
        return ChartIcon;
      default:
        return null;
    }
  };

  const IconComponent = icon ? getIconComponent(icon) : null;
  const trendingUp = trend?.direction === "up";
  const trendingDown = trend?.direction === "down";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      {/* Status indicator overlay */}
      {status && (
        <div className="absolute top-4 right-4">
          <StatusIndicator status={status} size="sm" showText={false} />
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Title */}
          <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
            {title}
          </h3>

          {/* Main value */}
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {trend && (
              <span
                className={cn(
                  "text-sm font-medium",
                  trendingUp
                    ? "text-green-600"
                    : trendingDown
                      ? "text-red-600"
                      : "text-gray-500",
                )}
              >
                {trendingUp ? "↑" : trendingDown ? "↓" : "→"}{" "}
                {Math.abs(trend.value)}%
              </span>
            )}
          </div>

          {/* Subtitle */}
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}

          {/* Additional content */}
          {children && <div className="mt-4">{children}</div>}
        </div>

        {/* Icon */}
        {IconComponent && (
          <div className="ml-4 flex-shrink-0">
            <div className="rounded-lg bg-gray-50 p-3">
              <IconComponent className="w-6 h-6 text-gray-400" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface MetricSummaryProps {
  title: string;
  summary: MetricSummary;
  className?: string;
}

export function MetricSummaryCard({
  title,
  summary,
  className,
}: MetricSummaryProps) {
  return (
    <MetricCard
      title={title}
      value={`${summary.avg}${summary.unit}`}
      subtitle={`Avg of ${summary.count} samples`}
      icon="chart"
      className={className}
    >
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Min:</span>
          <span className="ml-1 font-medium">
            {summary.min}
            {summary.unit}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Max:</span>
          <span className="ml-1 font-medium">
            {summary.max}
            {summary.unit}
          </span>
        </div>
      </div>
    </MetricCard>
  );
}
