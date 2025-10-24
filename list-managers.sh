#!/bin/bash

# =============================================================================
# LIST MANAGER USERS SCRIPT
# =============================================================================
# This script lists all users with manager role from the database

echo "👥 Listing Manager Users"
echo "========================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the backend directory."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found. Please create it from env.example first."
    exit 1
fi

print_status "Connecting to database..."

# Create a script to list manager users
cat > list_managers.js << 'EOF'
const { execSync } = require('child_process');
const fs = require('fs');
require('dotenv').config();

async function listManagers() {
    try {
        // Read environment variables
        const dbHost = process.env.DB_HOST || 'localhost';
        const dbPort = process.env.DB_PORT || 5432;
        const dbUsername = process.env.DB_USERNAME || 'postgres';
        const dbPassword = process.env.DB_PASSWORD || 'postgresql';
        const dbName = process.env.DB_NAME || 'user_management';
        
        console.log('🔍 Searching for manager users...');
        
        // Create SQL to list manager users
        const sql = `
            SELECT 
                id,
                email,
                name,
                role,
                "isActive",
                "lastLoginAt",
                "createdAt",
                "updatedAt"
            FROM users 
            WHERE role = 'manager'
            ORDER BY "createdAt" DESC;
        `;
        
        // Execute SQL using psql
        const psqlCommand = `PGPASSWORD="${dbPassword}" psql -h ${dbHost} -p ${dbPort} -U ${dbUsername} -d ${dbName} -c "${sql}"`;
        
        try {
            const result = execSync(psqlCommand, { encoding: 'utf8' });
            
            // Parse the result to extract manager data
            const lines = result.split('\n');
            const dataLines = lines.filter(line => 
                line.includes('@') && 
                !line.includes('email') && 
                !line.includes('---') &&
                !line.includes('rows)') &&
                line.trim() !== ''
            );
            
            if (dataLines.length === 0) {
                console.log('❌ No manager users found in the database.');
                console.log('');
                console.log('💡 To create a manager user, run:');
                console.log('   npm run preseed:manager');
                return;
            }
            
            console.log('✅ Manager users found:');
            console.log('');
            
            // Display manager information in a formatted way
            dataLines.forEach((line, index) => {
                const parts = line.split('|').map(part => part.trim());
                if (parts.length >= 8) {
                    const [id, email, name, role, isActive, lastLoginAt, createdAt, updatedAt] = parts;
                    
                    console.log(`📋 Manager ${index + 1}:`);
                    console.log(`   ID: ${id}`);
                    console.log(`   Email: ${email}`);
                    console.log(`   Name: ${name || 'Not set'}`);
                    console.log(`   Role: ${role}`);
                    console.log(`   Active: ${isActive === 't' ? 'Yes' : 'No'}`);
                    console.log(`   Last Login: ${lastLoginAt || 'Never'}`);
                    console.log(`   Created: ${createdAt}`);
                    console.log(`   Updated: ${updatedAt}`);
                    console.log('');
                }
            });
            
            console.log('🔐 Manager Permissions:');
            console.log('   ✅ Can manage all users (admin, user)');
            console.log('   ✅ Can create/update/delete users');
            console.log('   ✅ Can manage all wallets');
            console.log('   ✅ Full access to admin features');
            console.log('   ✅ Highest privilege level');
            console.log('');
            console.log('🚀 Next Steps:');
            console.log('   1. Start the backend: npm run start:dev');
            console.log('   2. Login with manager credentials');
            console.log('   3. Access admin dashboard');
            
        } catch (error) {
            console.error('❌ Error querying database:', error.message);
            
            // Try alternative approach
            console.log('Trying alternative approach...');
            try {
                // Create a temporary SQL file
                const sqlFile = 'temp_list_managers.sql';
                fs.writeFileSync(sqlFile, sql);
                
                const altCommand = `PGPASSWORD="${dbPassword}" psql -h ${dbHost} -p ${dbPort} -U ${dbUsername} -d ${dbName} -f ${sqlFile}`;
                
                const altResult = execSync(altCommand, { encoding: 'utf8' });
                console.log('✅ Manager users found (alternative method):');
                console.log(altResult);
                
                // Clean up
                fs.unlinkSync(sqlFile);
            } catch (altError) {
                console.error('❌ Alternative method also failed:', altError.message);
                process.exit(1);
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

listManagers();
EOF

# Run the script
node list_managers.js

# Clean up
rm -f list_managers.js

print_success "Manager listing completed!"
