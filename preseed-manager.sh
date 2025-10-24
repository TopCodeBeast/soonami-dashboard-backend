#!/bin/bash

# =============================================================================
# MANAGER PRESEED SCRIPT - CROSS PLATFORM (Ubuntu/Windows)
# =============================================================================
# This script creates a manager user with the highest privileges
# Works on both Ubuntu (WSL/Linux) and Windows (PowerShell/Git Bash)

echo "🔧 Creating Manager User - Cross Platform Preseed Script"
echo "========================================================"

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

# Detect operating system
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

OS=$(detect_os)
print_status "Detected OS: $OS"

# Default manager credentials
MANAGER_EMAIL="manager@manager.com"
MANAGER_NAME="System Manager"
MANAGER_PASSWORD="manager123!@#"
MANAGER_ROLE="manager"

# Check if custom credentials are provided
if [ ! -z "$1" ]; then
    MANAGER_EMAIL="$1"
fi

if [ ! -z "$2" ]; then
    MANAGER_NAME="$2"
fi

if [ ! -z "$3" ]; then
    MANAGER_PASSWORD="$3"
fi

print_status "Manager credentials:"
echo "  Email: $MANAGER_EMAIL"
echo "  Name: $MANAGER_NAME"
echo "  Role: $MANAGER_ROLE"
echo "  Password: [HIDDEN]"
echo ""

# Check if Node.js and npm are available
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

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

print_status "Installing dependencies..."
npm install

print_status "Building the application..."
npm run build

print_status "Creating manager user..."

# Create a cross-platform script to create the manager user
cat > create_manager.js << 'EOF'
const { execSync } = require('child_process');
const bcrypt = require('bcryptjs');
const fs = require('fs');
require('dotenv').config();

// Detect OS
function detectOS() {
    const os = require('os');
    const platform = os.platform();
    if (platform === 'win32') return 'windows';
    if (platform === 'darwin') return 'macos';
    if (platform === 'linux') return 'linux';
    return 'unknown';
}

async function createManager() {
    try {
        const os = detectOS();
        console.log(`Running on: ${os}`);
        
        // Read environment variables
        const dbHost = process.env.DB_HOST || 'localhost';
        const dbPort = process.env.DB_PORT || 5432;
        const dbUsername = process.env.DB_USERNAME || 'postgres';
        const dbPassword = process.env.DB_PASSWORD || 'postgresql';
        const dbName = process.env.DB_NAME || 'user_management';
        
        // Get manager credentials from environment or use defaults
        const managerEmail = process.env.MANAGER_EMAIL || 'manager@manager.com';
        const managerName = process.env.MANAGER_NAME || 'System Manager';
        const managerPassword = process.env.MANAGER_PASSWORD || 'manager123!@#';
        
        console.log(`Creating manager user: ${managerEmail}`);
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(managerPassword, 12);
        
        // Create SQL to insert manager user
        const sql = `
            INSERT INTO users (id, email, name, password, role, "isActive", "createdAt", "updatedAt")
            VALUES (
                gen_random_uuid(),
                '${managerEmail}',
                '${managerName}',
                '${hashedPassword}',
                'manager',
                true,
                NOW(),
                NOW()
            )
            ON CONFLICT (email) DO UPDATE SET
                name = EXCLUDED.name,
                password = EXCLUDED.password,
                role = EXCLUDED.role,
                "isActive" = EXCLUDED."isActive",
                "updatedAt" = NOW()
            RETURNING id, email, name, role, "isActive";
        `;
        
        // Execute SQL using psql with OS-specific commands
        let psqlCommand;
        if (os === 'windows') {
            // Windows: Use psql.exe and handle Windows paths
            psqlCommand = `psql.exe -h ${dbHost} -p ${dbPort} -U ${dbUsername} -d ${dbName} -c "${sql}"`;
            // Set PGPASSWORD for Windows
            process.env.PGPASSWORD = dbPassword;
        } else {
            // Linux/macOS: Use standard psql
            psqlCommand = `PGPASSWORD="${dbPassword}" psql -h ${dbHost} -p ${dbPort} -U ${dbUsername} -d ${dbName} -c "${sql}"`;
        }
        
        console.log('Executing SQL command...');
        
        try {
            const result = execSync(psqlCommand, { 
                encoding: 'utf8',
                stdio: 'pipe'
            });
            console.log('✅ Manager user created/updated successfully!');
            console.log('Result:', result);
        } catch (error) {
            console.error('❌ Error creating manager user:', error.message);
            
            // Try alternative approach for Windows
            if (os === 'windows') {
                console.log('Trying alternative Windows approach...');
                try {
                    // Create a temporary SQL file
                    const sqlFile = 'temp_manager.sql';
                    fs.writeFileSync(sqlFile, sql);
                    
                    const altCommand = `psql.exe -h ${dbHost} -p ${dbPort} -U ${dbUsername} -d ${dbName} -f ${sqlFile}`;
                    process.env.PGPASSWORD = dbPassword;
                    
                    const altResult = execSync(altCommand, { encoding: 'utf8' });
                    console.log('✅ Manager user created/updated successfully (alternative method)!');
                    console.log('Result:', altResult);
                    
                    // Clean up
                    fs.unlinkSync(sqlFile);
                } catch (altError) {
                    console.error('❌ Alternative method also failed:', altError.message);
                    process.exit(1);
                }
            } else {
                process.exit(1);
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

createManager();
EOF

# Set environment variables for the script
export MANAGER_EMAIL="$MANAGER_EMAIL"
export MANAGER_NAME="$MANAGER_NAME"
export MANAGER_PASSWORD="$MANAGER_PASSWORD"

# Run the script
node create_manager.js

# Clean up
rm -f create_manager.js

print_success "Manager preseed completed!"
echo ""
echo "📋 Manager User Details:"
echo "  Email: $MANAGER_EMAIL"
echo "  Name: $MANAGER_NAME"
echo "  Role: manager"
echo "  Password: $MANAGER_PASSWORD"
echo ""
echo "🔐 Manager Permissions:"
echo "  ✅ Can manage all users (admin, user)"
echo "  ✅ Can create/update/delete users"
echo "  ✅ Can manage all wallets"
echo "  ✅ Full access to admin features"
echo "  ✅ Highest privilege level"
echo ""
echo "🚀 Next Steps:"
echo "  1. Start the backend: npm run start:dev"
echo "  2. Login with manager credentials"
echo "  3. Create additional admins/users as needed"
echo ""
echo "💡 To create additional managers:"
echo "  ./preseed-manager.sh manager2@example.com 'Manager 2' 'Password123!'"
echo ""
echo "🌐 Cross-Platform Support:"
echo "  ✅ Ubuntu/Linux (native)"
echo "  ✅ Windows (PowerShell/Git Bash)"
echo "  ✅ macOS (native)"
echo "  ✅ WSL (Windows Subsystem for Linux)"
echo ""