import type { AssessmentResult } from '@dinhduong/shared';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../components/shared/ToastContext';
import { exportResultAsPdf } from './exportPdf';
import { pdfCaptureRoot } from './pdfCaptureRoot';
import { PdfReportTemplate } from './PdfReportTemplate';

export function PdfExportButton({ result }: { result: AssessmentResult }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Synchronous re-entrancy guard — see EmailReportButton's identical guard
  // for why `isGenerating` (React state) alone isn't enough: a fast
  // double-click can fire handleExport() twice before the disabled state
  // re-renders, and both calls would race on the same containerRef's
  // display toggle, corrupting whichever capture is still in flight.
  const isGeneratingRef = useRef(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { showToast } = useToast();

  async function handleExport() {
    if (isGeneratingRef.current) return;
    const el = containerRef.current;
    if (!el) return;

    isGeneratingRef.current = true;
    setIsGenerating(true);
    // Toggle visibility imperatively (not via React state) so html2canvas sees the
    // laid-out DOM immediately, the same way legacy/index.html did with tpl.style.display.
    el.style.display = 'block';

    try {
      const fileName = await exportResultAsPdf(el, result);
      showToast(`📄 Đã xuất PDF: ${fileName}`, 'success');
    } catch (err) {
      showToast(`Lỗi xuất PDF: ${err instanceof Error ? err.message : 'Không rõ lỗi'}`, 'error');
    } finally {
      el.style.display = 'none';
      isGeneratingRef.current = false;
      setIsGenerating(false);
    }
  }

  return (
    <>
      <button className="btn-pdf" onClick={handleExport} disabled={isGenerating}>
        📄 {isGenerating ? 'Đang xuất...' : 'Xuất PDF'}
      </button>

      {createPortal(
        <div id="pdf-template" className="pdf-capture-template" ref={containerRef}>
          <PdfReportTemplate result={result} />
        </div>,
        pdfCaptureRoot,
      )}

      {isGenerating && (
        <div className="pdf-generating">
          <div className="pdf-generating-box">
            <div className="pdf-spinner" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#004D40', marginBottom: 6 }}>Đang tạo PDF...</h3>
            <p style={{ fontSize: 13, color: '#616161' }}>Vui lòng chờ trong giây lát</p>
          </div>
        </div>
      )}
    </>
  );
}
