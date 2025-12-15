-- Fix Stamp Test Data for Reward Testing
-- This script sets dates to be clearly in the past in GMT+8 timezone
-- Run this BEFORE testing the 7-stamp reward

-- Replace with your user ID
-- Current user: b68d7b65-e23f-4edb-b7d5-a676ee3672fb

-- IMPORTANT: Set dates to be at least 2 days ago to account for GMT+8 timezone
-- This ensures the dates are definitely in the past regardless of timezone

UPDATE users
SET 
    "stampsCollected" = 6,
    -- Set to 2 days ago at 12:00 PM (noon) to be safe
    "lastStampClaimDate" = (NOW() - INTERVAL '2 days')::timestamp + INTERVAL '12 hours',
    "lastLoginAt" = (NOW() - INTERVAL '2 days')::timestamp + INTERVAL '12 hours',
    "firstStampClaimDate" = (NOW() - INTERVAL '7 days')::timestamp + INTERVAL '12 hours'
WHERE id = 'b68d7b65-e23f-4edb-b7d5-a676ee3672fb';

-- Verify the update
SELECT 
    id,
    email,
    "stampsCollected",
    "lastStampClaimDate",
    "lastLoginAt",
    "firstStampClaimDate",
    -- Calculate hours since last stamp (should be > 24)
    ROUND(EXTRACT(EPOCH FROM (NOW() - "lastStampClaimDate")) / 3600, 2) as hours_since_last_stamp,
    -- Calculate hours since last login (should be > 24)
    ROUND(EXTRACT(EPOCH FROM (NOW() - "lastLoginAt")) / 3600, 2) as hours_since_last_login,
    -- Check if dates are on different days (in GMT+8, this is approximate)
    TO_CHAR("lastStampClaimDate", 'YYYY-MM-DD') as last_stamp_date,
    TO_CHAR(NOW(), 'YYYY-MM-DD') as current_date
FROM users
WHERE id = 'b68d7b65-e23f-4edb-b7d5-a676ee3672fb';
