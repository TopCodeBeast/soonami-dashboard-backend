-- Migration: Make password column nullable
-- This allows users to login with email code verification without passwords

-- Check if password column exists and is NOT NULL, then alter it
DO $$
BEGIN
    -- Check if the users table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        -- Check if password column is NOT NULL
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'password' 
            AND is_nullable = 'NO'
        ) THEN
            -- Alter the column to allow NULL
            ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
            RAISE NOTICE 'Password column updated to allow NULL values';
        ELSE
            RAISE NOTICE 'Password column already allows NULL or does not exist';
        END IF;
    ELSE
        RAISE NOTICE 'Users table does not exist - will be created by TypeORM synchronize';
    END IF;
END $$;

