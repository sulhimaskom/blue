/**
 * Icons Index - Re-exports all icon categories for backward compatibility
 *
 * For optimal bundle size, import specific icon categories instead of this file:
 * - import { CheckIcon, ErrorIcon } from '@/components/ui/icons/common'
 * - import { ServerIcon, ChartIcon } from '@/components/ui/icons/monitoring'
 */

export * from './common';
export * from './status';
export * from './activity';
export * from './monitoring';
export * from './project';
export * from './enterprise';
export * from './domain';

export type { IconProps, ExpandIconProps } from './domain';
