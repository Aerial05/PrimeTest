import React, { useEffect, useRef } from 'react';
import styles from './ReportPreviewModal.module.css';

export function ReportPreviewModal({ html, onClose, onPrint, onDownloadPdf }) {
  const frameRef = useRef(null);

  useEffect(() => {
    const iframe = frameRef.current;
    if (!iframe) return;
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html || '<!doctype html><html><body><p>No report content.</p></body></html>');
    doc.close();
  }, [html]);

  const defaultPrint = () => {
    const iframe = frameRef.current;
    if (!iframe) return;
    const win = iframe.contentWindow;
    try { win.focus(); } catch (_) {}
    try { win.print(); } catch (_) {}
  };

  const defaultDownloadPdf = async () => {
    const iframe = frameRef.current;
    if (!iframe) return;
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    const { default: html2canvas } = await import('html2canvas');
    const { jsPDF } = await import('jspdf');
    const element = doc.body;
    const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }
    pdf.save(`Dashboard-Report-${new Date().toISOString().slice(0,10)}.pdf`);
  };


  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.title}>Report Preview</div>
          <div className={styles.actions}>
            <button className={styles.btn} onClick={onDownloadPdf || defaultDownloadPdf} title="Download as PDF">Download PDF</button>
            <button className={styles.btn} onClick={onPrint || defaultPrint}>Print</button>
            <button className={`${styles.btn}`} onClick={onClose}>Close</button>
          </div>
        </div>
        <div className={styles.frameWrap}>
          <iframe ref={frameRef} className={styles.frame} title="Report Preview" />
        </div>
      </div>
    </div>
  );
}

export default ReportPreviewModal;