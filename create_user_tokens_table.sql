-- Create user_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS "user_tokens" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "username" varchar NOT NULL,
    "token" varchar NOT NULL UNIQUE,
    "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" timestamp DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" timestamp NOT NULL,
    "isActive" boolean DEFAULT true
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "IDX_user_tokens_username" ON "user_tokens" ("username");
CREATE INDEX IF NOT EXISTS "IDX_user_tokens_token" ON "user_tokens" ("token");
CREATE INDEX IF NOT EXISTS "IDX_user_tokens_isActive" ON "user_tokens" ("isActive");
