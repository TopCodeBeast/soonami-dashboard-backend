#!/usr/bin/env node

/**
 * Production VPS Manager Creation Test
 * This script tests manager creation with your production VPS settings
 */

const axios = require('axios');
const { execSync } = require('child_process');

// Your Production VPS Configuration
const PRODUCTION_CONFIG = {
    API_BASE_URL: 'https://soonami-backend.worldofmalls.ai',
    DB_HOST: '127.0.0.1',
    DB_PORT: '5433',
    DB_USERNAME: 'postgres',
    DB_PASSWORD: 'postgres',
    DB_NAME: 'user_management',
    MANAGER_EMAIL: 'manager@manager.com',
    MANAGER_NAME: 'System Manager',
    MANAGER_PASSWORD: 'manager123!@#'
};

async function testProductionManagerCreation() {
    try {
        console.log('🔧 Testing Manager Creation with Production VPS Settings');
        console.log('========================================================');
        console.log(`[INFO] API URL: ${PRODUCTION_CONFIG.API_BASE_URL}`);
        console.log(`[INFO] Database: ${PRODUCTION_CONFIG.DB_HOST}:${PRODUCTION_CONFIG.DB_PORT}`);
        console.log(`[INFO] Database Name: ${PRODUCTION_CONFIG.DB_NAME}`);
        console.log(`[INFO] Manager Email: ${PRODUCTION_CONFIG.MANAGER_EMAIL}`);
        console.log('');

        // Step 1: Test API Connection
        console.log('[INFO] Step 1: Testing API connection...');
        try {
            const healthCheck = await axios.get(`${PRODUCTION_CONFIG.API_BASE_URL}/health`, {
                timeout: 5000
            });
            console.log('✅ API connection successful!');
            console.log(`   Status: ${healthCheck.status}`);
        } catch (apiError) {
            console.log('⚠️  API health check failed, but continuing...');
            console.log(`   Error: ${apiError.message}`);
        }
        console.log('');

        // Step 2: Test Database Connection
        console.log('[INFO] Step 2: Testing database connection...');
        const testDbSQL = `SELECT 1 as test;`;
        const dbTestCommand = `PGPASSWORD="${PRODUCTION_CONFIG.DB_PASSWORD}" psql -h ${PRODUCTION_CONFIG.DB_HOST} -p ${PRODUCTION_CONFIG.DB_PORT} -U ${PRODUCTION_CONFIG.DB_USERNAME} -d ${PRODUCTION_CONFIG.DB_NAME} -c "${testDbSQL}"`;
        
        try {
            const dbResult = execSync(dbTestCommand, { encoding: 'utf8' });
            console.log('✅ Database connection successful!');
            console.log('   Database test query executed');
        } catch (dbError) {
            console.error('❌ Database connection failed:', dbError.message);
            console.log('');
            console.log('🔧 Database Connection Details:');
            console.log(`   Host: ${PRODUCTION_CONFIG.DB_HOST}`);
            console.log(`   Port: ${PRODUCTION_CONFIG.DB_PORT}`);
            console.log(`   Username: ${PRODUCTION_CONFIG.DB_USERNAME}`);
            console.log(`   Database: ${PRODUCTION_CONFIG.DB_NAME}`);
            console.log('');
            console.log('💡 Troubleshooting:');
            console.log('   1. Ensure PostgreSQL is running on your VPS');
            console.log('   2. Check if the database "user_management" exists');
            console.log('   3. Verify the user "postgres" has access');
            console.log('   4. Check firewall settings for port 5433');
            throw dbError;
        }
        console.log('');

        // Step 3: Test User Registration
        console.log('[INFO] Step 3: Testing user registration...');
        const registerData = {
            email: PRODUCTION_CONFIG.MANAGER_EMAIL,
            name: PRODUCTION_CONFIG.MANAGER_NAME,
            password: PRODUCTION_CONFIG.MANAGER_PASSWORD
        };

        try {
            const registerResponse = await axios.post(`${PRODUCTION_CONFIG.API_BASE_URL}/auth/register`, registerData, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            console.log('✅ User registration successful!');
            console.log(`   User ID: ${registerResponse.data.id}`);
            console.log(`   Role: ${registerResponse.data.role}`);
            console.log('');

        } catch (registerError) {
            if (registerError.response && registerError.response.status === 409) {
                console.log('⚠️  User already exists, testing login...');
                
                const loginData = {
                    email: PRODUCTION_CONFIG.MANAGER_EMAIL,
                    password: PRODUCTION_CONFIG.MANAGER_PASSWORD
                };

                try {
                    const loginResponse = await axios.post(`${PRODUCTION_CONFIG.API_BASE_URL}/auth/login`, loginData, {
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    });

                    console.log('✅ User login successful!');
                    console.log(`   User ID: ${loginResponse.data.user.id}`);
                    console.log(`   Role: ${loginResponse.data.user.role}`);
                    console.log('');

                } catch (loginError) {
                    console.error('❌ Login failed:', loginError.response?.data?.message || loginError.message);
                    throw loginError;
                }

            } else {
                console.error('❌ Registration failed:', registerError.response?.data?.message || registerError.message);
                throw registerError;
            }
        }

        // Step 4: Test Role Update
        console.log('[INFO] Step 4: Testing role update to manager...');
        const updateRoleSQL = `
            UPDATE users 
            SET role = 'manager', "updatedAt" = NOW()
            WHERE email = '${PRODUCTION_CONFIG.MANAGER_EMAIL}'
            RETURNING id, email, name, role, "isActive", "updatedAt";
        `;

        try {
            const updateCommand = `PGPASSWORD="${PRODUCTION_CONFIG.DB_PASSWORD}" psql -h ${PRODUCTION_CONFIG.DB_HOST} -p ${PRODUCTION_CONFIG.DB_PORT} -U ${PRODUCTION_CONFIG.DB_USERNAME} -d ${PRODUCTION_CONFIG.DB_NAME} -c "${updateRoleSQL}"`;
            
            const updateResult = execSync(updateCommand, { encoding: 'utf8' });
            console.log('✅ Role update successful!');
            console.log('Database Result:');
            console.log(updateResult);
            console.log('');

        } catch (updateError) {
            console.error('❌ Role update failed:', updateError.message);
            console.log('');
            console.log('🔧 Manual SQL Command:');
            console.log(`UPDATE users SET role = 'manager', "updatedAt" = NOW() WHERE email = '${PRODUCTION_CONFIG.MANAGER_EMAIL}';`);
            throw updateError;
        }

        // Step 5: Verify Final Result
        console.log('[INFO] Step 5: Verifying manager role...');
        try {
            const loginResponse = await axios.post(`${PRODUCTION_CONFIG.API_BASE_URL}/auth/login`, {
                email: PRODUCTION_CONFIG.MANAGER_EMAIL,
                password: PRODUCTION_CONFIG.MANAGER_PASSWORD
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            const finalUser = loginResponse.data.user;
            console.log('✅ Verification successful!');
            console.log('📋 Final Manager Details:');
            console.log(`   ID: ${finalUser.id}`);
            console.log(`   Email: ${finalUser.email}`);
            console.log(`   Name: ${finalUser.name}`);
            console.log(`   Role: ${finalUser.role}`);
            console.log(`   Active: ${finalUser.isActive ? 'Yes' : 'No'}`);
            console.log('');

        } catch (verifyError) {
            console.error('❌ Verification failed:', verifyError.response?.data?.message || verifyError.message);
        }

        console.log('🎉 Production VPS Manager Creation Test Complete!');
        console.log('');
        console.log('🔐 Manager Permissions:');
        console.log('   ✅ Can manage all users (admin, user)');
        console.log('   ✅ Can create/update/delete users');
        console.log('   ✅ Can manage all wallets');
        console.log('   ✅ Full access to admin features');
        console.log('   ✅ Highest privilege level');
        console.log('');
        console.log('🌐 Access URLs:');
        console.log(`   Backend API: ${PRODUCTION_CONFIG.API_BASE_URL}`);
        console.log('   Frontend: https://soonami-frontend.worldofmalls.ai');
        console.log('');
        console.log('🔑 Manager Credentials:');
        console.log(`   Email: ${PRODUCTION_CONFIG.MANAGER_EMAIL}`);
        console.log(`   Password: ${PRODUCTION_CONFIG.MANAGER_PASSWORD}`);

    } catch (error) {
        console.error('❌ Production test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testProductionManagerCreation();
}

module.exports = { testProductionManagerCreation };
