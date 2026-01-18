-- Rollback for Migration 0017: Add Notification Table Performance Indexes
-- Purpose: Remove notification table performance indexes
-- Date: January 18, 2026
-- Created by: Principal Data Architect
-- Reversible: YES - All indexes can be dropped without data loss

-- =============================================================================
-- Drop Notification Table Performance Indexes
-- =============================================================================

-- Phase 1: Primary User Notification Feed Index
DROP INDEX IF EXISTS idx_notifications_user_created;

-- Phase 2: Unread Notifications Index
DROP INDEX IF EXISTS idx_notifications_user_read_at;

-- Phase 3: Type-Specific Notification Indexes
DROP INDEX IF EXISTS idx_notifications_user_type_created;
DROP INDEX IF EXISTS idx_notifications_type_created;

-- Phase 4: Read Timestamp Index
DROP INDEX IF EXISTS idx_notifications_user_read_timestamp;

-- =============================================================================
-- Verification Query
-- =============================================================================

-- Query to verify indexes were dropped
SELECT
    indexname
FROM pg_indexes
WHERE tablename = 'notifications'
    AND indexname LIKE 'idx_notifications_%'
ORDER BY indexname;

-- Expected output: 0 rows (all notification indexes dropped)
