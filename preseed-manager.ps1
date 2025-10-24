# PowerShell script to create manager user
# This script creates a manager user in the PostgreSQL database

Write-Host "🔧 Creating Manager User - PowerShell Preseed Script" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "[INFO] Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "[INFO] npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] npm is not installed. Please install npm first." -ForegroundColor Red
    exit 1
}

# Check if we're in the backend directory
if (-not (Test-Path "package.json")) {
    Write-Host "[ERROR] package.json not found. Please run this script from the backend directory." -ForegroundColor Red
    exit 1
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "[ERROR] .env file not found. Please create it from env.example first." -ForegroundColor Red
    exit 1
}

# Read environment variables
$dbHost = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$dbPort = if ($env:DB_PORT) { $env:DB_PORT } else { 5432 }
$dbUsername = if ($env:DB_USERNAME) { $env:DB_USERNAME } else { "postgres" }
$dbPassword = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "postgresql" }
$dbName = if ($env:DB_NAME) { $env:DB_NAME } else { "user_management" }

# Get manager credentials from environment or use defaults
$managerEmail = if ($env:MANAGER_EMAIL) { $env:MANAGER_EMAIL } else { "manager@manager.com" }
$managerName = if ($env:MANAGER_NAME) { $env:MANAGER_NAME } else { "System Manager" }
$managerPassword = if ($env:MANAGER_PASSWORD) { $env:MANAGER_PASSWORD } else { "manager123!@#" }

Write-Host "[INFO] Manager credentials:" -ForegroundColor Yellow
Write-Host "  Email: $managerEmail" -ForegroundColor White
Write-Host "  Name: $managerName" -ForegroundColor White
Write-Host "  Role: manager" -ForegroundColor White
Write-Host "  Password: [HIDDEN]" -ForegroundColor White
Write-Host ""

# Install dependencies
Write-Host "[INFO] Installing dependencies..." -ForegroundColor Yellow
npm install

# Build the application
Write-Host "[INFO] Building the application..." -ForegroundColor Yellow
npm run build

# Create Node.js script to hash password and insert user
$nodeScript = @"
const { execSync } = require('child_process');
const bcrypt = require('bcryptjs');

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
        
        // Execute SQL using psql
        const psqlCommand = \`PGPASSWORD="\${dbPassword}" psql -h \${dbHost} -p \${dbPort} -U \${dbUsername} -d \${dbName} -c "\${sql}"\`;
        
        console.log('Executing SQL command...');
        const result = execSync(psqlCommand, { encoding: 'utf8' });
        
        console.log('✅ Manager user created successfully!');
        console.log('Result:', result);
        
    } catch (error) {
        console.error('❌ Error creating manager user:', error.message);
        process.exit(1);
    }
}

createManager();
"@

# Write the Node.js script to a temporary file
$tempScript = "temp_create_manager.js"
$nodeScript | Out-File -FilePath $tempScript -Encoding UTF8

try {
    Write-Host "[INFO] Creating manager user..." -ForegroundColor Yellow
    node $tempScript
} catch {
    Write-Host "[ERROR] Failed to create manager user: $_" -ForegroundColor Red
    exit 1
} finally {
    # Clean up temporary file
    if (Test-Path $tempScript) {
        Remove-Item $tempScript
    }
}

Write-Host ""
Write-Host "[SUCCESS] Manager preseed completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Manager User Details:" -ForegroundColor Cyan
Write-Host "  Email: $managerEmail" -ForegroundColor White
Write-Host "  Name: $managerName" -ForegroundColor White
Write-Host "  Role: manager" -ForegroundColor White
Write-Host "  Password: $managerPassword" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Manager Permissions:" -ForegroundColor Cyan
Write-Host "  ✅ Can manage all users (admin, user)" -ForegroundColor Green
Write-Host "  ✅ Can create/update/delete users" -ForegroundColor Green
Write-Host "  ✅ Can manage all wallets" -ForegroundColor Green
Write-Host "  ✅ Full access to admin features" -ForegroundColor Green
Write-Host "  ✅ Highest privilege level" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Start the backend: npm run start:dev" -ForegroundColor White
Write-Host "  2. Login with manager credentials" -ForegroundColor White
Write-Host "  3. Create additional admins/users as needed" -ForegroundColor White
Write-Host ""
Write-Host "💡 To create additional managers:" -ForegroundColor Cyan
Write-Host "  .\preseed-manager.ps1" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Cross-Platform Support:" -ForegroundColor Cyan
Write-Host "  ✅ Ubuntu/Linux (native)" -ForegroundColor Green
Write-Host "  ✅ Windows (PowerShell/Git Bash)" -ForegroundColor Green
Write-Host "  ✅ macOS (native)" -ForegroundColor Green
Write-Host "  ✅ WSL (Windows Subsystem for Linux)" -ForegroundColor Green