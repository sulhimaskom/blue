'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navigationUI } from '@/lib/constants/navigation-ui';
import { cn } from '@/lib/utils';

/**
 * Breadcrumb segment mapping route paths to human-readable labels
 */
const breadcrumbMap: Record<string, string> = {
  '': navigationUI.breadcrumbs.home,
  dashboard: navigationUI.breadcrumbs.dashboard,
  blueprints: navigationUI.breadcrumbs.blueprints,
  projects: navigationUI.breadcrumbs.projects,
  teams: navigationUI.breadcrumbs.teams,
  notifications: navigationUI.breadcrumbs.notifications,
  subscription: navigationUI.breadcrumbs.subscription,
  credits: navigationUI.breadcrumbs.credits,
  monitoring: navigationUI.breadcrumbs.monitoring,
  'circuit-breakers': navigationUI.breadcrumbs.circuitBreakers,
  'performance-analytics': navigationUI.breadcrumbs.performanceAnalytics,
  enterprise: navigationUI.breadcrumbs.enterprise,
  themes: navigationUI.breadcrumbs.themes,
  settings: navigationUI.breadcrumbs.settings,
  activity: navigationUI.breadcrumbs.activity,
  webhooks: navigationUI.breadcrumbs.webhooks,
};

export interface BreadcrumbItem {
  /** URL path segment */
  href: string;
  /** Display label */
  label: string;
  /** Whether this is the current page (last item) */
  isActive?: boolean;
}

/**
 * Parse pathname into breadcrumb items
 * @param pathname - Current route pathname
 * @returns Array of breadcrumb items
 */
function parsePathname(pathname: string): BreadcrumbItem[] {
  // Remove trailing slash and split
  const segments = pathname.replace(/\/$/, '').split('/').filter(Boolean);

  if (segments.length === 0) {
    return [{ href: '/', label: breadcrumbMap[''], isActive: true }];
  }

  const items: BreadcrumbItem[] = [];

  // Always add home link
  items.push({ href: '/', label: breadcrumbMap[''] });

  // Build breadcrumb path
  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;
    const label = breadcrumbMap[segment] || segment;

    items.push({
      href: currentPath,
      label,
      isActive: isLast,
    });
  });

  return items;
}

export interface BreadcrumbsProps {
  /** Additional CSS classes */
  className?: string;
  /** Show home link at the beginning */
  showHome?: boolean;
  /** Separator between breadcrumb items */
  separator?: string;
}

/**
 * Breadcrumb navigation component
 * Displays current location in the app hierarchy with clickable links
 * Feature: Issue #764 - Dashboard Navigation Simplification
 */
export function Breadcrumbs({ className, showHome = true, separator = '/' }: BreadcrumbsProps) {
  const pathname = usePathname();

  // Parse pathname into breadcrumb items
  const items = parsePathname(pathname);

  // Filter out home if disabled
  const displayItems = showHome ? items : items.filter(item => item.href !== '/');

  if (displayItems.length <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb navigation"
      className={cn('flex items-center gap-1 text-sm', className)}
    >
      <ol className="flex items-center gap-1 list-none p-0 m-0">
        {displayItems.map((item, index) => (
          <li key={item.href} className="flex items-center gap-1">
            {index > 0 && (
              <span className="mx-2 text-muted-foreground" aria-hidden="true">
                {separator}
              </span>
            )}
            {item.isActive ? (
              <span className="font-medium text-foreground" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-muted-foreground hover:text-foreground hover:bg-gray-100 hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded px-1"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
