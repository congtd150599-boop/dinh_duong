import type { AssessmentResult } from '@dinhduong/shared';
import { useRef, useState } from 'react';
import { sendPatientReport } from '../api/patients';
import { ApiError } from '../api/client';
import { useToast } from '../components/shared/ToastContext';
import { generateResultPdfBlob } from './exportPdf';
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
    const el = containerRef.current;
    if (!el || !patientId) return;

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
      setIsSending(false);
    }
  }

  return (
    <>
      <button className="btn-secondary" onClick={handleSend} disabled={isSending}>
        📧 {isSending ? 'Đang gửi...' : 'Gửi báo cáo'}
      </button>

      <div id="pdf-template-email" ref={containerRef} style={{ display: 'none' }}>
        <PdfReportTemplate result={result} />
      </div>
    </>
  );
}
