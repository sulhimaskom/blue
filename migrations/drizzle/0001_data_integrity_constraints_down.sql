-- Rollback: Data Integrity Constraints
-- Date: 2026-01-07
-- Created by: Principal Data Architect
-- Description: Removes CHECK constraints (WARNING: Increases data corruption risk)

-- WARNING: Removing these constraints increases risk of data corruption
-- Only rollback if absolutely necessary

-- Transactions table constraints
ALTER TABLE "transactions" 
  DROP CONSTRAINT IF EXISTS "chk_transactions_type_validation";

ALTER TABLE "transactions" 
  DROP CONSTRAINT IF EXISTS "chk_transactions_amount_positive";

-- Blueprints table constraints
ALTER TABLE "blueprints" 
  DROP CONSTRAINT IF EXISTS "chk_blueprints_content_not_empty";

ALTER TABLE "blueprints" 
  DROP CONSTRAINT IF EXISTS "chk_blueprints_version_positive";

-- Projects table constraints
ALTER TABLE "projects" 
  DROP CONSTRAINT IF EXISTS "chk_projects_repo_url_format";

ALTER TABLE "projects" 
  DROP CONSTRAINT IF EXISTS "chk_projects_name_length";

ALTER TABLE "projects" 
  DROP CONSTRAINT IF EXISTS "chk_projects_status_enum";

-- Users table constraints
ALTER TABLE "users" 
  DROP CONSTRAINT IF EXISTS "chk_users_subscription_tier_enum";

ALTER TABLE "users" 
  DROP CONSTRAINT IF EXISTS "chk_users_email_format";

ALTER TABLE "users" 
  DROP CONSTRAINT IF EXISTS "chk_users_credits_non_negative";
