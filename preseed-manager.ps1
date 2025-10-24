# =============================================================================
# MANAGER PRESEED SCRIPT - WINDOWS POWERSHELL
# =============================================================================
# This script creates a manager user with the highest privileges
# Designed specifically for Windows PowerShell

Write-Host "🔧 Creating Manager User - Windows PowerShell Preseed Script" -ForegroundColor Blue
Write-Host "=============================================================" -ForegroundColor Blue

# Default manager credentials
$MANAGER_EMAIL = "manager@manager.com"
$MANAGER_NAME = "System Manager"
$MANAGER_PASSWORD = "manager123!@#"
$MANAGER_ROLE = "manager"

# Check if custom credentials are provided
if ($args.Count -gt 0) {
    $MANAGER_EMAIL = $args[0]
}
if ($args.Count -gt 1) {
    $MANAGER_NAME = $args[1]
}
if ($args.Count -gt 2) {
    $MANAGER_PASSWORD = $args[2]
}

Write-Host "Manager credentials:" -ForegroundColor Blue
Write-Host "  Email: $MANAGER_EMAIL"
Write-Host "  Name: $MANAGER_NAME"
Write-Host "  Role: $MANAGER_ROLE"
Write-Host "  Password: [HIDDEN]"
Write-Host ""

# Check if Node.js and npm are available
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

try {
    $npmVersion = npm --version
    Write-Host "✅ npm found: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed. Please install npm first." -ForegroundColor Red
    exit 1
}

# Check if we're in the backend directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ package.json not found. Please run this script from the backend directory." -ForegroundColor Red
    exit 1
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found. Please create it from env.example first." -ForegroundColor Red
    exit 1
}

Write-Host "Installing dependencies..." -ForegroundColor Blue
npm install

Write-Host "Building the application..." -ForegroundColor Blue
npm run build

Write-Host "Creating manager user..." -ForegroundColor Blue

# Create a PowerShell script to create the manager user
$createManagerScript = @"
const { execSync } = require('child_process');
const bcrypt = require('bcryptjs');
const fs = require('fs');
require('dotenv').config();

async function createManager() {
    try {
        console.log('Running on Windows PowerShell');
        
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
        
        console.log(\`Creating manager user: \${managerEmail}\`);
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(managerPassword, 12);
        
        // Create SQL to insert manager user
        const sql = \`
            INSERT INTO users (id, email, name, password, role, "isActive", "createdAt", "updatedAt")
            VALUES (
                gen_random_uuid(),
                '\${managerEmail}',
                '\${managerName}',
                '\${hashedPassword}',
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
        \`;
        
        // Execute SQL using psql.exe for Windows
        const psqlCommand = \`psql.exe -h \${dbHost} -p \${dbPort} -U \${dbUsername} -d \${dbName} -c "\${sql}"\`;
        
        // Set PGPASSWORD for Windows
        process.env.PGPASSWORD = dbPassword;
        
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
            
            // Try alternative approach - create SQL file
            console.log('Trying alternative Windows approach...');
            try {
                // Create a temporary SQL file
                const sqlFile = 'temp_manager.sql';
                fs.writeFileSync(sqlFile, sql);
                
                const altCommand = \`psql.exe -h \${dbHost} -p \${dbPort} -U \${dbUsername} -d \${dbName} -f \${sqlFile}\`;
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
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

createManager();
"@

# Write the script to a temporary file
$createManagerScript | Out-File -FilePath "create_manager.js" -Encoding UTF8

# Set environment variables for the script
$env:MANAGER_EMAIL = $MANAGER_EMAIL
$env:MANAGER_NAME = $MANAGER_NAME
$env:MANAGER_PASSWORD = $MANAGER_PASSWORD

# Run the script
node create_manager.js

# Clean up
Remove-Item "create_manager.js" -Force

Write-Host ""
Write-Host "✅ Manager preseed completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Manager User Details:"
Write-Host "  Email: $MANAGER_EMAIL"
Write-Host "  Name: $MANAGER_NAME"
Write-Host "  Role: manager"
Write-Host "  Password: $MANAGER_PASSWORD"
Write-Host ""
Write-Host "🔐 Manager Permissions:"
Write-Host "  ✅ Can manage all users (admin, user)"
Write-Host "  ✅ Can create/update/delete users"
Write-Host "  ✅ Can manage all wallets"
Write-Host "  ✅ Full access to admin features"
Write-Host "  ✅ Highest privilege level"
Write-Host ""
Write-Host "🚀 Next Steps:"
Write-Host "  1. Start the backend: npm run start:dev"
Write-Host "  2. Login with manager credentials"
Write-Host "  3. Create additional admins/users as needed"
Write-Host ""
Write-Host "💡 To create additional managers:"
Write-Host "  .\preseed-manager.ps1 manager2@example.com 'Manager 2' 'Password123!'"
Write-Host ""
Write-Host "🌐 Windows PowerShell Support:"
Write-Host "  ✅ Windows PowerShell 5.1+"
Write-Host "  ✅ PowerShell Core 6+"
Write-Host "  ✅ Windows Terminal"
Write-Host "  ✅ Visual Studio Code Terminal"
Write-Host ""
