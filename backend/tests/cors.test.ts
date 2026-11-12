import request from 'supertest';
import { createApp } from '../src/app';
import { resolveAllowedOrigin, isSameOrigin } from '../src/middleware/cors';
import { startTestDatabase, stopTestDatabase } from './helpers';

const app = createApp();

describe('CORS handling', () => {
  beforeAll(async () => {
    await startTestDatabase();
  }, 120000);

  afterAll(async () => {
    await stopTestDatabase();
  });

  describe('isSameOrigin', () => {
    it('matches a request whose origin equals the request host', () => {
      expect(isSameOrigin('http://localhost', 'localhost')).toBe(true);
      expect(isSameOrigin('http://127.0.0.1', '127.0.0.1')).toBe(true);
      expect(isSameOrigin('https://app.example.com', 'app.example.com')).toBe(true);
    });

    it('ignores the port difference', () => {
      expect(isSameOrigin('http://localhost:5173', 'localhost')).toBe(true);
    });

    it('rejects a different host', () => {
      expect(isSameOrigin('https://evil.example.com', 'localhost')).toBe(false);
      expect(isSameOrigin('http://localhost', 'evil.example.com')).toBe(false);
    });

    it('rejects when there is no host header', () => {
      expect(isSameOrigin('http://localhost', undefined)).toBe(false);
    });
  });

  describe('resolveAllowedOrigin', () => {
    it('allows an explicitly configured origin', () => {
      expect(resolveAllowedOrigin('http://localhost:5173')).toBe('http://localhost:5173');
    });

    it('allows the same origin even when it is not listed', () => {
      expect(resolveAllowedOrigin('http://127.0.0.1', '127.0.0.1')).toBe('http://127.0.0.1');
      expect(resolveAllowedOrigin('https://app.example.com', 'app.example.com')).toBe(
        'https://app.example.com',
      );
    });

    it('rejects a cross-site origin', () => {
      expect(resolveAllowedOrigin('https://evil.example.com', 'localhost')).toBeNull();
    });

    it('returns null when there is no origin header', () => {
      expect(resolveAllowedOrigin(undefined)).toBeNull();
    });
  });

  describe('POST /api/auth/login', () => {
    it('answers a same-origin request normally', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Origin', 'http://127.0.0.1')
        .set('Host', '127.0.0.1')
        .send({ email: 'nobody@example.com', password: 'WrongPass123' });

      expect(res.status).toBe(401);
      expect(res.headers['access-control-allow-origin']).toBe('http://127.0.0.1');
    });

    it('answers a disallowed origin with 403 (never a 500)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Origin', 'https://evil.example.com')
        .set('Host', 'localhost')
        .send({ email: 'nobody@example.com', password: 'WrongPass123' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toMatch(/not allowed/i);
    });

    it('answers a preflight request for a same-origin client', async () => {
      const res = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://127.0.0.1')
        .set('Host', '127.0.0.1')
        .set('Access-Control-Request-Method', 'POST');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('http://127.0.0.1');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });
  });
});
