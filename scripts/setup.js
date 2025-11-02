#!/usr/bin/env node
/**
 * Setup script to initialize the application with secure credentials
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function setup() {
  console.log('\n=== Flexible Form System Setup ===\n');
  
  // Check if .env already exists
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const overwrite = await question('.env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }
  
  // Get configuration
  const port = await question('Server port (default: 3000): ') || '3000';
  const adminPassword = await question('Admin password (min 8 characters): ');
  
  if (adminPassword.length < 8) {
    console.error('Error: Password must be at least 8 characters long.');
    rl.close();
    return;
  }
  
  // Generate secure JWT secret
  const jwtSecret = crypto.randomBytes(64).toString('hex');
  
  // Create .env file content
  const envContent = `# Server Configuration
PORT=${port}
NODE_ENV=development

# Admin Configuration
ADMIN_PASSWORD=${adminPassword}

# JWT Secret (auto-generated)
JWT_SECRET=${jwtSecret}

# Database
DB_PATH=./responses.db

# File Upload Configuration
MAX_FILE_SIZE=1048576
UPLOAD_DIR=./uploads
`;

  // Write .env file
  fs.writeFileSync(envPath, envContent);
  
  console.log('\n✓ .env file created successfully!');
  console.log('\nNext steps:');
  console.log('1. Review the .env file if needed');
  console.log('2. Run "npm start" to start the server');
  console.log('3. Access the admin panel at http://localhost:' + port + '/admin\n');
  
  rl.close();
}

setup().catch((err) => {
  console.error('Setup failed:', err);
  rl.close();
  process.exit(1);
});
