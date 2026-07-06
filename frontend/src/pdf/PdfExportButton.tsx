import type { AssessmentResult } from '@dinhduong/shared';
import { useRef, useState } from 'react';
import { useToast } from '../components/shared/ToastContext';
import { exportResultAsPdf } from './exportPdf';
import { PdfReportTemplate } from './PdfReportTemplate';

export function PdfExportButton({ result }: { result: AssessmentResult }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { showToast } = useToast();

  async function handleExport() {
    const el = containerRef.current;
    if (!el) return;

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
      setIsGenerating(false);
    }
  }

  return (
    <>
      <button className="btn-pdf" onClick={handleExport} disabled={isGenerating}>
        📄 {isGenerating ? 'Đang xuất...' : 'Xuất PDF'}
      </button>

      <div id="pdf-template" ref={containerRef}>
        <PdfReportTemplate result={result} />
      </div>

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
