const { hashPassword, comparePassword, validateEnvVariables } = require('../../utils/auth');

describe('Auth Utils', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);
      const isMatch = await comparePassword(password, hash);
      
      expect(isMatch).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);
      const isMatch = await comparePassword('wrongpassword', hash);
      
      expect(isMatch).toBe(false);
    });
  });

  describe('validateEnvVariables', () => {
    it('should not throw if required variables are set', () => {
      // Our .env file has these set
      expect(() => validateEnvVariables()).not.toThrow();
    });
  });
});
