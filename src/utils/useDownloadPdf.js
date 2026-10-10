import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { generateInvoicePdf } from './generatePdf';

// Shows a spinner on the button and a toast when the PDF is ready.
export function useDownloadPdf() {
  const toast = useToast();
  const [busyId, setBusyId] = useState(null);
  const download = async (inv) => {
    setBusyId(inv._id);
    await new Promise((r) => setTimeout(r, 60)); // lets the spinner paint before the PDF work starts
    try {
      generateInvoicePdf(inv);
      toast.success(`${inv.invoiceNo} PDF downloaded`);
    } catch {
      toast.error('Could not make the PDF. Please try again');
    } finally {
      setBusyId(null);
    }
  };
  return { download, busyId };
}
