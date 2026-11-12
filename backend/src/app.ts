import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import pinoHttp from 'pino-http';

import { env, isProd } from './config/env';
import { logger } from './config/logger';
import { swaggerSpec, registerSwaggerDocs } from './config/swagger';
import routes from './routes';
import { requestContext } from './middleware/requestContext';
import { corsMiddleware } from './middleware/cors';
import { apiLimiter } from './middleware/rateLimit';
import { mongoSanitize } from './middleware/sanitize';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { redis } from './config/redis';
import mongoose from 'mongoose';

export const createApp = () => {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // --- Security headers ----------------------------------------------------
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
              connectSrc: ["'self'", env.CLIENT_URL, env.API_URL, 'ws:', 'wss:'],
              fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
              frameAncestors: ["'none'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
      hsts: isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
    }),
  );

  app.use(
    corsMiddleware,
  );

  // --- Body parsing (raw body kept for Razorpay signature validation) ------
  app.use(
    express.json({
      limit: '2mb',
      verify: (req, _res, buf) => {
        (req as any).rawBody = buf?.toString('utf8');
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());
  app.use(compression());
  app.use(requestContext);
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/api/health' },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }),
  );

  // --- Health --------------------------------------------------------------
  app.get('/api/health', async (_req, res) => {
    const mongoState = mongoose.connection.readyState;
    const redisState = redis.status;
    const healthy = mongoState === 1;
    res.status(healthy ? 200 : 503).json({
      success: healthy,
      data: {
        status: healthy ? 'ok' : 'degraded',
        service: 'instaflow-backend',
        version: process.env.npm_package_version ?? '1.0.0',
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        services: {
          mongodb: mongoState === 1 ? 'connected' : 'disconnected',
          redis: redisState,
        },
      },
    });
  });

  app.get('/api', (_req, res) => {
    res.json({
      success: true,
      data: {
        name: env.APP_NAME,
        version: '1.0.0',
        documentation: '/api/docs',
        endpoints: [
          '/api/auth/*',
          '/api/instagram/*',
          '/api/automations/*',
          '/api/leads/*',
          '/api/conversations/*',
          '/api/analytics/*',
          '/api/billing/*',
          '/api/link-in-bio/*',
          '/api/admin/*',
          '/api/webhooks/*',
        ],
      },
    });
  });

  // --- API docs ------------------------------------------------------------
  registerSwaggerDocs(swaggerSpec as any);
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: `${env.APP_NAME} API` }));
  app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

  // --- API -----------------------------------------------------------------
  app.use('/api', mongoSanitize);
  app.use('/api', apiLimiter);
  app.use('/api', routes);

  // --- Errors --------------------------------------------------------------
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export default createApp;
