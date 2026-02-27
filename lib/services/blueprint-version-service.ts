/**
 * Blueprint Version Service
 *
 * Service Layer Implementation following blueprint.md:208-209 principles:
 * - Centralizes all business logic for blueprint version management
 * - Implements proper error handling and data validation
 * - Maintains separation between UI components and business operations
 * - Provides version sorting and pagination capabilities
 *
 * Features:
 * - Version sorting by creation date (newest first)
 * - Paginated version retrieval
 * - Type-safe operations with comprehensive error handling
 *
 * Usage Pattern:
 * - Singleton instance exported for consistent usage
 * - All methods return ServiceResult for consistent error handling
 * - Business logic isolated from UI components
 *
 * @example
 * ```typescript
 * import { blueprintVersionService } from '@/lib/services/blueprint-version-service';
 *
 * const result = await blueprintVersionService.sortVersions(versions, 0, 10);
 * if (result.success) {
 *   console.log('Sorted versions:', result.data.sortedVersions);
 * }
 * ```
 */
import type { Blueprint, Project, User } from '@/lib/db/schema';
import type { ServiceResult } from './service-types';

/**
 * Types for blueprint version data
 */
interface BlueprintVersion {
  id: string;
  version: number;
  createdAt: Date;
  updatedAt: Date | null;
}

interface BlueprintWithProject {
  blueprint: Blueprint;
  project: Project;
  user: User;
  allVersions: BlueprintVersion[];
}

interface SortedVersionsResult {
  sortedVersions: BlueprintVersion[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  blueprintSummary?: {
    id: string;
    projectId: string;
    currentVersion: number;
    name: string;
  };
}

/**
 * Blueprint Version Service
 * Handles version sorting and pagination logic
 */
export class BlueprintVersionService {
  /**
   * Sort versions by creation date (newest first) with pagination
   */
  sortVersions(
    versions: BlueprintVersion[],
    offset: number,
    limit: number
  ): ServiceResult<SortedVersionsResult> {
    try {
      if (!versions || !Array.isArray(versions)) {
        return {
          success: false,
          error: 'Invalid versions array provided',
        };
      }

      // Sort by createdAt descending (newest first)
      const sortedVersions = [...versions].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Apply pagination
      const paginatedVersions = sortedVersions.slice(offset, offset + limit);

      const result: SortedVersionsResult = {
        sortedVersions: paginatedVersions.map(version => ({
          id: version.id,
          version: version.version,
          createdAt: version.createdAt,
          updatedAt: version.updatedAt,
        })),
        pagination: {
          total: versions.length,
          limit,
          offset,
          hasMore: offset + paginatedVersions.length < versions.length,
        },
      };

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sort blueprint versions',
      };
    }
  }

  /**
   * Get paginated versions from blueprint with project data
   */
  getPaginatedVersions(
    blueprintWithProject: BlueprintWithProject,
    offset: number,
    limit: number
  ): ServiceResult<SortedVersionsResult> {
    try {
      const { blueprint, project, allVersions } = blueprintWithProject;

      const sortResult = this.sortVersions(allVersions, offset, limit);

      if (!sortResult.success || !sortResult.data) {
        return sortResult;
      }

      return {
        success: true,
        data: {
          sortedVersions: sortResult.data.sortedVersions,
          pagination: sortResult.data.pagination,
          blueprintSummary: {
            id: blueprint.id,
            projectId: blueprint.projectId,
            currentVersion: blueprint.version,
            name: project.name,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get paginated versions',
      };
    }
  }
}

/**
 * Singleton instance for consistent usage across the application
 */
export const blueprintVersionService = new BlueprintVersionService();
