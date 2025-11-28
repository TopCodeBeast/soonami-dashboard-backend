-- Migration: Remove password column from users table
-- This migration is optional - the password column can remain in the database
-- as nullable for backward compatibility, but it's no longer used by the application
-- 
-- If you want to completely remove the password column, uncomment the ALTER TABLE statement below

-- DO $$
-- BEGIN
--     -- Check if the users table exists
--     IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
--         -- Check if password column exists
--         IF EXISTS (
--             SELECT FROM information_schema.columns 
--             WHERE table_name = 'users' 
--             AND column_name = 'password'
--         ) THEN
--             -- Drop the password column
--             ALTER TABLE users DROP COLUMN password;
--             RAISE NOTICE 'Password column removed from users table';
--         ELSE
--             RAISE NOTICE 'Password column does not exist';
--         END IF;
--     ELSE
--         RAISE NOTICE 'Users table does not exist';
--     END IF;
-- END $$;

-- Note: The password column is kept as nullable in the database for backward compatibility.
-- The application no longer uses this field since email verification code login is used instead.

