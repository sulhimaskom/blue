/**
 * Domain-Specific Icons
 */

import { getIconColor } from "@/lib/constants/ui-themes";

export interface IconProps {
  className?: string;
}

export interface ExpandIconProps extends IconProps {
  isExpanded: boolean;
}

export const ExpandIcon = ({
  className = "w-4 h-4 transition-transform",
  isExpanded,
}: ExpandIconProps) => (
  <svg
    className={`${className} ${getIconColor("primary")} ${isExpanded ? "rotate-180" : ""}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M19 9l-7 7-7-7"
    />
  </svg>
);

export const LightbulbIcon = ({ className = "w-5 h-5" }: IconProps) => (
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
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
    />
  </svg>
);

export const TestTubeIcon = ({ className = "w-5 h-5" }: IconProps) => (
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
      d="M9 2v7.312c-2.5 1.313-4 3.794-4 6.688 0 4.418 3.582 8 8 8s8-3.582 8-8c0-2.894-1.5-5.375-4-6.688V2m3 15a5 5 0 01-10 0m5 3v3"
    />
  </svg>
);

export const WebhookIcon = ({ className = "w-5 h-5" }: IconProps) => (
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
      d="M18 8A3 3 0 0022 5v4h-4"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M2 12A3 3 0 005 9H6"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M22 12A3 3 0 0019 15H18"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M2 12A3 3 0 005 15v4h-4"
    />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const LockIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M7 11V7a5 5 0 0110 0v4"
    />
  </svg>
);
