import { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import * as fabric from 'fabric';

export const useCanvas = (isSelecting, pdfDoc, page, onSelectionComplete) => {
  const internalCanvasRef = useRef(null); // Internal ref for Fabric.js operations
  const fabricCanvasRef = useRef(null);
  const [params, setParams] = useState([]);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const isCanvasReadyRef = useRef(false); // Ref that always has the current isCanvasReady value
  const [canvasElement, setCanvasElement] = useState(null);
  const isInitializedRef = useRef(false); // Track if we've already initialized

  // Callback ref to capture when canvas element is attached
  const canvasRef = useCallback((element) => {
    console.log('useCanvas: canvasRef callback called', { element: !!element, internalRef: !!internalCanvasRef.current });
    internalCanvasRef.current = element;
    if (element && !isInitializedRef.current) {
      console.log('useCanvas: Canvas element attached to DOM, triggering state update');
      isInitializedRef.current = true;
      setCanvasElement(element); // This triggers re-render and effect below
    }
  }, []); // Empty deps - this callback never changes

  // Initialize canvas when element becomes available - use useLayoutEffect for synchronous execution
  useLayoutEffect(() => {
    console.log('useCanvas: useLayoutEffect triggered', { 
      canvasElement: !!canvasElement, 
      isCanvasReady,
      internalRef: !!internalCanvasRef.current 
    });

    if (!canvasElement || isCanvasReady) {
      console.log('useCanvas: Skipping initialization', { hasElement: !!canvasElement, isReady: isCanvasReady });
      return;
    }

    console.log('useCanvas: Starting canvas initialization');
    
    const timer = setTimeout(() => {
      try {
        if (!internalCanvasRef.current) {
          console.error('Canvas ref was lost after initialization delay');
          return;
        }

        const canvas = internalCanvasRef.current;
        canvas.width = canvas.offsetWidth || 800;
        canvas.height = canvas.offsetHeight || 600;

        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.dispose();
          fabricCanvasRef.current = null;
        }

        console.log('useCanvas: Creating Fabric.js canvas instance', { width: canvas.width, height: canvas.height });
        fabricCanvasRef.current = new fabric.Canvas(canvas, {
          interactive: true,
          width: canvas.width,
          height: canvas.height,
        });

        canvas.style.visibility = 'hidden';
        if (fabricCanvasRef.current.upperCanvasEl) {
          fabricCanvasRef.current.upperCanvasEl.style.visibility = 'hidden';
        }
        if (fabricCanvasRef.current.lowerCanvasEl) {
          fabricCanvasRef.current.lowerCanvasEl.style.visibility = 'hidden';
        }
        
        const wrapper = canvas.parentElement;
        if (wrapper) {
          wrapper.style.visibility = 'hidden';
        }

        console.log('useCanvas: Canvas initialization complete, setting isCanvasReady to true');
        setIsCanvasReady(true);
        isCanvasReadyRef.current = true; // Keep ref in sync
      } catch (error) {
        console.error('Error during canvas initialization:', error);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [canvasElement, isCanvasReady]);

  useEffect(() => {
    if (!fabricCanvasRef.current || !isCanvasReady) return;

    if (isSelecting) {
      fabricCanvasRef.current.set('cursor', 'crosshair');
      if (internalCanvasRef.current) {
        internalCanvasRef.current.style.cursor = 'crosshair';
      }
    } else {
      fabricCanvasRef.current.set('cursor', 'default');
      if (internalCanvasRef.current) {
        internalCanvasRef.current.style.cursor = 'default';
      }
    }
  }, [isSelecting, isCanvasReady]);

  useEffect(() => {
    if (!fabricCanvasRef.current || !isCanvasReady) return;

    const handleFabricMouseDown = (opt) => {
      if (!isSelecting) return;

      const pointer = fabricCanvasRef.current.getPointer(opt.e);
      const startX = pointer.x;
      const startY = pointer.y;
      const selectionRect = new fabric.Rect({
        left: startX,
        top: startY,
        width: 0,
        height: 0,
        fill: 'rgba(0, 0, 255, 0.2)',
        stroke: 'blue',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
      });
      fabricCanvasRef.current.add(selectionRect);
      fabricCanvasRef.current.set('selectionRect', selectionRect);
      fabricCanvasRef.current.set('startX', startX);
      fabricCanvasRef.current.set('startY', startY);
    };

    const handleFabricMouseMove = (opt) => {
      if (!isSelecting || !fabricCanvasRef.current.get('selectionRect')) return;

      const pointer = fabricCanvasRef.current.getPointer(opt.e);
      const currentX = pointer.x;
      const currentY = pointer.y;
      const startX = fabricCanvasRef.current.get('startX');
      const startY = fabricCanvasRef.current.get('startY');
      const selectionRect = fabricCanvasRef.current.get('selectionRect');
      selectionRect.set({
        left: Math.min(startX, currentX),
        top: Math.min(startY, currentY),
        width: Math.abs(currentX - startX),
        height: Math.abs(currentY - startY),
      });
      fabricCanvasRef.current.requestRenderAll();
    };

    const handleFabricMouseUp = (opt) => {
      if (!isSelecting || !fabricCanvasRef.current.get('selectionRect')) return;

      const pointer = fabricCanvasRef.current.getPointer(opt.e);
      const endX = pointer.x;
      const endY = pointer.y;
      const startX = fabricCanvasRef.current.get('startX');
      const startY = fabricCanvasRef.current.get('startY');
      const x1 = Math.min(startX, endX);
      const y1 = Math.min(startY, endY);
      const x2 = Math.max(startX, endX);
      const y2 = Math.max(startY, endY);

      if (Math.abs(x2 - x1) > 5 && Math.abs(y2 - y1) > 5) {
        const newParam = {
          id: `Param ${Date.now()}`, 
          type: 'string',
          x1: x1.toFixed(2),
          y1: y1.toFixed(2),
          x2: x2.toFixed(2),
          y2: y2.toFixed(2),
          isMultiline: false,
          page: pdfDoc ? page : undefined,
        };
        setParams((prev) => [...prev, newParam]);
        onSelectionComplete(newParam);
      }

      const selectionRect = fabricCanvasRef.current.get('selectionRect');
      if (selectionRect) {
        fabricCanvasRef.current.remove(selectionRect);
      }
      fabricCanvasRef.current.set('selectionRect', null);
      fabricCanvasRef.current.set('startX', null);
      fabricCanvasRef.current.set('startY', null);
    };

    fabricCanvasRef.current.on('mouse:down', handleFabricMouseDown);
    fabricCanvasRef.current.on('mouse:move', handleFabricMouseMove);
    fabricCanvasRef.current.on('mouse:up', handleFabricMouseUp);

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.off('mouse:down', handleFabricMouseDown);
        fabricCanvasRef.current.off('mouse:move', handleFabricMouseMove);
        fabricCanvasRef.current.off('mouse:up', handleFabricMouseUp);
      }
    };
  }, [isSelecting, pdfDoc, page, onSelectionComplete, isCanvasReady]);

  const renderParamsOnImage = useCallback((currentParams) => {
    if (!fabricCanvasRef.current || !isCanvasReady) return;

    const objects = fabricCanvasRef.current.getObjects();
    objects.forEach(obj => {
      if (obj !== fabricCanvasRef.current.get('selectionRect')) {
        fabricCanvasRef.current.remove(obj);
      }
    });

    currentParams.forEach((param) => {
      const x1 = parseFloat(param.x1);
      const y1 = parseFloat(param.y1);
      const x2 = parseFloat(param.x2);
      const y2 = parseFloat(param.y2);
      const rect = new fabric.Rect({
        left: x1,
        top: y1,
        width: x2 - x1,
        height: y2 - y1,
        fill: 'rgba(255, 0, 255, 0.2)',
        stroke: 'magenta',
        strokeWidth: 2,
        selectable: false,
        evented: false,
      });
      const text = new fabric.Text(param.id, {
        left: x1 + 5,
        top: y1 + 16,
        fontFamily: 'Arial',
        fontSize: 16,
        fontWeight: 'bold',
        fill: 'cyan',
        selectable: false,
        evented: false,
      });
      fabricCanvasRef.current.add(rect, text);
    });
    fabricCanvasRef.current.requestRenderAll();
  }, [isCanvasReady]);

  useEffect(() => {
    renderParamsOnImage(params);
  }, [params, renderParamsOnImage]);

  const handleCanvasReady = useCallback((rect) => {
    console.log('useCanvas: handleCanvasReady called', {
      hasFabricCanvas: !!fabricCanvasRef.current,
      isCanvasReady: isCanvasReadyRef.current,
      hasInternalRef: !!internalCanvasRef.current,
      rect
    });
    
    if (fabricCanvasRef.current && isCanvasReadyRef.current && internalCanvasRef.current) {
      const wrapper = internalCanvasRef.current.closest('[data-canvas-section]');
      
      console.log('useCanvas: Setting canvas visibility', {
        hasWrapper: !!wrapper,
        hasUpperCanvas: !!fabricCanvasRef.current.upperCanvasEl,
        hasLowerCanvas: !!fabricCanvasRef.current.lowerCanvasEl
      });
      
      if (wrapper) {
        // Check if rect has new structure (container + image) or old structure (direct position)
        const hasNewStructure = rect.container && rect.image;
        
        if (hasNewStructure) {
          // New structure: Position wrapper at final image position (container + image offset)
          const finalLeft = rect.container.left + rect.image.left;
          const finalTop = rect.container.top + rect.image.top;
          
          wrapper.style.position = 'absolute';
          wrapper.style.left = `${finalLeft}px`;
          wrapper.style.top = `${finalTop}px`;
          wrapper.style.width = `${rect.image.width}px`;
          wrapper.style.height = `${rect.image.height}px`;
          wrapper.style.zIndex = '1000';
          wrapper.style.visibility = 'visible';
          
          console.log('useCanvas: Applied wrapper styles (combined position)', {
            position: 'absolute',
            left: `${finalLeft}px`,
            top: `${finalTop}px`,
            containerLeft: rect.container.left,
            containerTop: rect.container.top,
            imageOffsetLeft: rect.image.left,
            imageOffsetTop: rect.image.top,
            width: `${rect.image.width}px`,
            height: `${rect.image.height}px`
          });
          
          // Canvas element: no positioning, just dimensions
          // Let Fabric.js handle its internal canvas layers
          internalCanvasRef.current.style.position = '';
          internalCanvasRef.current.style.left = '';
          internalCanvasRef.current.style.top = '';
          internalCanvasRef.current.width = rect.image.width;
          internalCanvasRef.current.height = rect.image.height;
          internalCanvasRef.current.style.visibility = 'visible';
          
          fabricCanvasRef.current.setDimensions({
            width: rect.image.width,
            height: rect.image.height,
          });
          
          console.log('useCanvas: Canvas element dimensions set (no positioning)', {
            width: `${rect.image.width}px`,
            height: `${rect.image.height}px`
          });
        } else {
          // Old structure: direct positioning (fallback for other calls)
          wrapper.style.position = 'absolute';
          wrapper.style.left = `${rect.left}px`;
          wrapper.style.top = `${rect.top}px`;
          wrapper.style.width = `${rect.width}px`;
          wrapper.style.height = `${rect.height}px`;
          wrapper.style.zIndex = '1000';
          wrapper.style.visibility = 'visible';
          
          console.log('useCanvas: Applied wrapper styles (old structure)', {
            position: 'absolute',
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`
          });
          
          internalCanvasRef.current.width = rect.width;
          internalCanvasRef.current.height = rect.height;
          internalCanvasRef.current.style.visibility = 'visible';
          
          fabricCanvasRef.current.setDimensions({
            width: rect.width,
            height: rect.height,
          });
        }
        
        const fabricWrapper = internalCanvasRef.current.parentElement;
        if (fabricWrapper && fabricWrapper.classList.contains('canvas-container')) {
          fabricWrapper.style.position = 'static';
          fabricWrapper.style.left = 'auto';
          fabricWrapper.style.top = 'auto';
          fabricWrapper.style.width = '100%';
          fabricWrapper.style.height = '100%';
        }
        
        if (fabricCanvasRef.current.upperCanvasEl && fabricCanvasRef.current.lowerCanvasEl) {
          fabricCanvasRef.current.upperCanvasEl.style.position = 'absolute';
          fabricCanvasRef.current.upperCanvasEl.style.left = '0';
          fabricCanvasRef.current.upperCanvasEl.style.top = '0';
          fabricCanvasRef.current.upperCanvasEl.style.visibility = 'visible';
          fabricCanvasRef.current.lowerCanvasEl.style.position = 'absolute';
          fabricCanvasRef.current.lowerCanvasEl.style.left = '0';
          fabricCanvasRef.current.lowerCanvasEl.style.top = '0';
          fabricCanvasRef.current.lowerCanvasEl.style.visibility = 'visible';
        }
      }
      
      console.log('useCanvas: Canvas visibility set to visible');
      renderParamsOnImage(params);
    } else {
      console.warn('useCanvas: handleCanvasReady conditions not met', {
        hasFabricCanvas: !!fabricCanvasRef.current,
        isCanvasReady: isCanvasReadyRef.current,
        hasInternalRef: !!internalCanvasRef.current
      });
    }
  }, [params, renderParamsOnImage]);

  const hideCanvas = useCallback(() => {
    const wrapper = internalCanvasRef.current?.closest('[data-canvas-section]');
    if (wrapper) {
      wrapper.style.visibility = 'hidden';
    }
    
    if (internalCanvasRef.current) {
      internalCanvasRef.current.style.visibility = 'hidden';
    }
    if (fabricCanvasRef.current?.upperCanvasEl) {
      fabricCanvasRef.current.upperCanvasEl.style.visibility = 'hidden';
    }
    if (fabricCanvasRef.current?.lowerCanvasEl) {
      fabricCanvasRef.current.lowerCanvasEl.style.visibility = 'hidden';
    }
  }, []);

  return {
    canvasRef: canvasRef, // Return callback ref instead of regular ref
    fabricCanvasRef,
    params,
    setParams,
    renderParamsOnImage,
    handleCanvasReady,
    hideCanvas,
    isCanvasReadyRef, // Return the ref itself so consumers can check .current
  };
};