import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "default" | "text" | "circular" | "rounded";
}

export function Skeleton({ className, variant = "default" }: SkeletonProps) {
  const variantClasses = {
    default: "rounded-md",
    text: "rounded",
    circular: "rounded-full",
    rounded: "rounded-lg",
  };

  return (
    <div
      className={cn(
        "animate-pulse bg-gray-200 dark:bg-gray-700",
        variantClasses[variant],
        className,
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

interface MetricCardSkeletonProps {
  className?: string;
}

export function MetricCardSkeleton({ className }: MetricCardSkeletonProps) {
  return (
    <div className={cn("bg-white rounded-lg shadow p-6 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Skeleton variant="circular" className="h-8 w-8" />
        <Skeleton variant="text" className="h-4 w-16" />
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" className="h-6 w-24" />
        <Skeleton variant="text" className="h-4 w-32" />
      </div>
      <div className="pt-4 border-t border-gray-200">
        <Skeleton variant="text" className="h-3 w-20" />
      </div>
    </div>
  );
}

interface DashboardSkeletonProps {
  className?: string;
}

export function DashboardSkeleton({ className }: DashboardSkeletonProps) {
  return (
    <div
      className={cn(
        "min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6 lg:p-8",
        className,
      )}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Skeleton */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start">
          <div className="mb-6 lg:mb-0">
            <div className="flex items-center gap-3 mb-2">
              <Skeleton variant="circular" className="h-10 w-10" />
              <Skeleton variant="text" className="h-6 w-64" />
            </div>
            <Skeleton variant="text" className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton variant="rounded" className="h-10 w-32" />
            <Skeleton variant="rounded" className="h-10 w-24" />
          </div>
        </div>

        {/* Metrics Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>

        {/* Service Status Skeleton */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <Skeleton variant="text" className="h-5 w-32 mb-2" />
            <Skeleton variant="text" className="h-4 w-48" />
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg"
                >
                  <Skeleton variant="circular" className="h-8 w-8" />
                  <div className="flex-1 space-y-1">
                    <Skeleton variant="text" className="h-4 w-24" />
                    <Skeleton variant="text" className="h-3 w-16" />
                  </div>
                  <Skeleton variant="circular" className="h-6 w-6" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
