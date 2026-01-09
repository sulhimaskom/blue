import { cn } from "@/lib/utils";
import { CheckIcon, WarningIcon, ErrorIcon } from "./icons";
import {
  STATUS_THEMES,
  SIZE_VARIANTS,
  type StatusThemeType,
} from "@/lib/constants/ui-themes";
import type { StatusType } from "@/lib/services/service-types";

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
    const themeKey =
      status === "unknown" ? "unknown" : (status as StatusThemeType);
    const theme = STATUS_THEMES[themeKey];

    switch (status) {
      case "healthy":
        return {
          color: theme.combined,
          icon: CheckIcon,
          text: "Healthy",
        };
      case "degraded":
        return {
          color: theme.combined,
          icon: WarningIcon,
          text: "Degraded",
        };
      case "unhealthy":
        return {
          color: theme.combined,
          icon: ErrorIcon,
          text: "Unhealthy",
        };
      default:
        return {
          color: theme.combined,
          icon: null,
          text: "Unknown",
        };
    }
  };

  const getSizeClasses = (size: "sm" | "md" | "lg") => {
    return SIZE_VARIANTS.indicator[size];
  };

  const config = getStatusConfig(status);
  const IconComponent = config.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`${config.text} status`}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border font-medium",
        getSizeClasses(size),
        config.color,
        className,
      )}
    >
      {showIcon && IconComponent && <IconComponent aria-hidden="true" />}
      {showText && <span>{config.text}</span>}
    </div>
  );
}
