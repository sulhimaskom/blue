-- Migration 0007: Add CHECK Constraints for Data Validation
-- Purpose: Add database-level validation constraints to ensure data integrity
-- Date: January 17, 2026
-- Created by: Principal Data Architect
-- Reversible: YES - All constraints can be dropped without data loss
-- Business Impact: Prevents invalid data insertion, reduces application errors, enhances compliance

-- =============================================================================
-- Phase 1: Projects Table CHECK Constraints
-- =============================================================================

-- Constraint 1: Validate project status enum
-- Business Logic: Projects can only be in valid status states
-- Prevents: Invalid status values from application bugs or manual database changes
ALTER TABLE projects
ADD CONSTRAINT chk_projects_status_valid
CHECK (status IN ('draft', 'generating', 'completed', 'deployed'));

COMMENT ON CONSTRAINT chk_projects_status_valid ON projects IS 'Ensures project status is one of: draft, generating, completed, deployed';

-- Constraint 2: Validate GitHub URL format (when present)
-- Business Logic: repo_url must be a valid GitHub URL if provided
-- Prevents: Invalid or malformed repository URLs
-- Note: Uses partial constraint (allows NULL values)
ALTER TABLE projects
ADD CONSTRAINT chk_projects_repo_url_format
CHECK (
  repo_url IS NULL OR
  repo_url ~* '^https://github\.com/[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+/?$'
);

COMMENT ON CONSTRAINT chk_projects_repo_url_format ON projects IS 'Ensures repo_url is a valid GitHub URL format when provided (NULL allowed)';

-- =============================================================================
-- Phase 2: Deployments Table CHECK Constraints
-- =============================================================================

-- Constraint 3: Validate deployment environment enum
-- Business Logic: Deployments can only be in valid environment types
-- Prevents: Invalid environment values
ALTER TABLE deployments
ADD CONSTRAINT chk_deployments_environment_valid
CHECK (environment IN ('production', 'staging', 'preview'));

COMMENT ON CONSTRAINT chk_deployments_environment_valid ON deployments IS 'Ensures deployment environment is one of: production, staging, preview';

-- Constraint 4: Validate deployment status enum
-- Business Logic: Deployments can only be in valid status states
-- Prevents: Invalid status values
ALTER TABLE deployments
ADD CONSTRAINT chk_deployments_status_valid
CHECK (status IN ('pending', 'deploying', 'deployed', 'failed', 'deleted'));

COMMENT ON CONSTRAINT chk_deployments_status_valid ON deployments IS 'Ensures deployment status is one of: pending, deploying, deployed, failed, deleted';

-- Constraint 5: Ensure blueprint version is positive
-- Business Logic: Blueprint versions must be positive integers
-- Prevents: Zero or negative version numbers (data integrity issue)
ALTER TABLE deployments
ADD CONSTRAINT chk_deployments_blueprint_version_positive
CHECK (blueprint_version > 0);

COMMENT ON CONSTRAINT chk_deployments_blueprint_version_positive ON deployments IS 'Ensures blueprint_version is a positive integer (> 0)';

-- Constraint 6: Preview environment expiry must be after creation
-- Business Logic: Preview environments should expire after they are created
-- Prevents: Illogical expiry dates in the past
ALTER TABLE deployments
ADD CONSTRAINT chk_deployments_expires_after_created
CHECK (
  expires_at IS NULL OR
  expires_at > created_at
);

COMMENT ON CONSTRAINT chk_deployments_expires_after_created ON deployments IS 'Ensures preview environment expires after creation (NULL allowed for permanent environments)';

-- =============================================================================
-- Phase 3: Blueprints Table CHECK Constraints
-- =============================================================================

-- Constraint 7: Ensure blueprint version is positive
-- Business Logic: Blueprint versions must be positive integers
-- Prevents: Zero or negative version numbers (data integrity issue)
ALTER TABLE blueprints
ADD CONSTRAINT chk_blueprints_version_positive
CHECK (version > 0);

COMMENT ON CONSTRAINT chk_blueprints_version_positive ON blueprints IS 'Ensures blueprint version is a positive integer (> 0)';

-- =============================================================================
-- Phase 4: Transactions Table CHECK Constraints
-- =============================================================================

-- Constraint 8: Ensure transaction amount is positive
-- Business Logic: Transaction amounts (in cents) must be positive
-- Prevents: Zero or negative amounts (financial integrity)
ALTER TABLE transactions
ADD CONSTRAINT chk_transactions_amount_positive
CHECK (amount > 0);

COMMENT ON CONSTRAINT chk_transactions_amount_positive ON transactions IS 'Ensures transaction amount (in cents) is a positive integer (> 0)';

-- Constraint 9: Ensure credits added is non-negative
-- Business Logic: Credits added cannot be negative (credits removed handled separately)
-- Prevents: Negative credit additions (data consistency)
ALTER TABLE transactions
ADD CONSTRAINT chk_transactions_credits_added_non_negative
CHECK (credits_added IS NULL OR credits_added >= 0);

COMMENT ON CONSTRAINT chk_transactions_credits_added_non_negative ON transactions IS 'Ensures credits_added is non-negative (>= 0) or NULL';

-- =============================================================================
-- Phase 5: Webhook Configurations Table CHECK Constraints
-- =============================================================================

-- Constraint 10: Validate retry count range
-- Business Logic: Retry count should be between 1 and 10 attempts
-- Prevents: Excessive retry attempts causing resource exhaustion
ALTER TABLE webhook_configurations
ADD CONSTRAINT chk_webhook_configurations_retry_range
CHECK (retry_count >= 1 AND retry_count <= 10);

COMMENT ON CONSTRAINT chk_webhook_configurations_retry_range ON webhook_configurations IS 'Ensures retry_count is between 1 and 10';

-- Constraint 11: Validate timeout seconds range
-- Business Logic: Timeout should be between 5 seconds and 5 minutes
-- Prevents: Too short (failures) or too long (hangs) timeouts
ALTER TABLE webhook_configurations
ADD CONSTRAINT chk_webhook_configurations_timeout_range
CHECK (timeout_seconds >= 5 AND timeout_seconds <= 300);

COMMENT ON CONSTRAINT chk_webhook_configurations_timeout_range ON webhook_configurations IS 'Ensures timeout_seconds is between 5 and 300 seconds';

-- Constraint 12: Validate webhook URL format
-- Business Logic: Webhook URLs must be valid HTTP/HTTPS URLs
-- Prevents: Invalid or malformed webhook URLs
ALTER TABLE webhook_configurations
ADD CONSTRAINT chk_webhook_configurations_url_format
CHECK (url ~* '^https?://[a-zA-Z0-9.-]+(:[0-9]+)?(/.*)?$');

COMMENT ON CONSTRAINT chk_webhook_configurations_url_format ON webhook_configurations IS 'Ensures webhook URL is a valid HTTP/HTTPS URL';

-- Constraint 13: Ensure webhook secret minimum length
-- Business Logic: Webhook secrets must be at least 16 characters for security
-- Prevents: Weak secrets that could be guessed or cracked
ALTER TABLE webhook_configurations
ADD CONSTRAINT chk_webhook_configurations_secret_min_length
CHECK (length(secret) >= 16);

COMMENT ON CONSTRAINT chk_webhook_configurations_secret_min_length ON webhook_configurations IS 'Ensures webhook secret is at least 16 characters for security';

-- =============================================================================
-- Phase 6: Teams Table CHECK Constraints
-- =============================================================================

-- Constraint 14: Validate subscription tier enum
-- Business Logic: Teams can only be in valid subscription tiers
-- Prevents: Invalid subscription tier values
ALTER TABLE teams
ADD CONSTRAINT chk_teams_subscription_tier_valid
CHECK (subscription_tier IN ('free', 'pro', 'enterprise'));

COMMENT ON CONSTRAINT chk_teams_subscription_tier_valid ON teams IS 'Ensures team subscription tier is one of: free, pro, enterprise';

-- =============================================================================
-- Phase 7: Team Members Table CHECK Constraints
-- =============================================================================

-- Constraint 15: Validate team member role enum
-- Business Logic: Team members can only have valid role types
-- Prevents: Invalid role values (RBAC integrity)
ALTER TABLE team_members
ADD CONSTRAINT chk_team_members_role_valid
CHECK (role IN ('admin', 'member', 'viewer'));

COMMENT ON CONSTRAINT chk_team_members_role_valid ON team_members IS 'Ensures team member role is one of: admin, member, viewer';

-- =============================================================================
-- Phase 8: Users Table CHECK Constraints
-- =============================================================================

-- Constraint 16: Ensure credits are non-negative
-- Business Logic: User credits cannot be negative (system integrity)
-- Prevents: Negative credit balances (data consistency)
ALTER TABLE users
ADD CONSTRAINT chk_users_credits_non_negative
CHECK (credits >= 0);

COMMENT ON CONSTRAINT chk_users_credits_non_negative ON users IS 'Ensures user credits balance is non-negative (>= 0)';

-- =============================================================================
-- Migration Summary
-- =============================================================================
-- Tables Modified: 7 (projects, deployments, blueprints, transactions, webhook_configurations, teams, team_members, users)
-- CHECK Constraints Added: 16 total
-- Business Impact:
--   - Prevents invalid data insertion at database level
--   - Reduces application-level validation burden
--   - Enhances data integrity and consistency
--   - Supports compliance requirements (GDPR, financial regulations)
--   - Improves developer experience with automatic validation feedback
-- Performance Impact:
--   - Minimal overhead on INSERT/UPDATE operations (<1ms per constraint check)
--   - Database-level validation is faster than application-level
--   - Prevents database corruption from invalid data
-- Security Impact:
--   - Financial integrity: Positive transaction amounts
--   - Webhook security: Minimum secret length validation
--   - Access control: Valid role and subscription tier enforcement
--   - URL security: Valid webhook and repository URL formats
-- Migration Safety:
--   - Reversible: All constraints can be dropped without data loss
--   - Non-destructive: Only adds validation, no schema changes
--   - Backward compatible: Existing data validated during migration
-- =============================================================================
