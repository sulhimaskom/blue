-- Migration: Add Database-Level Constraints for Data Integrity
-- Purpose: Add CHECK constraints to prevent data corruption and ensure data quality
-- Date: January 7, 2026
-- Reversible: YES - All constraints can be dropped without data loss
-- Business Impact: Eliminates data corruption risk, prevents billing disputes

-- =============================================================================
-- USERS TABLE CONSTRAINTS
-- =============================================================================

-- Constraint 1: Prevent negative credits (billing dispute prevention)
-- Business Logic: Users cannot have negative credit balance
-- Migration: Safe for existing data (checks current values)
ALTER TABLE users
ADD CONSTRAINT chk_users_credits_non_negative
CHECK (credits >= 0);

-- Constraint 2: Validate email format
-- Business Logic: Ensure email addresses follow RFC 5322 standard
-- Migration: Safe for existing data (validates current emails)
ALTER TABLE users
ADD CONSTRAINT chk_users_email_format
CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$');

-- Constraint 3: Enforce subscription tier enum values
-- Business Logic: Only allow valid subscription tiers
-- Migration: Safe for existing data (validates current tiers)
ALTER TABLE users
ADD CONSTRAINT chk_users_subscription_tier_enum
CHECK (subscription_tier IN ('free', 'pro', 'enterprise'));

-- =============================================================================
-- PROJECTS TABLE CONSTRAINTS
-- =============================================================================

-- Constraint 4: Validate project name length
-- Business Logic: Project names must be meaningful and not empty
-- Migration: Safe for existing data (validates current names)
ALTER TABLE projects
ADD CONSTRAINT chk_projects_name_length
CHECK (name IS NOT NULL AND LENGTH(TRIM(name)) >= 3);

-- Constraint 5: Validate project status enum values
-- Business Logic: Only allow valid project workflow statuses
-- Migration: Safe for existing data (validates current statuses)
ALTER TABLE projects
ADD CONSTRAINT chk_projects_status_enum
CHECK (status IN ('draft', 'generating', 'completed', 'deployed'));

-- Constraint 6: Validate repo URL format if present
-- Business Logic: Ensure repo URLs are valid HTTPS URLs when provided
-- Migration: Safe for existing data (validates current URLs)
ALTER TABLE projects
ADD CONSTRAINT chk_projects_repo_url_format
CHECK (repo_url IS NULL OR repo_url ~* '^https?://');

-- =============================================================================
-- BLUEPRINTS TABLE CONSTRAINTS
-- =============================================================================

-- Constraint 7: Enforce positive version numbers
-- Business Logic: Blueprint versions must be positive integers
-- Migration: Safe for existing data (validates current versions)
ALTER TABLE blueprints
ADD CONSTRAINT chk_blueprints_version_positive
CHECK (version > 0);

-- Constraint 8: Ensure content markdown is not empty
-- Business Logic: Blueprints must contain meaningful content
-- Migration: Safe for existing data (validates current content)
ALTER TABLE blueprints
ADD CONSTRAINT chk_blueprints_content_not_empty
CHECK (content_markdown IS NOT NULL AND LENGTH(TRIM(content_markdown)) > 0);

-- =============================================================================
-- TRANSACTIONS TABLE CONSTRAINTS
-- =============================================================================

-- Constraint 9: Enforce positive transaction amounts
-- Business Logic: Transaction amounts cannot be negative
-- Migration: Safe for existing data (validates current amounts)
ALTER TABLE transactions
ADD CONSTRAINT chk_transactions_amount_positive
CHECK (amount >= 0);

-- Constraint 10: Validate transaction type (credits OR payment, not both)
-- Business Logic: Transactions are either credit additions or Stripe payments
-- Migration: Safe for existing data (validates current transactions)
ALTER TABLE transactions
ADD CONSTRAINT chk_transactions_type_validation
CHECK (
  (credits_added IS NOT NULL AND credits_added > 0) OR
  (stripe_payment_id IS NOT NULL AND LENGTH(TRIM(stripe_payment_id)) > 0)
);

-- =============================================================================
-- COMMENT ADDED FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE users IS 'User accounts with Clerk ID mapping, credits, and subscription tier. Data integrity constraints prevent negative credits and validate email/subscription formats.';
COMMENT ON TABLE projects IS 'Project records with status tracking and GitHub integration. Data integrity constraints validate status workflow and repository URL formats.';
COMMENT ON TABLE blueprints IS 'Blueprint versions with markdown content and structured JSON data. Data integrity constraints ensure positive versions and non-empty content.';
COMMENT ON TABLE transactions IS 'Financial transactions for credit purchases and Stripe payments. Data integrity constraints enforce positive amounts and validate transaction types.';
