import { cn } from "@/lib/utils";
import { CheckIcon, WarningIcon, ErrorIcon } from "./icons";

export type StatusType = "healthy" | "degraded" | "unhealthy" | "unknown";

interface StatusIndicatorProps {
  status: StatusType;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  showText?: boolean;
  className?: string;
}

export function StatusIndicator({
  status,
  size = "md",
  showIcon = true,
  showText = true,
  className,
}: StatusIndicatorProps) {
  const getStatusConfig = (status: StatusType) => {
    switch (status) {
      case "healthy":
        return {
          color: "text-green-700 bg-green-50 border-green-200",
          icon: CheckIcon,
          text: "Healthy",
        };
      case "degraded":
        return {
          color: "text-yellow-700 bg-yellow-50 border-yellow-200",
          icon: WarningIcon,
          text: "Degraded",
        };
      case "unhealthy":
        return {
          color: "text-red-700 bg-red-50 border-red-200",
          icon: ErrorIcon,
          text: "Unhealthy",
        };
      default:
        return {
          color: "text-gray-700 bg-gray-50 border-gray-200",
          icon: null,
          text: "Unknown",
        };
    }
  };

  const getSizeClasses = (size: "sm" | "md" | "lg") => {
    switch (size) {
      case "sm":
        return "px-2 py-1 text-xs";
      case "lg":
        return "px-4 py-2 text-base";
      default:
        return "px-3 py-1.5 text-sm";
    }
  };

  const config = getStatusConfig(status);
  const IconComponent = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border font-medium",
        getSizeClasses(size),
        config.color,
        className,
      )}
    >
      {showIcon && IconComponent && <IconComponent />}
      {showText && <span>{config.text}</span>}
    </div>
  );
}
