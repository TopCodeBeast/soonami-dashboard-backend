-- Test Script for 7-Stamp Reward Logic
-- Replace '<user_id>' with your actual user ID: b68d7b65-e23f-4edb-b7d5-a676ee3672fb

-- Step 1: Check current state
SELECT 
    id,
    email,
    "stampsCollected",
    "lastStampClaimDate",
    "lastLoginAt",
    "firstStampClaimDate",
    gem,
    "updatedAt"
FROM users
WHERE id = 'b68d7b65-e23f-4edb-b7d5-a676ee3672fb';

-- Step 2: Set up for testing (6 stamps, all dates 25+ hours ago)
UPDATE users
SET 
    "stampsCollected" = 6,
    "lastStampClaimDate" = NOW() - INTERVAL '25 hours',
    "lastLoginAt" = NOW() - INTERVAL '25 hours',
    "firstStampClaimDate" = NOW() - INTERVAL '6 days'
WHERE id = 'b68d7b65-e23f-4edb-b7d5-a676ee3672fb';

-- Step 3: Verify the update
SELECT 
    id,
    email,
    "stampsCollected",
    "lastStampClaimDate",
    "lastLoginAt",
    "firstStampClaimDate",
    EXTRACT(EPOCH FROM (NOW() - "lastStampClaimDate")) / 3600 as hours_since_last_stamp,
    EXTRACT(EPOCH FROM (NOW() - "lastLoginAt")) / 3600 as hours_since_last_login
FROM users
WHERE id = 'b68d7b65-e23f-4edb-b7d5-a676ee3672fb';

-- Step 4: After claiming stamp, check if reward was given
SELECT 
    sr.*,
    u.email,
    u."stampsCollected" as current_stamps,
    u.gem as current_gems
FROM stamp_rewards sr
JOIN users u ON sr."userId" = u.id
WHERE sr."userId" = 'b68d7b65-e23f-4edb-b7d5-a676ee3672fb'
ORDER BY sr."createdAt" DESC
LIMIT 5;

-- Step 5: Check gem transactions (if reward was GEMS)
SELECT *
FROM gem_transactions
WHERE "userId" = 'b68d7b65-e23f-4edb-b7d5-a676ee3672fb'
AND description LIKE '%stamp reward%'
ORDER BY "createdAt" DESC
LIMIT 5;

-- Step 6: Check user items (if reward was an item)
SELECT *
FROM user_items
WHERE "userId" = 'b68d7b65-e23f-4edb-b7d5-a676ee3672fb'
AND description LIKE '%stamp collection%'
ORDER BY "createdAt" DESC
LIMIT 5;
