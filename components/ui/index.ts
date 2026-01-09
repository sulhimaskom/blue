// UI Component Exports
// Centralized exports for all reusable UI components

// Layout Components
export { BaseCard } from "./base-card";
export { GradientCard } from "./gradient-card";
export type { BaseCardProps } from "./base-card";

// Error Handling
export { ErrorBoundary } from "./error-boundary";

// Loading States
export { Skeleton, MetricCardSkeleton, DashboardSkeleton } from "./skeleton";

// Data Display Components
export { MetricCard, MetricSummaryCard } from "./metric-card";
export { StatusIndicator } from "./status-indicator";
export type { StatusType } from "@/lib/services/service-types";

// Icons (selective exports of available icons)
export {
  ChartIcon,
  ActivityIcon,
  ServerIcon,
  CheckIcon,
  ErrorIcon,
  WarningIcon,
} from "./icons";
export type { IconProps } from "./icons";

// Table Component System
export {
  BaseTable,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "./table";
export type {
  BaseTableProps,
  TableHeaderProps,
  TableBodyProps,
  TableRowProps,
  TableCellProps,
  TableColumn,
} from "./table";
