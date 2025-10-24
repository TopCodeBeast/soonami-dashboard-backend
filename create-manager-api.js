#!/usr/bin/env node

/**
 * Create Manager User via API
 * This script creates a manager user by making a direct POST request to the backend API
 * No database access required - uses the existing API endpoints
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = 'https://soonami-backend.worldofmalls.ai';
const MANAGER_EMAIL = 'manager@manager.com';
const MANAGER_NAME = 'System Manager';
const MANAGER_PASSWORD = 'manager123!@#';

async function createManagerViaAPI() {
    try {
        console.log('🔧 Creating Manager User via API');
        console.log('=====================================');
        console.log(`[INFO] API URL: ${API_BASE_URL}`);
        console.log(`[INFO] Manager Email: ${MANAGER_EMAIL}`);
        console.log(`[INFO] Manager Name: ${MANAGER_NAME}`);
        console.log(`[INFO] Manager Role: manager`);
        console.log('');

        // Step 1: Register the user (will be created as USER role)
        console.log('[INFO] Step 1: Registering user (will be USER role initially)...');
        
        const registerData = {
            email: MANAGER_EMAIL,
            name: MANAGER_NAME,
            password: MANAGER_PASSWORD
        };

        let user, authToken;
        
        try {
            const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, registerData, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            console.log('✅ User registered successfully!');
            user = registerResponse.data;
            console.log(`   Role: ${user.role} (will be upgraded to manager)`);
            console.log('');

        } catch (registerError) {
            if (registerError.response && registerError.response.status === 409) {
                console.log('⚠️  User already exists, attempting to login...');
                
                // Try to login with existing credentials
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

                    console.log('✅ User login successful!');
                    user = loginResponse.data.user;
                    authToken = loginResponse.data.accessToken;
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

        // Step 2: If we don't have a token yet, login to get one
        if (!authToken) {
            console.log('[INFO] Step 2: Logging in to get authentication token...');
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

                authToken = loginResponse.data.accessToken;
                user = loginResponse.data.user;
                console.log('✅ Login successful!');
                console.log('');

            } catch (loginError) {
                console.error('❌ Login failed:', loginError.response?.data?.message || loginError.message);
                throw loginError;
            }
        }

        // Step 3: Check if user is already a manager
        if (user.role === 'manager') {
            console.log('✅ User is already a manager!');
            console.log('📋 Manager Details:');
            console.log(`   ID: ${user.id}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Name: ${user.name}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Active: ${user.isActive ? 'Yes' : 'No'}`);
            console.log('');
        } else {
            console.log(`[INFO] Step 3: Upgrading user role from ${user.role} to manager...`);
            console.log('⚠️  Note: This requires manual database update as the API restricts role changes.');
            console.log('   Please use the preseed scripts or update the database directly.');
            console.log('');
            console.log('📋 Current User Details:');
            console.log(`   ID: ${user.id}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Name: ${user.name}`);
            console.log(`   Role: ${user.role} (needs to be changed to manager)`);
            console.log(`   Active: ${user.isActive ? 'Yes' : 'No'}`);
            console.log('');
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
        console.error('❌ Error creating manager user:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    createManagerViaAPI();
}

module.exports = { createManagerViaAPI };
