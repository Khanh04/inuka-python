import { useState, useEffect } from 'react';
import * as pdfjs from 'pdfjs-dist';

export const usePdfHandler = () => {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [imageSrc, setImageSrc] = useState('./placeholder.png');
  const [pdfOriginalFilename, setPdfOriginalFilename] = useState('');
  const [loading, setLoading] = useState({ open: false, text: '', progress: 0 });

  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.54/pdf.worker.min.mjs';
  }, []);

  const loadPdf = async (file) => {
    setLoading({ open: true, text: 'Loading PDF...', progress: 0 });
    try {
      const arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
      });

      const loadPromise = pdfjs.getDocument({ data: arrayBuffer }).promise;
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('PDF loading timed out')), 30000)
      );
      const pdf = await Promise.race([loadPromise, timeoutPromise]);

      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setPage(1);
      setPdfOriginalFilename(file.name);
      await renderPage(1, pdf);
      setLoading({ open: false, text: '', progress: 0 });
    } catch (error) {
      console.error('Error loading PDF:', error);
      alert('Failed to load PDF: ' + error.message);
      setLoading({ open: false, text: '', progress: 0 });
    }
  };

  const renderPage = async (pageNumber, pdf = null) => {
    const renderPdf = pdfDoc ? pdfDoc : pdf;
    if (window.pageImages && window.pageImages[pageNumber]) {
      setImageSrc(window.pageImages[pageNumber]);
      return;
    }
    if (renderPdf) {
      try {
        const page = await Promise.race([
          renderPdf.getPage(pageNumber),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Page loading timed out')), 10000)),
        ]);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        const dataUrl = canvas.toDataURL('image/png');
        setImageSrc(dataUrl);
      } catch (error) {
        console.error('Error rendering PDF page:', error);
        alert(`Failed to render page ${pageNumber}: ${error.message}`);
        throw error;
      }
    }
  };

  const handlePageChange = async (newPage) => {
    if (pdfDoc && newPage >= 1 && newPage <= totalPages && !loading.open) {
      setLoading({ open: true, text: `Loading page ${newPage}...`, progress: 0 });
      try {
        setPage(newPage);
        await renderPage(newPage);
        setLoading({ open: false, text: '', progress: 0 });
      } catch (error) {
        console.error('Error navigating page:', error);
        alert('Failed to load page: ' + error.message);
        setLoading({ open: false, text: '', progress: 0 });
      }
    }
  };

  const loadImage = (file) => {
    setPdfDoc(null);
    setTotalPages(1);
    setPage(1);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  return {
    pdfDoc,
    page,
    totalPages,
    imageSrc,
    pdfOriginalFilename,
    loading,
    loadPdf,
    renderPage,
    handlePageChange,
    loadImage,
    setImageSrc,
    setPage,
    setTotalPages,
    setPdfDoc,
  };
};