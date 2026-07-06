import type { AssessmentInput, AssessmentResult } from '@dinhduong/shared';
import { apiClient } from './client';

export function postAssessment(input: AssessmentInput): Promise<AssessmentResult> {
  return apiClient.post<AssessmentResult>('/assessments', input);
}
