-- Run this script to update the database schema
-- Connect to your database (user_management1) and run this script

-- Make password column nullable
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

-- Verify the change
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'password';

