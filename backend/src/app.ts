import type { PrismaClient } from '@prisma/client';
import cors from 'cors';
import express, { Express, NextFunction, Request, Response } from 'express';
import { assessmentsRouter } from './routes/assessments.route';
import { buildGrowthStandardsRouter } from './routes/growth-standards.route';
import { buildPatientsRouter } from './routes/patients.route';

export function createApp(prisma: PrismaClient): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/assessments', assessmentsRouter);
  app.use('/api/patients', buildPatientsRouter(prisma));
  app.use('/api/growth-standards', buildGrowthStandardsRouter(prisma));

  // Central error handler — anything thrown/rejected in a route (via asyncHandler)
  // lands here instead of crashing the process or hanging the request.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
