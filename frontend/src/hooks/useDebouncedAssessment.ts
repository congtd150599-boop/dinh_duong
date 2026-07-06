import type { AssessmentInput, AssessmentResult } from '@dinhduong/shared';
import { useEffect, useRef, useState } from 'react';
import { postAssessment } from '../api/assessments';

const DEBOUNCE_MS = 350;

/**
 * Debounced live-preview calculation. Calls POST /api/assessments on every
 * change (not a client-side mirror of the calc engine) — see plan decision:
 * duplicating the WHO/Z-score/lab logic client-side would mean two copies of
 * clinically-sensitive logic that must stay in sync forever.
 */
export function useDebouncedAssessment(input: AssessmentInput | null) {
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  // Depend on a serialized key rather than the `input` object reference — callers
  // construct a fresh object every render, which would otherwise re-fire this on
  // every keystroke's render instead of only when the actual values change.
  const inputKey = input ? JSON.stringify(input) : null;

  useEffect(() => {
    if (!input) {
      setResult(null);
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);

    const timer = setTimeout(() => {
      postAssessment(input)
        .then((data) => {
          if (requestIdRef.current === requestId) {
            setResult(data);
            setError(null);
          }
        })
        .catch(() => {
          if (requestIdRef.current === requestId) {
            setError('Không thể tính toán. Vui lòng kiểm tra lại kết nối backend.');
          }
        })
        .finally(() => {
          if (requestIdRef.current === requestId) setIsLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputKey]);

  return { result, isLoading, error };
}
