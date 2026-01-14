import React from "react";
import { cn } from "@/lib/constants/ui-themes";

interface UnreadCountBadgeProps {
  count: number;
  className?: string;
}

export const UnreadCountBadge = React.memo(
  ({ count, className }: UnreadCountBadgeProps) => {
    if (count === 0) return null;

    return (
      <span
        className={cn(
          "inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 translate-y-1/4",
          "bg-red-500 rounded-full min-w-[1.25rem] h-5",
          className
        )}
        aria-label={`${count} unread notification${count !== 1 ? "s" : ""}`}
      >
        {count > 99 ? "99+" : count}
      </span>
    );
  }
);

UnreadCountBadge.displayName = "UnreadCountBadge";
