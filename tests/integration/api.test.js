const request = require('supertest');
const app = require('../../server-v2');

describe('API Endpoints', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
    });
  });

  describe('GET /', () => {
    it('should return the user form page', async () => {
      const response = await request(app)
        .get('/')
        .expect('Content-Type', /html/)
        .expect(200);

      expect(response.text).toContain('html');
    });
  });

  describe('GET /admin', () => {
    it('should return the admin panel page', async () => {
      const response = await request(app)
        .get('/admin')
        .expect('Content-Type', /html/)
        .expect(200);

      expect(response.text).toContain('html');
    });
  });

  describe('POST /api/v1/admin/login', () => {
    it('should reject login without password', async () => {
      const response = await request(app)
        .post('/api/v1/admin/login')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/v1/admin/login')
        .send({ password: 'wrongpassword' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should accept login with correct password', async () => {
      const response = await request(app)
        .post('/api/v1/admin/login')
        .send({ password: process.env.ADMIN_PASSWORD })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('token');
    });
  });

  describe('GET /api/v1/admin/submissions', () => {
    it('should reject without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/admin/submissions')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return submissions with valid token', async () => {
      // First login
      const loginResponse = await request(app)
        .post('/api/v1/admin/login')
        .send({ password: process.env.ADMIN_PASSWORD });

      const token = loginResponse.body.token;

      // Then get submissions
      const response = await request(app)
        .get('/api/v1/admin/submissions')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('submissions');
      expect(response.body).toHaveProperty('pagination');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
