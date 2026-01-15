/**
 * Common Icons - Frequently used across the application
 */

import { getIconColor } from "@/lib/constants/ui-themes";

export interface IconProps {
  className?: string;
}

export const CheckIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg
    className={`${className} ${getIconColor("success")}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M5 13l4 4L19 7"
    />
  </svg>
);

export const ErrorIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg
    className={`${className} ${getIconColor("error")}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

export const WarningIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg
    className={`${className} ${getIconColor("warning")}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

export const RefreshIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

export const XIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

export const PlusIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M12 5v14m-7-7h14"
    />
  </svg>
);

export const Edit2Icon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M17 3a2.828 2.828 0 114 0l-12 12a2 2 0 01-.586 1.414l-4 4a2 2 0 01-1.414.586L2 21.5V17a2 2 0 012-2h11.586l4-4a2 2 0 001.414-.586z"
    />
  </svg>
);

export const Trash2Icon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

export const EyeIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M1 12s4-8 11-8 11 8-8 11-8 11-8-11-8-11-8z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M9.9 4.24A9.12 9.12 0 0112 5c4.478 0 8.268 2.943 9.543 7a9.098 9.098 0 01-9.543 7c-.5 0-1-.317-1.1-.638A10 10 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.098 9.098 0 019.543-7c.5 0 1 .317 1.1.638z"
    />
  </svg>
);

export const EyeOffIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 01.322-1.276m6.122 9.375A10.001 10.001 0 0122 13a9.724 9.724 0 01-2.019 1.638M9 9l1.5 1.5M13 13l1.5 1.5M15 5l1.5 1.5M10 10l.5.5.5"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M3 3l18 18"
    />
  </svg>
);

export const ChevronDown = ({ className = "w-4 h-4" }: IconProps) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M6 9l6 6 6-6"
    />
  </svg>
);

export const ChevronUp = ({ className = "w-4 h-4" }: IconProps) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M18 15l-6-6-6 6"
    />
  </svg>
);
