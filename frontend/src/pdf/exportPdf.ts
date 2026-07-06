import type { AssessmentResult } from '@dinhduong/shared';
import html2pdf from 'html2pdf.js';

/** Verbatim port of the html2pdf options from legacy/index.html exportPDF() (lines 3168-3184). */
export async function exportResultAsPdf(element: HTMLElement, result: AssessmentResult): Promise<string> {
  const fileName = `DinhDuong_${result.name.replace(/\s+/g, '_')}_${result.examDate}.pdf`;

  await html2pdf()
    .set({
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
    })
    .from(element)
    .save();

  return fileName;
}
