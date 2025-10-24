#!/bin/bash

# Quick command to list manager users
# Usage: ./list-managers-quick.sh

echo "👥 Quick Manager List"
echo "===================="

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this from the backend directory"
    exit 1
fi

# Quick SQL query to list managers
PGPASSWORD="${DB_PASSWORD:-postgresql}" psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME:-postgres}" -d "${DB_NAME:-user_management}" -c "
SELECT 
    email,
    name,
    role,
    \"isActive\",
    \"lastLoginAt\",
    \"createdAt\"
FROM users 
WHERE role = 'manager'
ORDER BY \"createdAt\" DESC;
"

echo ""
echo "💡 To create a manager: npm run preseed:manager"
echo "💡 To list all users: npm run list:managers"
