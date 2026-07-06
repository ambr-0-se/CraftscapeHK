
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as express from 'express';

// For Vercel: export a handler creator
export async function createNestServer() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { 
    bodyParser: false,
    cors: true // Enable CORS at creation
  });

  // CORS must be configured FIRST before any middleware
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5000',
        'http://localhost:5173',
        'http://localhost:3001',
        /^http:\/\/localhost:50\d{2}$/,
        /^http:\/\/127\.0\.0\.1:50\d{2}$/,
        'https://craftscape-hk.vercel.app',
        'https://craftscape-backend-998275462099.us-central1.run.app',
        'https://craftscape-backend-jekg23xn5a-uc.a.run.app',
        // Cloud Run frontend - allow both versioned and latest deployments
        'https://craftscape-frontend-998275462099.us-central1.run.app',
        /^https:\/\/craftscape-frontend-[a-z0-9-]+\.us-central1\.run\.app$/,
        'https://80323cac-9cf1-4503-afba-de3082d32504-00-2vq4n4lqc6zbv.sisko.replit.dev',
        'https://80323cac-9cf1-4503-afba-de3082d32504-00-2vq4n4lqc6zbv.sisko.replit.dev:3001',
      ];
      // Allow requests with no origin (mobile apps, Postman, curl, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }
      
      // Check if origin matches any allowed origin (including regex patterns)
      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return allowed === origin;
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`⚠️  CORS request from unauthorized origin: ${origin}`);
        callback(null, true); // Still allow for development; set to false in strict production
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Stripe webhook signature verification needs the unparsed request body,
  // so mount the raw parser for that route before the JSON parser.
  app.use('/api/payments/stripe/webhook', express.raw({ type: '*/*' }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.useStaticAssets(join(__dirname, '..', '..', 'public'), {
    prefix: '/',
  });
  app.useStaticAssets(join(__dirname, '..', '..', 'assets'), {
    prefix: '/assets',
  });
  app.useStaticAssets(join(__dirname, '..', '..', 'assets', 'mahjong'), {
    prefix: '/',
  });

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }));

  await app.init();
  const expressApp = app.getHttpAdapter().getInstance();
  return expressApp;
}

// For local dev: keep original bootstrap
if (require.main === module) {
  (async () => {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      bodyParser: false, // Parsers are registered manually below (raw body for Stripe webhook)
      cors: true // Enable CORS at creation
    });
    
    // CORS configuration MUST be set FIRST before any middleware
    const allowedOrigins: Array<string | RegExp> = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
      : [
          'http://localhost:3000',
          'http://localhost:5000',
          'http://localhost:5173',
          'http://localhost:3001',
          /^http:\/\/localhost:50\d{2}$/,
          /^http:\/\/127\.0\.0\.1:50\d{2}$/,
          'https://craftscape-hk.vercel.app',
          'https://craftscape-backend-998275462099.us-central1.run.app',
          'https://craftscape-backend-jekg23xn5a-uc.a.run.app',
          // Cloud Run frontend - allow pattern matching for different deployment versions
          'https://craftscape-frontend-998275462099.us-central1.run.app',
          '/^https:\\/\\/craftscape-frontend-[a-z0-9-]+\\.us-central1\\.run\\.app$/',
          'https://80323cac-9cf1-4503-afba-de3082d32504-00-2vq4n4lqc6zbv.sisko.replit.dev',
          'https://80323cac-9cf1-4503-afba-de3082d32504-00-2vq4n4lqc6zbv.sisko.replit.dev:3001',
        ];

    app.enableCors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, curl, etc.)
        if (!origin) {
          callback(null, true);
          return;
        }
        
        // Check if origin matches any allowed origin (including regex patterns)
        const isAllowed = allowedOrigins.some(allowed => {
          if (allowed instanceof RegExp) {
            return allowed.test(origin);
          }
          if (typeof allowed === 'string' && allowed.startsWith('/') && allowed.endsWith('/')) {
            // Treat as regex pattern
            const pattern = new RegExp(allowed.slice(1, -1));
            return pattern.test(origin);
          }
          return allowed === origin;
        });
        
        if (isAllowed) {
          callback(null, true);
        } else {
          console.warn(`🚫 Blocked CORS request from origin: ${origin}`);
          callback(null, true); // Still allow for development; set to false in production
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      credentials: true,
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });

    // Stripe webhook signature verification needs the unparsed request body.
    app.use('/api/payments/stripe/webhook', express.raw({ type: '*/*' }));
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));
    app.useStaticAssets(join(__dirname, '..', '..', 'public'), {
      prefix: '/',
    });
    app.useStaticAssets(join(__dirname, '..', '..', 'assets'), {
      prefix: '/assets',
    });
    app.useStaticAssets(join(__dirname, '..', '..', 'assets', 'mahjong'), {
      prefix: '/',
    });
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
    }));
    const port = process.env.PORT || 3001;
    const host = process.env.HOST || '0.0.0.0';
    console.log(`Attempting to start server on http://${host}:${port}`);
    await app.listen(port, host);
    console.log(`🚀 Backend server is running on: http://${host}:${port}`);
    console.log(`📋 CORS origins:`, allowedOrigins);
  })();
}
