import { useRef, useEffect, useState, useCallback } from 'react';
import * as fabric from 'fabric';

export const useCanvas = (isSelecting, pdfDoc, page, onSelectionComplete) => {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [params, setParams] = useState([]);
  const [isCanvasReady, setIsCanvasReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    if (isCanvasReady && fabricCanvasRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      try {
        if (!canvasRef.current) {
          console.error('Canvas ref lost during initialization timeout');
          return;
        }

        const canvas = canvasRef.current;
        canvas.width = canvas.offsetWidth || 800;
        canvas.height = canvas.offsetHeight || 600;

        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.dispose();
          fabricCanvasRef.current = null;
        }

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

        setIsCanvasReady(true);
      } catch (error) {
        console.error('Error during canvas initialization:', error);
      }
    }, 50);

    return () => {
      clearTimeout(timer);
    };
  }, [isCanvasReady]);

  useEffect(() => {
    if (!fabricCanvasRef.current || !isCanvasReady) return;

    if (isSelecting) {
      fabricCanvasRef.current.set('cursor', 'crosshair');
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'crosshair';
      }
    } else {
      fabricCanvasRef.current.set('cursor', 'default');
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'default';
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
    if (fabricCanvasRef.current && isCanvasReady && canvasRef.current) {
      const wrapper = canvasRef.current.closest('[data-canvas-section]');
      
      if (wrapper) {
        wrapper.style.position = 'absolute';
        wrapper.style.left = `${rect.left}px`;
        wrapper.style.top = `${rect.top}px`;
        wrapper.style.width = `${rect.width}px`;
        wrapper.style.height = `${rect.height}px`;
        wrapper.style.zIndex = '1000';
        wrapper.style.visibility = 'visible'; 
        
        const fabricWrapper = canvasRef.current.parentElement;
        if (fabricWrapper && fabricWrapper.classList.contains('canvas-container')) {
          fabricWrapper.style.position = 'static';
          fabricWrapper.style.left = 'auto';
          fabricWrapper.style.top = 'auto';
          fabricWrapper.style.width = '100%';
          fabricWrapper.style.height = '100%';
        }
      }
      
      canvasRef.current.width = rect.width;
      canvasRef.current.height = rect.height;
      
      canvasRef.current.style.visibility = 'visible';
      
      fabricCanvasRef.current.setDimensions({
        width: rect.width,
        height: rect.height,
      });
      
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
      
      renderParamsOnImage(params);
    }
  }, [params, isCanvasReady, renderParamsOnImage]);

  const hideCanvas = useCallback(() => {
    const wrapper = canvasRef.current?.closest('[data-canvas-section]');
    if (wrapper) {
      wrapper.style.visibility = 'hidden';
    }
    
    if (canvasRef.current) {
      canvasRef.current.style.visibility = 'hidden';
    }
    if (fabricCanvasRef.current?.upperCanvasEl) {
      fabricCanvasRef.current.upperCanvasEl.style.visibility = 'hidden';
    }
    if (fabricCanvasRef.current?.lowerCanvasEl) {
      fabricCanvasRef.current.lowerCanvasEl.style.visibility = 'hidden';
    }
  }, []);

  return {
    canvasRef,
    fabricCanvasRef,
    params,
    setParams,
    renderParamsOnImage,
    handleCanvasReady,
    hideCanvas,
    isCanvasReady, 
  };
};