/**
 * Type definitions for cache key generation service
 */

export interface CacheKeyGenerationOptions {
  prefix?: string;
  namespace?: string;
  version?: string;
  includeTimestamp?: boolean;
  userId?: string;
  sessionId?: string;
}

export interface CacheKeyComponents {
  service: string;
  operation: string;
  identifier: string;
  parameters?: Record<string, unknown>;
  context?: {
    userId?: string;
    teamId?: string;
    sessionId?: string;
  };
  version?: string;
}

export interface NormalizedCacheData {
  key: string;
  value: unknown;
  metadata?: {
    source?: string;
    timestamp?: Date;
    version?: string;
  };
}

export interface ETagGenerationOptions {
  algorithm?: 'md5' | 'sha1' | 'sha256';
  includeMetadata?: boolean;
  customSalt?: string;
}

export interface CacheValidationResult {
  isValid: boolean;
  etag?: string;
  lastModified?: Date;
  reason?: string;
}