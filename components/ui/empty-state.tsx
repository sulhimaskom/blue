import * as React from "react";
import { cn } from "@/lib/utils";
import { FolderIcon, DocumentIcon, ArchiveIcon } from "./icons";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "folder" | "document" | "archive" | "custom";
  size?: "sm" | "md" | "lg";
}

const iconVariants = {
  default: null,
  folder: FolderIcon,
  document: DocumentIcon,
  archive: ArchiveIcon,
  custom: null,
};

const sizeClasses = {
  sm: { icon: "w-10 h-10", title: "text-base", description: "text-sm" },
  md: { icon: "w-12 h-12", title: "text-lg", description: "text-sm" },
  lg: { icon: "w-16 h-16", title: "text-xl", description: "text-base" },
};

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      icon,
      title,
      description,
      action,
      variant = "default",
      size = "md",
      className,
      ...props
    },
    ref,
  ) => {
    const IconComponent = variant !== "custom" ? iconVariants[variant] : null;
    const sizeConfig = sizeClasses[size];

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center text-center p-12",
          className,
        )}
        role="status"
        aria-live="polite"
        {...props}
      >
        {icon && (
          <div className="mb-4">
            {React.cloneElement(icon as React.ReactElement, {
              className: cn("mx-auto text-gray-400", sizeConfig.icon),
            })}
          </div>
        )}

        {IconComponent && !icon && (
          <div
            className={cn(
              "mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center",
              size === "sm" ? "p-2" : "p-3",
            )}
          >
            <IconComponent
              className={cn(
                "text-gray-400",
                size === "lg" ? "w-8 h-8" : "w-6 h-6",
              )}
              aria-hidden="true"
            />
          </div>
        )}

        <h3 className={cn("font-medium text-gray-900 mb-2", sizeConfig.title)}>
          {title}
        </h3>

        {description && (
          <p
            className={cn(
              "text-gray-500 mb-4 max-w-md",
              sizeConfig.description,
            )}
          >
            {description}
          </p>
        )}

        {action && <div className="mt-4">{action}</div>}
      </div>
    );
  },
);

EmptyState.displayName = "EmptyState";

export { EmptyState };
