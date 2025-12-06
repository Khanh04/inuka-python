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
}) => {
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const resizeCanvas = () => {
      if (imageRef.current && onCanvasReady) {
        const img = imageRef.current;
        const container = containerRef.current;
        if (!container) return;

        const sectionContainer = container.closest('[data-section]');
        if (!sectionContainer) return;

        const imgRect = img.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const sectionRect = sectionContainer.getBoundingClientRect();
        
        const containerViewportRect = {
          left: containerRect.left - sectionRect.left,
          top: containerRect.top - sectionRect.top,
          width: containerRect.width,
          height: containerRect.height,
        };
        
        const imageOffset = {
          left: imgRect.left - containerRect.left,
          top: imgRect.top - containerRect.top,
          width: imgRect.width,
          height: imgRect.height,
        };
        
        onCanvasReady({ container: containerViewportRect, image: imageOffset });
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
    window.addEventListener('scroll', resizeCanvas); 

    return () => {
      if (img) {
        img.removeEventListener('load', resizeCanvas);
      }
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('scroll', resizeCanvas);
    };
  }, [imageSrc, onCanvasReady]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1}}>
      {/* PDF Controls */}
      {pdfDoc && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Button
            variant="outlined"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
          >
            Previous Page
          </Button>
          <Typography>
            Page {page} of {totalPages}
          </Typography>
          <Button
            variant="outlined"
            disabled={page >= totalPages || loading}
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
      </Box>
    </Box>
  );
};

export default PdfViewer;