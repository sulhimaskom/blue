/**
 * Type definitions for blueprint comparison service
 */

export interface BlueprintVersionComparison {
  fromVersion: {
    id: string;
    version: number;
    content: string;
    createdAt: Date;
  };
  toVersion: {
    id: string;
    version: number;
    content: string;
    createdAt: Date;
  };
  changes: BlueprintChange[];
  summary: ComparisonSummary;
}

export interface BlueprintChange {
  type: 'addition' | 'deletion' | 'modification';
  path: string;
  from?: string | object;
  to?: string | object;
  significance?: 'low' | 'medium' | 'high';
  lineNumbers?: {
    from?: number;
    to?: number;
  };
}

export interface ComparisonSummary {
  totalChanges: number;
  additions: number;
  deletions: number;
  modifications: number;
  significance: 'low' | 'medium' | 'high';
  impactScore: number;
}

export interface BlueprintContent {
  id: string;
  version: number;
  content: string;
  metadata: {
    title?: string;
    description?: string;
    author?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ComparisonOptions {
  ignoreWhitespace?: boolean;
  ignoreComments?: boolean;
  contextLines?: number;
  significanceThreshold?: number;
}