import React, { useEffect, useRef } from 'react';
import { useCanvas } from '../hooks/useCanvas';

const SectionCanvas = ({ 
  section, 
  isSelecting, 
  onParamSelected,
  onCanvasHandlerReady, 
  onlyView = false, 
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
    
    if (handler && !hasInitialized.current) {
      onCanvasHandlerReady(handler);
      hasInitialized.current = true;
      
      if (onlyView) {
        let readyAttempts = 0;
        const checkCanvasReady = () => {
          readyAttempts++;
          
          if (handler?.isCanvasReadyRef?.current && handler?.fabricCanvasRef?.current) {
            setTimeout(() => {
              const sectionContainer = document.querySelector(`[data-section="${section.id}"]`);
              const sectionImg = sectionContainer?.querySelector('img');
              const imgContainer = sectionImg?.parentElement; 
              
              if (sectionImg && sectionContainer && imgContainer && handler?.handleCanvasReady) {
                if (sectionImg.complete && sectionImg.naturalWidth > 0) {
                  const imgRect = sectionImg.getBoundingClientRect();
                  const containerRect = imgContainer.getBoundingClientRect();
                  const sectionRect = sectionContainer.getBoundingClientRect();
                  
                  const containerPosition = {
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
                  
                  handler.handleCanvasReady({ container: containerPosition, image: imageOffset });
                }
              }
            }, 100);
          } else if (readyAttempts < 20) {
            setTimeout(checkCanvasReady, 50);
          } else {
            console.warn(`Canvas handler not ready after 1 second for section ${section.id}`);
          }
        };
        
        setTimeout(checkCanvasReady, 100);
      }
    }
  }, [onCanvasHandlerReady, onlyView, section.id]);

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

    if (onlyView || (isSelecting && selectionChanged)) {
      let attempts = 0;
      const maxAttempts = 150; 
      
      const tryPositionCanvas = () => {
        attempts++;
        
        if (!handler?.isCanvasReadyRef?.current || !handler?.fabricCanvasRef?.current) {
          if (attempts < maxAttempts) {
            setTimeout(tryPositionCanvas, 20);
          } else {
            console.error(`Canvas handler not ready for section ${section.id} after ${maxAttempts * 20}ms`);
          }
          return;
        }
        
        const sectionContainer = document.querySelector(`[data-section="${section.id}"]`);
        const sectionImg = sectionContainer?.querySelector('img');
        const imgContainer = sectionImg?.parentElement; 
        
        if (attempts === 1 || attempts === maxAttempts) {
          console.log(`Section ${section.id} attempt ${attempts}:`, {
            hasContainer: !!sectionContainer,
            hasImgContainer: !!imgContainer,
            hasImg: !!sectionImg,
            imgComplete: sectionImg?.complete,
            imgNaturalWidth: sectionImg?.naturalWidth,
            hasHandler: !!handler,
            hasHandleCanvasReady: !!handler?.handleCanvasReady,
            isCanvasReady: handler?.isCanvasReadyRef?.current,
            hasFabricCanvas: !!handler?.fabricCanvasRef?.current
          });
        }
        
        if (sectionImg && sectionContainer && imgContainer && handler?.handleCanvasReady) {
          if (sectionImg.complete && sectionImg.naturalWidth > 0) {
            const imgRect = sectionImg.getBoundingClientRect();
            const containerRect = imgContainer.getBoundingClientRect();
            const sectionRect = sectionContainer.getBoundingClientRect();
            
            const containerPosition = {
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
            
            handler.handleCanvasReady({ container: containerPosition, image: imageOffset });
            return; 
          }
        }
        
        if (attempts < maxAttempts) {
          setTimeout(tryPositionCanvas, 20);
        } else {
          console.error(`Canvas failed to initialize for section ${section.id} after ${maxAttempts * 20}ms`);
          console.error('Final state:', {
            sectionContainer: !!sectionContainer,
            sectionImg: !!sectionImg,
            imgSrc: section.imageSrc,
            imgComplete: sectionImg?.complete,
            imgNaturalWidth: sectionImg?.naturalWidth,
            handler: !!handler,
            isCanvasReady: handler?.isCanvasReadyRef?.current,
            hasFabricCanvas: !!handler?.fabricCanvasRef?.current
          });
        }
      };
      
      setTimeout(tryPositionCanvas, 50);
    } else if (!isSelecting && selectionChanged && handler?.hideCanvas) {
      handler.hideCanvas();
    }
  }, [isSelecting, section.id, onlyView, section.imageSrc, section.page]);

  useEffect(() => {
    if (!isSelecting && !onlyView) return;

    const handleScroll = () => {
      const handler = canvasHandlerRef.current;
      const sectionContainer = document.querySelector(`[data-section="${section.id}"]`);
      const sectionImg = sectionContainer?.querySelector('img');
      const imgContainer = sectionImg?.parentElement; // The Box with orange border
      
      if (sectionImg && sectionContainer && imgContainer && handler?.handleCanvasReady && handler?.isCanvasReadyRef?.current && handler?.fabricCanvasRef?.current) {
        const imgRect = sectionImg.getBoundingClientRect();
        const containerRect = imgContainer.getBoundingClientRect();
        const sectionRect = sectionContainer.getBoundingClientRect();
        
        const containerPosition = {
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
        
        const wrapper = document.querySelector(`[data-canvas-section="${section.id}"]`);
        if (wrapper && wrapper.style.visibility !== 'hidden') {
          handler.handleCanvasReady({ container: containerPosition, image: imageOffset });
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isSelecting, onlyView, section.id]);

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
