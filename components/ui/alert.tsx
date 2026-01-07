import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { XIcon } from "./icons";
import { getUIText } from "@/lib/constants/ui-text";

const alertVariants = cva("relative w-full rounded-lg border p-4", {
  variants: {
    variant: {
      default: "bg-background text-foreground border-border",
      destructive:
        "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      warning:
        "border-yellow-500/50 text-yellow-700 dark:border-yellow-500 dark:text-yellow-200 [&>svg]:text-yellow-500",
      success:
        "border-green-500/50 text-green-700 dark:border-green-500 dark:text-green-200 [&>svg]:text-green-500",
      info: "border-blue-500/50 text-blue-700 dark:border-blue-500 dark:text-blue-200 [&>svg]:text-blue-500",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface AlertProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  dismissible?: boolean;
  onDismiss?: () => void;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, dismissible, onDismiss, role, ...props }, ref) => {
    const alertRole = role || variant === "destructive" ? "alert" : "status";

    return (
      <div
        ref={ref}
        role={alertRole}
        className={cn(alertVariants({ variant }), className)}
        aria-live={variant === "destructive" ? "assertive" : "polite"}
        {...props}
      >
        {props.children}
        {dismissible && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            aria-label={getUIText("common", "close")}
          >
            <XIcon className="h-4 w-4" />
            <span className="sr-only">{getUIText("common", "close")}</span>
          </button>
        )}
      </div>
    );
  },
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
