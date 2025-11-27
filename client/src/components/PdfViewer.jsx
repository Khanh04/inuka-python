import React, { useRef, useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';

const PdfViewer = ({
  imageSrc,
  pdfDoc,
  page,
  totalPages,
  onPageChange,
  loading,
  onCanvasReady,
  children, // For overlaying canvas or other elements
}) => {
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const resizeCanvas = () => {
      if (imageRef.current && onCanvasReady) {
        const img = imageRef.current;
        const container = containerRef.current;
        if (!container) return;

        const rect = img.getBoundingClientRect();
        onCanvasReady(rect);
      }
    };

    const img = imageRef.current;
    if (img) {
      img.addEventListener('load', resizeCanvas);
      if (img.complete) {
        resizeCanvas();
      }
    }

    window.addEventListener('resize', resizeCanvas);

    return () => {
      if (img) {
        img.removeEventListener('load', resizeCanvas);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [imageSrc, onCanvasReady]);

  return (
    <>
      {/* PDF Controls */}
      {pdfDoc && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Button
            variant="outlined"
            disabled={page <= 1 || loading.open}
            onClick={() => onPageChange(page - 1)}
          >
            Previous Page
          </Button>
          <Typography>
            Page {page} of {totalPages}
          </Typography>
          <Button
            variant="outlined"
            disabled={page >= totalPages || loading.open}
            onClick={() => onPageChange(page + 1)}
          >
            Next Page
          </Button>
        </Box>
      )}

      {/* Image Section */}
      <Box
        ref={containerRef}
        sx={{
          border: '2px solid orange',
          width: 800,
          height: 1131,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative'
        }}
      >
        <img
          ref={imageRef}
          src={imageSrc}
          alt="Template Image"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            width: 'auto',
            height: 'auto',
            zIndex: 1
          }}
          onDragStart={(e) => e.preventDefault()}
        />
        {children}
      </Box>
    </>
  );
};

export default PdfViewer;