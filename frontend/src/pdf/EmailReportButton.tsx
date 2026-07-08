import type { AssessmentResult } from '@dinhduong/shared';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { sendPatientReport } from '../api/patients';
import { ApiError } from '../api/client';
import { useToast } from '../components/shared/ToastContext';
import { generateResultPdfBlob } from './exportPdf';
import { pdfCaptureRoot } from './pdfCaptureRoot';
import { PdfReportTemplate } from './PdfReportTemplate';

/** Chunked to avoid "Maximum call stack size exceeded" from spreading a large Uint8Array into String.fromCharCode at once (multi-page PDFs can be several hundred KB+). */
async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function EmailReportButton({ result, patientId }: { result: AssessmentResult; patientId: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Synchronous re-entrancy guard — `isSending` (React state) only blocks the
  // button after a re-render, which leaves a window for a fast double-click
  // to fire handleSend() twice concurrently. Both calls would then share
  // containerRef while toggling its display imperatively, and whichever call
  // finishes first hides the element mid-capture for the other, producing a
  // blank PDF. A ref is checked/set synchronously, closing that window.
  const isSendingRef = useRef(false);
  const [isSending, setIsSending] = useState(false);
  const { showToast } = useToast();

  if (!patientId) {
    return (
      <button className="btn-secondary" disabled title="Cần lưu hồ sơ trước khi gửi email">
        📧 Gửi báo cáo
      </button>
    );
  }

  async function handleSend() {
    if (isSendingRef.current) return;
    const el = containerRef.current;
    if (!el || !patientId) return;

    isSendingRef.current = true;
    setIsSending(true);
    el.style.display = 'block';

    try {
      const { blob } = await generateResultPdfBlob(el, result);
      const pdfBase64 = await blobToBase64(blob);
      const { sent, recipients } = await sendPatientReport(patientId, pdfBase64);
      showToast(`📧 Đã gửi báo cáo tới ${sent} người (${recipients.join(', ')})`, 'success');
    } catch (err) {
      const message = err instanceof ApiError ? ((err.details as { error?: string })?.error ?? err.message) : 'Không rõ lỗi';
      showToast(`Lỗi gửi báo cáo: ${message}`, 'error');
    } finally {
      el.style.display = 'none';
      isSendingRef.current = false;
      setIsSending(false);
    }
  }

  return (
    <>
      <button className="btn-secondary" onClick={handleSend} disabled={isSending}>
        📧 {isSending ? 'Đang gửi...' : 'Gửi báo cáo'}
      </button>

      {createPortal(
        <div id="pdf-template-email" className="pdf-capture-template" ref={containerRef}>
          <PdfReportTemplate result={result} />
        </div>,
        pdfCaptureRoot,
      )}

      {isSending && (
        <div className="pdf-generating">
          <div className="pdf-generating-box">
            <div className="pdf-spinner" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#004D40', marginBottom: 6 }}>Đang gửi báo cáo...</h3>
            <p style={{ fontSize: 13, color: '#616161' }}>Vui lòng chờ trong giây lát</p>
          </div>
        </div>
      )}
    </>
  );
}
