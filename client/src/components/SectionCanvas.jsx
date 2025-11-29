import React, { useEffect, useRef } from 'react';
import { useCanvas } from '../hooks/useCanvas';

const SectionCanvas = ({ 
  section, 
  isSelecting, 
  onParamSelected,
  onCanvasHandlerReady 
}) => {
  const canvasHandler = useCanvas(
    isSelecting, 
    section.pdfDoc || null, 
    section.page || 1, 
    onParamSelected
  );

  const hasInitialized = useRef(false);
  const canvasId = `canvas-section-${section.id}`;
  const previousIsSelecting = useRef(isSelecting);
  const canvasHandlerRef = useRef(canvasHandler);

  useEffect(() => {
    canvasHandlerRef.current = canvasHandler;
  }, [canvasHandler]);

  useEffect(() => {
    const handler = canvasHandlerRef.current;
    if (handler && handler.canvasRef.current && !hasInitialized.current) {
      onCanvasHandlerReady(handler);
      hasInitialized.current = true;
    }
  }, [onCanvasHandlerReady]);

  useEffect(() => {
    const handler = canvasHandlerRef.current;
    if (isSelecting && handler?.setParams) {
      const existingParams = section.pdfDoc 
        ? (section.pdfPageParams[section.page] || [])
        : section.params;
      handler.setParams(existingParams);
    }
  }, [isSelecting, section.pdfDoc, section.page, section.pdfPageParams, section.params]);

  useEffect(() => {
    const handler = canvasHandlerRef.current;
    const selectionChanged = previousIsSelecting.current !== isSelecting;
    previousIsSelecting.current = isSelecting;

    if (isSelecting && selectionChanged) {
      let attempts = 0;
      const maxAttempts = 50; // Max 1 second (50 * 20ms)
      
      const tryPositionCanvas = () => {
        attempts++;
        const sectionContainer = document.querySelector(`[data-section="${section.id}"]`);
        const sectionImg = sectionContainer?.querySelector('img');
        
        if (sectionImg && sectionContainer && handler?.handleCanvasReady && handler?.isCanvasReady && handler?.fabricCanvasRef?.current) {
          const imgRect = sectionImg.getBoundingClientRect();
          const sectionRect = sectionContainer.getBoundingClientRect();
          
          const viewportRect = {
            left: imgRect.left - sectionRect.left,
            top: imgRect.top - sectionRect.top,
            width: imgRect.width,
            height: imgRect.height,
          };
          handler.handleCanvasReady(viewportRect);
        } else if (attempts < maxAttempts) {
          setTimeout(tryPositionCanvas, 20);
        } else {
          console.error('Canvas failed to initialize after', maxAttempts * 20, 'ms');
        }
      };
      
      setTimeout(tryPositionCanvas, 10);
    } else if (!isSelecting && selectionChanged && handler?.hideCanvas) {
      handler.hideCanvas();
    }
  }, [isSelecting, section.id]);

  useEffect(() => {
    if (!isSelecting) return;

    const handleScroll = () => {
      const handler = canvasHandlerRef.current;
      const sectionContainer = document.querySelector(`[data-section="${section.id}"]`);
      const sectionImg = sectionContainer?.querySelector('img');
      
      if (sectionImg && sectionContainer && handler?.handleCanvasReady) {
        const imgRect = sectionImg.getBoundingClientRect();
        const sectionRect = sectionContainer.getBoundingClientRect();
        
        const viewportRect = {
          left: imgRect.left - sectionRect.left,
          top: imgRect.top - sectionRect.top,
          width: imgRect.width,
          height: imgRect.height,
        };
        
        const wrapper = handler.canvasRef.current?.closest('[data-canvas-section]');
        if (wrapper && wrapper.style.visibility !== 'hidden') {
          handler.handleCanvasReady(viewportRect);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isSelecting, section.id]);

  return (
    <div 
      style={{ 
        position: 'absolute',
        pointerEvents: 'none',
        visibility: 'hidden', 
        zIndex: 1000,
      }}
      data-canvas-section={section.id}
    >
      <canvas
        ref={canvasHandler.canvasRef}
        id={canvasId}
        style={{
          display: 'block',
          pointerEvents: 'auto',
          width: '800px',
          height: '600px',
        }}
      />
    </div>
  );
};

export default SectionCanvas;
