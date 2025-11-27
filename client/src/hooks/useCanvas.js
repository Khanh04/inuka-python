import { useRef, useEffect, useState, useCallback } from 'react';
import * as fabric from 'fabric';

export const useCanvas = (isSelecting, pdfDoc, page, onSelectionComplete, onCanvasReady) => {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [params, setParams] = useState([]);

  useEffect(() => {
    fabricCanvasRef.current = new fabric.Canvas(canvasRef.current, {
      interactive: true,
    });

    if (isSelecting) {
      fabricCanvasRef.current.set('cursor', 'crosshair');
      canvasRef.current.style.cursor = 'crosshair';
    }

    // Attach Fabric.js mouse events
    const handleFabricMouseDown = (opt) => {
      if (isSelecting) {
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
        });
        fabricCanvasRef.current.add(selectionRect);
        fabricCanvasRef.current.set('selectionRect', selectionRect);
        fabricCanvasRef.current.set('startX', startX);
        fabricCanvasRef.current.set('startY', startY);
      }
    };

    const handleFabricMouseMove = (opt) => {
      if (isSelecting && fabricCanvasRef.current.get('selectionRect')) {
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
      }
    };

    const handleFabricMouseUp = (opt) => {
      if (isSelecting && fabricCanvasRef.current.get('selectionRect')) {
        const pointer = fabricCanvasRef.current.getPointer(opt.e);
        const endX = pointer.x;
        const endY = pointer.y;
        const startX = fabricCanvasRef.current.get('startX');
        const startY = fabricCanvasRef.current.get('startY');
        const x1 = Math.min(startX, endX);
        const y1 = Math.min(startY, endY);
        const x2 = Math.max(startX, endX);
        const y2 = Math.max(startY, endY);
        const newParam = {
          id: `Param ${params.length + 1}`,
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
        fabricCanvasRef.current.remove(fabricCanvasRef.current.get('selectionRect'));
        fabricCanvasRef.current.set('selectionRect', null);
      }
    };

    fabricCanvasRef.current.on('mouse:down', handleFabricMouseDown);
    fabricCanvasRef.current.on('mouse:move', handleFabricMouseMove);
    fabricCanvasRef.current.on('mouse:up', handleFabricMouseUp);

    return () => {
      fabricCanvasRef.current.off('mouse:down', handleFabricMouseDown);
      fabricCanvasRef.current.off('mouse:move', handleFabricMouseMove);
      fabricCanvasRef.current.off('mouse:up', handleFabricMouseUp);
      fabricCanvasRef.current.dispose();
    };
  }, [isSelecting, pdfDoc, page, onSelectionComplete, params]);

  const renderParamsOnImage = (currentParams) => {
    // Clear existing params
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
      });
      const text = new fabric.FabricText(param.id, {
        left: x1 + 5,
        top: y1 + 16,
        fontFamily: 'Arial',
        fontSize: 16,
        fontWeight: 'bold',
        fill: 'cyan',
        selectable: false,
      });
      fabricCanvasRef.current.add(rect, text);
    });
    fabricCanvasRef.current.requestRenderAll();
  };

  const resizeCanvas = useCallback((rect) => {
    if (fabricCanvasRef.current) {
      canvasRef.current.style.position = 'absolute';
      canvasRef.current.style.width = `${rect.width}px`;
      canvasRef.current.style.height = `${rect.height}px`;
      canvasRef.current.style.zIndex = 99;
      fabricCanvasRef.current.setDimensions({
        width: rect.width,
        height: rect.height,
      });
      renderParamsOnImage(params);
    }
  }, [params]);

  useEffect(() => {
    if (onCanvasReady) {
      onCanvasReady(resizeCanvas);
    }
  }, [onCanvasReady, resizeCanvas]);

  return {
    canvasRef,
    fabricCanvasRef,
    params,
    setParams,
    renderParamsOnImage,
  };
};