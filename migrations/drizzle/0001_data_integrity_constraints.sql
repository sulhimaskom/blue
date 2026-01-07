-- Migration: Data Integrity Constraints
-- Date: 2026-01-07
-- Created by: Principal Data Architect
-- Description: Adds CHECK constraints to prevent data corruption

-- Users table constraints
ALTER TABLE "users" 
  ADD CONSTRAINT IF NOT EXISTS "chk_users_credits_non_negative" 
  CHECK (credits >= 0);

ALTER TABLE "users" 
  ADD CONSTRAINT IF NOT EXISTS "chk_users_email_format" 
  CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$');

ALTER TABLE "users" 
  ADD CONSTRAINT IF NOT EXISTS "chk_users_subscription_tier_enum" 
  CHECK (subscription_tier IN ('free', 'pro', 'enterprise'));

-- Projects table constraints
ALTER TABLE "projects" 
  ADD CONSTRAINT IF NOT EXISTS "chk_projects_status_enum" 
  CHECK (status IN ('draft', 'generating', 'completed', 'deployed'));

ALTER TABLE "projects" 
  ADD CONSTRAINT IF NOT EXISTS "chk_projects_name_length" 
  CHECK (name IS NOT NULL AND LENGTH(TRIM(name)) >= 3);

ALTER TABLE "projects" 
  ADD CONSTRAINT IF NOT EXISTS "chk_projects_repo_url_format" 
  CHECK (repo_url IS NULL OR repo_url ~* '^https?://');

-- Blueprints table constraints
ALTER TABLE "blueprints" 
  ADD CONSTRAINT IF NOT EXISTS "chk_blueprints_version_positive" 
  CHECK (version > 0);

ALTER TABLE "blueprints" 
  ADD CONSTRAINT IF NOT EXISTS "chk_blueprints_content_not_empty" 
  CHECK (content_markdown IS NOT NULL AND LENGTH(TRIM(content_markdown)) > 0);

-- Transactions table constraints
ALTER TABLE "transactions" 
  ADD CONSTRAINT IF NOT EXISTS "chk_transactions_amount_positive" 
  CHECK (amount >= 0);

ALTER TABLE "transactions" 
  ADD CONSTRAINT IF NOT EXISTS "chk_transactions_type_validation" 
  CHECK ((credits_added IS NOT NULL AND credits_added > 0) OR 
         (stripe_payment_id IS NOT NULL AND LENGTH(TRIM(stripe_payment_id)) > 0));
