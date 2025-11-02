const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

// Hash a password
async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

// Compare password with hash
async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Validate environment variables
function validateEnvVariables() {
  const requiredVars = ['ADMIN_PASSWORD', 'JWT_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Please create a .env file based on .env.example');
    process.exit(1);
  }
}

module.exports = {
  hashPassword,
  comparePassword,
  validateEnvVariables
};
