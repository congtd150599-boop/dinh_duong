declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: { type?: string; quality?: number };
    html2canvas?: Record<string, unknown>;
    jsPDF?: Record<string, unknown>;
    pagebreak?: { mode?: string[] };
  }

  interface Html2PdfInstance {
    set(opt: Html2PdfOptions): Html2PdfInstance;
    from(element: HTMLElement): Html2PdfInstance;
    save(): Promise<void>;
    /** Resolves the rendered PDF as a Blob instead of triggering a download — used to email the report. */
    outputPdf(type: 'blob'): Promise<Blob>;
  }

  function html2pdf(): Html2PdfInstance;
  export default html2pdf;
}
