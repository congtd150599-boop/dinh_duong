import type { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import { createPatient, deletePatient, exportPatientsCsv, getPatient, listPatients } from '../services/patient.service';
import { asyncHandler } from '../utils/async-handler';
import { assessmentInputSchema } from '../validation/assessment-input.schema';

export function buildPatientsRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const parsed = assessmentInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
        return;
      }
      const patient = await createPatient(prisma, parsed.data);
      res.status(201).json(patient);
    }),
  );

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      const patients = await listPatients(prisma);
      res.json(patients);
    }),
  );

  // Must be registered before '/:id' so "export" isn't captured as an :id param.
  router.get(
    '/export/csv',
    asyncHandler(async (_req, res) => {
      const csv = await exportPatientsCsv(prisma);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="NhatKyBenhNhan_${new Date().toISOString().slice(0, 10)}.csv"`,
      );
      res.send(csv);
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const patient = await getPatient(prisma, req.params.id);
      if (!patient) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.json(patient);
    }),
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const deleted = await deletePatient(prisma, req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.status(204).send();
    }),
  );

  return router;
}
