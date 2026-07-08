import type { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import { requireRole } from '../middleware/require-auth.middleware';
import { recordAudit } from '../services/audit-log.service';
import { GuardianServiceError } from '../services/guardian.service';
import { createPatient, deletePatient, exportPatientsCsv, getPatient, listPatients, PatientServiceError } from '../services/patient.service';
import { ReportServiceError, sendPatientReportEmail } from '../services/report.service';
import { asyncHandler } from '../utils/async-handler';
import { assessmentInputSchema } from '../validation/assessment-input.schema';
import { sendReportSchema } from '../validation/report.schema';

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
      try {
        const patient = await createPatient(prisma, parsed.data);
        await recordAudit(prisma, {
          user: req.user!,
          action: 'patient.create',
          targetType: 'Patient',
          targetId: patient.id,
          summary: `Tạo hồ sơ bệnh nhân "${patient.name}" (khám ngày ${patient.examDate.toISOString().slice(0, 10)})`,
        });
        res.status(201).json(patient);
      } catch (err) {
        if (err instanceof PatientServiceError || err instanceof GuardianServiceError) {
          res.status(err.status).json({ error: err.message });
          return;
        }
        throw err;
      }
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

  // No requireRole — any authenticated staff can (re)send a report, same as
  // creating a patient or editing guardian contact info being open to all roles.
  router.post(
    '/:id/send-report',
    asyncHandler(async (req, res) => {
      const parsed = sendReportSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
        return;
      }
      try {
        const pdfBuffer = Buffer.from(parsed.data.pdfBase64, 'base64');
        const result = await sendPatientReportEmail(prisma, req.params.id, pdfBuffer);
        res.json(result);
      } catch (err) {
        if (err instanceof ReportServiceError) {
          res.status(err.status).json({ error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  router.delete(
    '/:id',
    requireRole('admin', 'bac_si'),
    asyncHandler(async (req, res) => {
      const deleted = await deletePatient(prisma, req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      await recordAudit(prisma, {
        user: req.user!,
        action: 'patient.delete',
        targetType: 'Patient',
        targetId: deleted.id,
        summary: `Xoá bệnh nhân "${deleted.name}" (khám ngày ${deleted.examDate.toISOString().slice(0, 10)})`,
      });
      res.status(204).send();
    }),
  );

  return router;
}
