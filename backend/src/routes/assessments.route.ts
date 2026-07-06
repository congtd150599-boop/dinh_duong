import { Router } from 'express';
import { runAssessment } from '../services/assessment.service';
import { assessmentInputSchema } from '../validation/assessment-input.schema';

export const assessmentsRouter = Router();

// Stateless — powers live preview and "Xem Báo Cáo Chi Tiết". Never persists.
assessmentsRouter.post('/', (req, res) => {
  const parsed = assessmentInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const result = runAssessment(parsed.data);
  res.json(result);
});
