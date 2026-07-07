import type { PrismaClient } from '@prisma/client';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Express, NextFunction, Request, Response } from 'express';
import { buildRequireAuth, requireRole } from './middleware/require-auth.middleware';
import { assessmentsRouter } from './routes/assessments.route';
import { buildAuthRouter } from './routes/auth.route';
import { buildChildrenRouter } from './routes/children.route';
import { buildFoodsRouter } from './routes/foods.route';
import { buildGrowthStandardsRouter } from './routes/growth-standards.route';
import { buildPatientsRouter } from './routes/patients.route';
import { buildUsersRouter } from './routes/users.route';

export function createApp(prisma: PrismaClient): Express {
  const app = express();
  // credentials: true is required for the auth cookie to be sent/read cross-origin
  // in dev (frontend :5173 → backend :4000); production is same-origin via Nginx
  // (see frontend/nginx.conf) so this only matters in dev.
  app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  const requireAuth = buildRequireAuth(prisma);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', buildAuthRouter(prisma));
  app.use('/api/users', requireAuth, requireRole('admin'), buildUsersRouter(prisma));
  app.use('/api/assessments', requireAuth, assessmentsRouter);
  app.use('/api/patients', requireAuth, buildPatientsRouter(prisma));
  app.use('/api/growth-standards', requireAuth, buildGrowthStandardsRouter(prisma));
  app.use('/api/foods', requireAuth, buildFoodsRouter(prisma));
  app.use('/api/children', requireAuth, buildChildrenRouter(prisma));

  // Central error handler — anything thrown/rejected in a route (via asyncHandler)
  // lands here instead of crashing the process or hanging the request.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
