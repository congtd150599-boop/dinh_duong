/**
 * Shared portal target for the hidden PDF-capture templates (see
 * PdfExportButton.tsx / EmailReportButton.tsx). html2canvas needs a real,
 * laid-out DOM element to screenshot — it can't capture `display:none` — so
 * those templates are briefly toggled visible right before capture. If they
 * were rendered in place (as siblings of the trigger button), that toggle
 * would insert a full A4-width report block into the surrounding UI. Portaling
 * them here instead means the toggle only ever happens under this node, which
 * CSS (#pdf-capture-root in pdf.css) keeps positioned off-screen — so no
 * amount of toggling can visually disturb wherever the button actually lives.
 *
 * Created once at module load (this is a pure client-rendered app — see
 * main.tsx's ReactDOM.createRoot — so `document` is always available here)
 * and never removed; both buttons portal into this same node since they're
 * always mounted together on the Result screen, and multiple independent
 * createPortal calls can safely target one host node.
 */
export const pdfCaptureRoot: HTMLDivElement = (() => {
  const el = document.createElement('div');
  el.id = 'pdf-capture-root';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  return el;
})();
