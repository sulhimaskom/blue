-- Rollback initial schema
-- Date: 2026-01-07
-- Created by: Principal Data Architect

-- Drop tables in reverse order of creation (due to foreign key constraints)
DROP TABLE IF EXISTS "transactions";
DROP TABLE IF EXISTS "blueprints";
DROP TABLE IF EXISTS "projects";
DROP TABLE IF EXISTS "users";
