#!/usr/bin/env node

/**
 * Production Startup Script with Auto-Seeding
 * This script starts the NestJS application with automatic seeding enabled
 */

const { spawn } = require('child_process');
const path = require('path');

// Set environment variables for seeding
process.env.ENABLE_SEEDING = 'true';
process.env.NODE_ENV = 'production';

console.log('🚀 Starting NestJS Application with Auto-Seeding');
console.log('================================================');
console.log('[INFO] Environment: production');
console.log('[INFO] Auto-seeding: enabled');
console.log('[INFO] Manager will be created automatically on startup');
console.log('');

// Start the NestJS application
const app = spawn('npm', ['run', 'start:prod'], {
  stdio: 'inherit',
  cwd: __dirname,
  env: {
    ...process.env,
    ENABLE_SEEDING: 'true',
  }
});

app.on('close', (code) => {
  console.log(`\n📊 Application exited with code ${code}`);
});

app.on('error', (error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  app.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  app.kill('SIGTERM');
});
