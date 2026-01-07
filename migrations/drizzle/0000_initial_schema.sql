-- Initial schema migration
-- This migration creates the base tables for The Architect Platform
-- Date: 2026-01-07
-- Created by: Principal Data Architect

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "clerk_id" TEXT UNIQUE NOT NULL,
  "email" TEXT NOT NULL,
  "credits" INTEGER DEFAULT 0 NOT NULL,
  "subscription_tier" TEXT DEFAULT 'free' NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Projects table
CREATE TABLE IF NOT EXISTS "projects" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id" INTEGER REFERENCES "users"("id") ON DELETE CASCADE NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT DEFAULT 'draft' NOT NULL,
  "repo_url" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Blueprints table
CREATE TABLE IF NOT EXISTS "blueprints" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" UUID REFERENCES "projects"("id") ON DELETE CASCADE NOT NULL,
  "version" INTEGER NOT NULL,
  "content_markdown" TEXT NOT NULL,
  "structured_data" JSONB NOT NULL,
  "market_research" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Transactions table
CREATE TABLE IF NOT EXISTS "transactions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" INTEGER REFERENCES "users"("id") ON DELETE CASCADE NOT NULL,
  "amount" INTEGER NOT NULL,
  "credits_added" INTEGER,
  "stripe_payment_id" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);
