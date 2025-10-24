#!/usr/bin/env node

/**
 * Complete Manager Creation Solution
 * This script creates a manager user using a combination of API and database update
 * 1. Creates user via API (as USER role)
 * 2. Updates role to MANAGER via direct database query
 */

const axios = require('axios');
const { execSync } = require('child_process');
const os = require('os');

// Configuration
const API_BASE_URL = 'https://soonami-backend.worldofmalls.ai';
const MANAGER_EMAIL = 'manager@manager.com';
const MANAGER_NAME = 'System Manager';
const MANAGER_PASSWORD = 'manager123!@#';

// Database configuration (from environment or production defaults)
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = process.env.DB_PORT || '5433';
const DB_USERNAME = process.env.DB_USERNAME || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const DB_NAME = process.env.DB_NAME || 'user_management';

async function createManagerComplete() {
    try {
        console.log('🔧 Complete Manager Creation Solution');
        console.log('=====================================');
        console.log(`[INFO] API URL: ${API_BASE_URL}`);
        console.log(`[INFO] Manager Email: ${MANAGER_EMAIL}`);
        console.log(`[INFO] Manager Name: ${MANAGER_NAME}`);
        console.log(`[INFO] Manager Role: manager`);
        console.log('');

        // Step 1: Create user via API
        console.log('[INFO] Step 1: Creating user via API...');
        const registerData = {
            email: MANAGER_EMAIL,
            name: MANAGER_NAME,
            password: MANAGER_PASSWORD
        };

        let user;
        try {
            const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, registerData, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            console.log('✅ User created via API successfully!');
            user = registerResponse.data;
            console.log(`   ID: ${user.id}`);
            console.log(`   Role: ${user.role} (will be upgraded to manager)`);
            console.log('');

        } catch (registerError) {
            if (registerError.response && registerError.response.status === 409) {
                console.log('⚠️  User already exists, getting user info...');
                
                // Try to login to get user info
                const loginData = {
                    email: MANAGER_EMAIL,
                    password: MANAGER_PASSWORD
                };

                try {
                    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, loginData, {
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    });

                    user = loginResponse.data.user;
                    console.log('✅ User login successful!');
                    console.log(`   ID: ${user.id}`);
                    console.log(`   Role: ${user.role}`);
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

        // Step 2: Update role to manager via database
        console.log('[INFO] Step 2: Upgrading role to manager via database...');
        
        const updateRoleSQL = `
            UPDATE users 
            SET role = 'manager', "updatedAt" = NOW()
            WHERE email = '${MANAGER_EMAIL}'
            RETURNING id, email, name, role, "isActive", "updatedAt";
        `;

        try {
            // Execute SQL using psql
            const psqlCommand = `PGPASSWORD="${DB_PASSWORD}" psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USERNAME} -d ${DB_NAME} -c "${updateRoleSQL}"`;
            
            console.log('Executing database update...');
            const result = execSync(psqlCommand, { encoding: 'utf8' });
            
            console.log('✅ Role updated to manager successfully!');
            console.log('Database Result:');
            console.log(result);
            console.log('');

        } catch (dbError) {
            console.error('❌ Database update failed:', dbError.message);
            console.log('');
            console.log('🔧 Manual Database Update Required:');
            console.log('Run this SQL command manually:');
            console.log(`UPDATE users SET role = 'manager', "updatedAt" = NOW() WHERE email = '${MANAGER_EMAIL}';`);
            console.log('');
            throw dbError;
        }

        // Step 3: Verify the update
        console.log('[INFO] Step 3: Verifying manager role...');
        
        try {
            const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
                email: MANAGER_EMAIL,
                password: MANAGER_PASSWORD
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            const updatedUser = loginResponse.data.user;
            console.log('✅ Verification successful!');
            console.log('📋 Final Manager Details:');
            console.log(`   ID: ${updatedUser.id}`);
            console.log(`   Email: ${updatedUser.email}`);
            console.log(`   Name: ${updatedUser.name}`);
            console.log(`   Role: ${updatedUser.role}`);
            console.log(`   Active: ${updatedUser.isActive ? 'Yes' : 'No'}`);
            console.log('');

        } catch (verifyError) {
            console.error('❌ Verification failed:', verifyError.response?.data?.message || verifyError.message);
            console.log('   User may need to be activated or there may be an issue with the role update.');
        }

        console.log('🔐 Manager Permissions:');
        console.log('   ✅ Can manage all users (admin, user)');
        console.log('   ✅ Can create/update/delete users');
        console.log('   ✅ Can manage all wallets');
        console.log('   ✅ Full access to admin features');
        console.log('   ✅ Highest privilege level');
        console.log('');
        console.log('🚀 Next Steps:');
        console.log('   1. Login to the frontend with manager credentials');
        console.log('   2. Access admin dashboard');
        console.log('   3. Create additional admins/users as needed');
        console.log('');
        console.log('🌐 Frontend URL: https://soonami-frontend.worldofmalls.ai');
        console.log('🔑 Manager Credentials:');
        console.log(`   Email: ${MANAGER_EMAIL}`);
        console.log(`   Password: ${MANAGER_PASSWORD}`);

    } catch (error) {
        console.error('❌ Error in complete manager creation:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    createManagerComplete();
}

module.exports = { createManagerComplete };
