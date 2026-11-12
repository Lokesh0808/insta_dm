import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { startTestDatabase, stopTestDatabase, clearDatabase } from './helpers';

const app = createApp();

const registerGrace = async () =>
  request(app)
    .post('/api/auth/register')
    .send({ name: 'Grace', email: 'grace@example.com', password: 'StrongPass123' })
    .expect(201);

describe('Authentication API', () => {
  beforeAll(async () => {
    await startTestDatabase();
  }, 120000);

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /api/auth/register', () => {
    it('creates a user, workspace and subscription', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          password: 'StrongPass123',
          workspaceName: 'Analytical Engines',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('ada@example.com');
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.accessToken).toEqual(expect.any(String));
      expect(res.body.data.refreshToken).toEqual(expect.any(String));

      expect(await mongoose.connection.collection('workspaces').countDocuments()).toBe(1);
      expect(await mongoose.connection.collection('subscriptions').countDocuments()).toBe(1);
    });

    it('rejects a weak password with a validation error', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Weak', email: 'weak@example.com', password: 'short' })
        .expect(422);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'Ada', email: 'dup@example.com', password: 'StrongPass123' })
        .expect(201);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Ada2', email: 'dup@example.com', password: 'StrongPass123' })
        .expect(409);

      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await registerGrace();
    });

    it('signs in with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'grace@example.com', password: 'StrongPass123' })
        .expect(200);

      expect(res.body.data.accessToken).toEqual(expect.any(String));
    });

    it('rejects an incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'grace@example.com', password: 'WrongPassword1' })
        .expect(401);

      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects an unknown email without revealing account existence', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'StrongPass123' })
        .expect(401);

      expect(res.body.error.message).toBe('Invalid email or password');
    });
  });

  describe('POST /api/auth/refresh', () => {
    beforeEach(async () => {
      await registerGrace();
    });

    it('issues a new access token and rotates the refresh token', async () => {
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: 'grace@example.com', password: 'StrongPass123' })
        .expect(200);

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: login.body.data.refreshToken })
        .expect(200);

      expect(res.body.data.accessToken).toEqual(expect.any(String));
      expect(res.body.data.refreshToken).not.toBe(login.body.data.refreshToken);
    });

    it('rejects a tampered refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'not.a.valid.token' })
        .expect(401);

      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('protected routes', () => {
    beforeEach(async () => {
      await registerGrace();
    });

    it('rejects requests without a token', async () => {
      await request(app).get('/api/analytics/overview').expect(401);
    });

    it('rejects requests with an invalid token', async () => {
      await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', 'Bearer invalid.token.value')
        .expect(401);
    });

    it('accepts a valid token', async () => {
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: 'grace@example.com', password: 'StrongPass123' })
        .expect(200);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${login.body.data.accessToken}`)
        .expect(200);

      expect(res.body.data.user.email).toBe('grace@example.com');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('always reports success', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'unknown@example.com' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/health', () => {
    it('reports service health', async () => {
      const res = await request(app).get('/api/health').expect(200);
      expect(res.body.data.services.mongodb).toBe('connected');
    });
  });
});
