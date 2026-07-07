import type { AssessmentResult } from '@dinhduong/shared';
import html2pdf from 'html2pdf.js';

/** Verbatim port of the html2pdf options from legacy/index.html exportPDF() (lines 3168-3184). */
function buildPdfOptions(fileName: string) {
  return {
    margin: 0,
    filename: fileName,
    image: { type: 'jpeg', quality: 0.97 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      logging: false,
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };
}

function pdfFileName(result: AssessmentResult): string {
  return `DinhDuong_${result.name.replace(/\s+/g, '_')}_${result.examDate}.pdf`;
}

export async function exportResultAsPdf(element: HTMLElement, result: AssessmentResult): Promise<string> {
  const fileName = pdfFileName(result);
  await html2pdf().set(buildPdfOptions(fileName)).from(element).save();
  return fileName;
}

/** Same rendering as exportResultAsPdf, but resolves the PDF as a Blob (for emailing) instead of triggering a browser download. */
export async function generateResultPdfBlob(element: HTMLElement, result: AssessmentResult): Promise<{ blob: Blob; fileName: string }> {
  const fileName = pdfFileName(result);
  const blob = await html2pdf().set(buildPdfOptions(fileName)).from(element).outputPdf('blob');
  return { blob, fileName };
}
