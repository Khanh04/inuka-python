import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Table, TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Select,
  MenuItem,
  TextField,
  InputLabel,
  FormControl
} from '@mui/material';
import * as fabric from 'fabric';
import * as pdfjs from 'pdfjs-dist';
import { useNavigate } from 'react-router-dom';
import { useTenantApiStore } from '../store/apiStore';

function TemplateEditor() {
  const navigate = useNavigate();
  const {
    templates,
    forms,
    files,
    newTemplate,
    loading: loadValue,
    error,
    getAllTemplatesForTenant,
    getAllFilesForTenant,
    getTemplateForTenantByTemplateID,
    getFileForTenantByFileID,
    getDocumentForTenantByFileID,
    getFormForTenantByTemplateID,
    createTemplate,
    uploadFormByTemplateID,
    clearNewTemplate
  } = useTenantApiStore();

  const PLACEHOLDER_PATH = `${import.meta.env.BASE_URL}placeholder.png`;

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [imageSrc, setImageSrc] = useState(PLACEHOLDER_PATH);
  const [params, setParams] = useState([]);
  const [pdfPageParams, setPdfPageParams] = useState({});
  const [templateOptionsList, setTemplateOptionsList] = useState([])
  const [originalImageFilename, setOriginalImageFilename] = useState('template.png');
  const [pdfOriginalFilename, setPdfOriginalFilename] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [loading, setLoading] = useState({ open: false, text: '', progress: 0 });
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const jsonInputRef = useRef(null);

  useEffect(() => {
    if (loadValue) {
      setLoading({ open: true, text: 'Pending...', progress: 0 });
    } else {
      setLoading({ open: false, text: '', progress: 0 });
    }
  }, [loadValue]);

  useEffect(() => {
    getAllTemplatesForTenant(1);
    getAllFilesForTenant(1);
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      getFormForTenantByTemplateID(1, selectedTemplate);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    if (templates?.length) {
      const returnOptionsList = templates.map(obj => {
        const { id, name } = obj;
        return {
          text: name,
          value: id
        }
      })
      setTemplateOptionsList([...returnOptionsList]);
    }
  }, [templates]);

  // Set PDF.js worker source
  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.54/pdf.worker.min.mjs';
  }, []);

  useEffect(() => {
    if (fabricCanvasRef?.current && pdfDoc) {
      renderParamsOnImage(page);
    }
  }, [params, pdfPageParams, page, fabricCanvasRef?.current, pdfDoc]);

  // Initialize Fabric.js canvas
  useEffect(() => {
    fabricCanvasRef.current = new fabric.Canvas(canvasRef.current, {
      // backgroundColor: 'transparent',
      interactive: true,
      // selection: false,
    });

    if (isSelecting) {
      fabricCanvasRef.current.set('cursor', 'crosshair');
      fabricCanvasRef.current.setCursor('crosshair');
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
        setParams((prev) => {
          const newParams = [...prev, newParam];
          if (pdfDoc) {
            setPdfPageParams((prevParams) => ({
              ...prevParams,
              [page]: newParams,
            }));
          }
          return newParams;
        });
        fabricCanvasRef.current.remove(fabricCanvasRef.current.get('selectionRect'));
        fabricCanvasRef.current.set('selectionRect', null);
        setIsSelecting(false);
        // fabricCanvasRef.current.set('cursor', 'default');
        renderParamsOnImage(page);
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
  }, [isSelecting, pdfDoc, page]);

  // }, [isSelecting, pdfDoc, page, params]);

  // Resize canvas to match image dimensions and position
  useEffect(() => {
    const resizeCanvas = () => {
      if (imageRef.current && fabricCanvasRef.current) {
        const img = imageRef.current;
        const container = containerRef.current;
        if (!container) return;

        const rect = img.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // Set canvas position and size to match the image exactly
        canvasRef.current.style.position = 'absolute';
        // canvasRef.current.style.left = `${rect.left - containerRect.left}px`;
        // canvasRef.current.style.top = `${rect.top - containerRect.top}px`;
        canvasRef.current.style.width = `${rect.width}px`;
        canvasRef.current.style.height = `${rect.height}px`;
        canvasRef.current.style.zIndex = 99;

        // Update Fabric.js dimensions
        fabricCanvasRef.current.setDimensions({
          width: rect.width,
          height: rect.height,
        });

        // Re-render parameters after resize
        renderParamsOnImage(page);
      }
    };

    const img = imageRef.current;
    if (img) {
      img.addEventListener('load', resizeCanvas);
      // Initial resize in case image is already loaded
      if (img.complete) {
        resizeCanvas();
      }
    }

    // Add resize listener for window changes
    window.addEventListener('resize', resizeCanvas);

    return () => {
      if (img) {
        img.removeEventListener('load', resizeCanvas);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [imageSrc, page]);

  // Handle image upload
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setOriginalImageFilename(file.name);
      setPdfDoc(null);
      setPdfPageParams({});
      setParams([]);
      setTotalPages(1);
      setPage(1);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle PDF upload
  const handlePdfUpload = async (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfOriginalFilename(file.name);
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
        setParams([]);
        setPdfPageParams({});
        await renderPage(1, pdf);
        setLoading({ open: false, text: '', progress: 0 });
      } catch (error) {
        console.error('Error loading PDF:', error);
        alert('Failed to load PDF: ' + error.message);
        setLoading({ open: false, text: '', progress: 0 });
      }
    }
  };

  // Render PDF page
  const renderPage = async (pageNumber, pdf = null) => {
    const renderPdf = pdfDoc ? pdfDoc : pdf;
    if (window.pageImages && window.pageImages[pageNumber]) {
      setImageSrc(window.pageImages[pageNumber]);
      setOriginalImageFilename(`${pdfOriginalFilename.replace('.pdf', '')}_page${pageNumber}.png`);
      renderParamsOnImage(pageNumber);
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
        setOriginalImageFilename(`${pdfOriginalFilename.replace('.pdf', '')}_page${pageNumber}.png`);
        renderParamsOnImage(pageNumber);
      } catch (error) {
        console.error('Error rendering PDF page:', error);
        alert(`Failed to render page ${pageNumber}: ${error.message}`);
        throw error;
      }
    }
  };

  // Handle page change
  const handlePageChange = async (newPage) => {
    if (pdfDoc && newPage >= 1 && newPage <= totalPages && !loading.open) {
      setLoading({ open: true, text: `Loading page ${newPage}...`, progress: 0 });
      try {
        saveCurrentPageParams();
        setPage(newPage);
        await renderPage(newPage);
        loadPageParams(newPage);
        setLoading({ open: false, text: '', progress: 0 });
      } catch (error) {
        console.error('Error navigating page:', error);
        alert('Failed to load page: ' + error.message);
        setLoading({ open: false, text: '', progress: 0 });
      }
    }
  };

  // Save current page params
  const saveCurrentPageParams = () => {
    if (pdfDoc && params.length > 0) {
      setPdfPageParams((prev) => ({ ...prev, [page]: [...params] }));
    }
  };

  // Load page params
  const loadPageParams = (pageNum) => {
    setParams(pdfPageParams[pageNum] || []);
    renderParamsOnImage(pageNum);
  };

  // Render parameters on image
  const renderParamsOnImage = (pageNum) => {
    // if (fabricCanvasRef?.current && fabricCanvasRef?.current?.clear) {
    //   fabricCanvasRef?.current?.clear();
    // }
    const currentParams = pdfDoc ? (pdfPageParams[pageNum] || []) : params;
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
      const valueReturn = fabricCanvasRef.current.add(rect, text);
      console.log('new num obj ', valueReturn);

    });
    fabricCanvasRef.current.requestRenderAll();
  };

  // Handle parameter selection
  const startSelection = () => {
    setIsSelecting(true);
    fabricCanvasRef.current.setCursor('crosshair');
    canvasRef.current.style.cursor = 'crosshair';
    canvasRef.current.style.pointerEvents = 'auto';
  };

  const handleGetAllTemplate = () => {
    getAllTemplatesForTenant(1);
    getAllFilesForTenant(1);
    // getTemplateForTenantByTemplateID,
    // getAllFilesForTenant,
    // getFileForTenantByFileID,
    // getDocumentForTenantByFileID,
  };

  // Save template
  const saveTemplate = async (isUpload) => {
    if (imageSrc === PLACEHOLDER_PATH || imageSrc === window.location.href) {
      alert('Please import a template image or PDF first.');
      return;
    }
    if ((pdfDoc && Object.values(pdfPageParams).every((p) => p.length === 0)) || (!pdfDoc && params.length === 0)) {
      alert('Please add at least one parameter before saving the template.');
      return;
    }
    setLoading({ open: true, text: 'Processing template...', progress: 0 });
    const templateData = {
      // id: `template_${Date.now()}`,
      description: `Template created on ${new Date().toLocaleDateString()}`,
      template: {
        source: pdfDoc
          ? {
            type: 'pdf',
            filename: pdfOriginalFilename,
            allPages: Object.keys(pdfPageParams).map(Number),
            totalPages,
          }
          : undefined,
        data: [],
      },
      params: pdfDoc ? [] : params,
      allPageParams: pdfDoc ? pdfPageParams : undefined,
    };
    if (pdfDoc) {
      saveCurrentPageParams();
      const allPageData = [];
      const originalPage = page;
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        setLoading({ open: true, text: `Processing page ${pageNum} of ${totalPages}...`, progress: (pageNum / totalPages) * 100 });
        await renderPage(pageNum);
        const img = imageRef.current;
        allPageData.push({
          page: pageNum,
          binary: img.src.split(',')[1] || '',
          size: { width: img.naturalWidth, height: img.naturalHeight },
          type: 'image/png',
        });
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      templateData.template.data = allPageData;
      setPage(originalPage);
      await renderPage(originalPage);
      loadPageParams(originalPage);
    } else {
      const img = imageRef.current;
      templateData.template.data = [{
        page: 1,
        binary: img.src.split(',')[1] || '',
        size: { width: img.naturalWidth, height: img.naturalHeight },
        type: 'image/png',
      }];
    }
    const jsonData = JSON.stringify(templateData, null, 4);
    if (isUpload) {
      const blob = new Blob([jsonData], { type: "application/json" });

      // Create a File object
      // const file = new File([blob], pdfOriginalFilename, { type: "application/json" });
      // createTemplate(jsonData, 1);
      uploadFormByTemplateID(jsonData, 1, selectedTemplate)
    } else {
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `template_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    setLoading({ open: false, text: '', progress: 0 });
  };

  // Load template
  const handleLoadTemplate = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const jsonData = JSON.parse(e.target.result);
          if (!jsonData.id || !jsonData.template || !jsonData.template.data) {
            throw new Error('Invalid template format: missing required fields');
          }
          setParams([]);
          setPdfPageParams({});
          const isPdfTemplate = jsonData.template.source && jsonData.template.source.type === 'pdf';
          if (isPdfTemplate) {
            setPdfOriginalFilename(jsonData.template.source.filename);
            setTotalPages(jsonData.template.source.totalPages || 1);
            setPage(jsonData.template.source.allPages[0] || 1);
            setPdfDoc({
              numPages: jsonData.template.source.totalPages || 1,
              getPage: (pageNum) => Promise.resolve({
                getViewport: () => ({
                  width: jsonData.template.data.find((d) => d.page === pageNum)?.size?.width || 800,
                  height: jsonData.template.data.find((d) => d.page === pageNum)?.size?.height || 1131,
                }),
              }),
            });
            const pageImages = {};
            jsonData.template.data.forEach((pageData) => {
              const imgSrc = pageData.binary.startsWith('data:') ? pageData.binary : `data:${pageData.type || 'image/png'};base64,${pageData.binary}`;
              pageImages[pageData.page] = imgSrc;
            });
            window.pageImages = pageImages;
            setImageSrc(pageImages[page]);
            setPdfPageParams(
              Object.fromEntries(
                Object.entries(jsonData.allPageParams || {}).map(([pageNum, pageParams]) => [
                  pageNum,
                  pageParams.map((param) => ({
                    id: param.id || `Param ${Math.random().toString(36).substring(2, 9)}`,
                    type: param.type || 'string',
                    x1: parseFloat(param.x1 || 0).toFixed(2),
                    y1: parseFloat(param.y1 || 0).toFixed(2),
                    x2: parseFloat(param.x2 || 0).toFixed(2),
                    y2: parseFloat(param.y2 || 0).toFixed(2),
                    isMultiline: Boolean(param.isMultiline),
                    page: Number(pageNum),
                  })),
                ])
              )
            );
            setParams([...(jsonData.allPageParams[page] || [])]);
          } else {
            setPdfDoc(null);
            setTotalPages(1);
            setPage(1);
            const imgSrc = jsonData.template.data[0].binary.startsWith('data:') ? jsonData.template.data[0].binary : `data:${jsonData.template.data[0].type || 'image/png'};base64,${jsonData.template.data[0].binary}`;
            setImageSrc(imgSrc);
            setParams(jsonData.params.map((param) => ({
              id: param.id || `Param ${params.length + 1}`,
              type: param.type || 'string',
              x1: parseFloat(param.x1 || 0).toFixed(2),
              y1: parseFloat(param.y1 || 0).toFixed(2),
              x2: parseFloat(param.x2 || 0).toFixed(2),
              y2: parseFloat(param.y2 || 0).toFixed(2),
              isMultiline: Boolean(param.isMultiline),
            })));
          }
          renderParamsOnImage(page);
        } catch (error) {
          console.error('Template loading error:', error);
          alert('Error loading template: ' + error.message);
        }
      };
      reader.readAsText(file);
    }
  };

  // Clear all params
  const clearAllParams = () => {
    if (window.confirm('Are you sure you want to clear all parameters?' + (pdfDoc ? ' (This will clear parameters for the current page only)' : ''))) {
      if (pdfDoc) {
        setParams([]);
        setPdfPageParams((prev) => {
          const newParams = { ...prev };
          delete newParams[page];
          return newParams;
        });
      } else {
        setParams([]);
      }
      renderParamsOnImage(page);
    }
  };

  const handleSelectTemplate = event => {
    const value = event.target.value;
    setSelectedTemplate(value);
  }

  // Render parameter table
  const renderParamsTable = () => {
    const isImageLoaded = imageSrc !== PLACEHOLDER_PATH && imageSrc !== window.location.href;
    const columns = [
      { name: 'ID', width: 100 },
      { name: 'Type', width: 100 },
      { name: 'Is\nMultiline', width: 100 },
      { name: 'Page', width: 100 },
      { name: 'X1, Y1', width: 100 },
      { name: 'X2, Y2', width: 100 },
      { name: 'Actions', width: 100 },
    ];

    return (
      <TableContainer component={Paper}>
        <Table sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.name} sx={{ width: col.width, textAlign: 'center', border: '1px solid black' }}>
                  {col.name.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < col.name.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {pdfDoc ?
              !Object.keys(pdfPageParams)?.length ?
                (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', fontStyle: 'italic', color: '#777', border: '1px solid black' }}>
                      No parameters defined for this page
                    </TableCell>
                  </TableRow>
                ) :
                (
                  Object.keys(pdfPageParams)
                    .sort((a, b) => Number(a) - Number(b))
                    .map((pageNum) => (
                      <React.Fragment key={pageNum}>
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            sx={{
                              backgroundColor: Number(pageNum) === page ? '#d9edf7' : '#f5f5f5',
                              fontWeight: 'bold',
                              textAlign: 'center',
                              border: '1px solid black',
                            }}
                          >
                            Page {pageNum} {Number(pageNum) === page ? '(Current)' : ''}
                          </TableCell>
                        </TableRow>
                        {console.log(pdfPageParams)}
                        {!pdfPageParams[pageNum]?.length ? (
                          <TableRow>
                            <TableCell colSpan={7} sx={{ textAlign: 'center', fontStyle: 'italic', color: '#777', border: '1px solid black' }}>
                              No parameters defined for this page
                            </TableCell>
                          </TableRow>
                        ) : (
                          pdfPageParams[pageNum].map((param, index) => (
                            <TableRow key={index} sx={{ opacity: Number(pageNum) === page ? 1 : 0.7 }}>
                              <TableCell sx={{ border: '1px solid black' }}>
                                <TextField
                                  value={param.id}
                                  onChange={(e) => {
                                    const newParams = [...pdfPageParams[pageNum]];
                                    newParams[index].id = e.target.value;
                                    setPdfPageParams((prev) => ({ ...prev, [pageNum]: newParams }));
                                    if (Number(pageNum) === page) {
                                      setParams(newParams);
                                      renderParamsOnImage(page);
                                    }
                                  }}
                                  disabled={Number(pageNum) !== page}
                                  fullWidth
                                />
                              </TableCell>
                              <TableCell sx={{ border: '1px solid black' }}>
                                <Select
                                  value={param.type}
                                  onChange={(e) => {
                                    const newParams = [...pdfPageParams[pageNum]];
                                    newParams[index].type = e.target.value;
                                    setPdfPageParams((prev) => ({ ...prev, [pageNum]: newParams }));
                                    if (Number(pageNum) === page) setParams(newParams);
                                  }}
                                  disabled={Number(pageNum) !== page}
                                  fullWidth
                                >
                                  {['string', 'date', 'number', 'currency'].map((type) => (
                                    <MenuItem key={type} value={type}>{type}</MenuItem>
                                  ))}
                                </Select>
                              </TableCell>
                              <TableCell sx={{ border: '1px solid black', textAlign: 'center' }}>
                                <Checkbox
                                  checked={param.isMultiline || false}
                                  onChange={(e) => {
                                    const newParams = [...pdfPageParams[pageNum]];
                                    newParams[index].isMultiline = e.target.checked;
                                    setPdfPageParams((prev) => ({ ...prev, [pageNum]: newParams }));
                                    if (Number(pageNum) === page) setParams(newParams);
                                  }}
                                  disabled={Number(pageNum) !== page}
                                />
                              </TableCell>
                              <TableCell sx={{ border: '1px solid black', textAlign: 'center', fontWeight: Number(pageNum) === page ? 'bold' : 'normal', color: Number(pageNum) === page ? '#007BFF' : 'inherit' }}>
                                {pageNum}
                              </TableCell>
                              <TableCell sx={{ border: '1px solid black' }}>{`(${param.x1}, ${param.y1})`}</TableCell>
                              <TableCell sx={{ border: '1px solid black' }}>{`(${param.x2}, ${param.y2})`}</TableCell>
                              <TableCell sx={{ border: '1px solid black' }}>
                                <Button
                                  variant="contained"
                                  color="primary"
                                  onClick={() => {
                                    if (Number(pageNum) !== page) {
                                      if (window.confirm(`Are you sure you want to delete parameter "${param.id}" from page ${pageNum}?`)) {
                                        setPdfPageParams((prev) => {
                                          const newParams = [...prev[pageNum]];
                                          newParams.splice(index, 1);
                                          return { ...prev, [pageNum]: newParams };
                                        });
                                      }
                                    } else {
                                      setParams((prev) => {
                                        const newParams = [...prev];
                                        newParams.splice(index, 1);
                                        setPdfPageParams((prevParams) => ({ ...prevParams, [page]: newParams }));
                                        return newParams;
                                      });
                                      renderParamsOnImage(page);
                                    }
                                  }}
                                >
                                  Delete
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </React.Fragment>
                    ))
                ) : (
                params.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', fontStyle: 'italic', color: '#777', border: '1px solid black' }}>
                      No parameters defined
                    </TableCell>
                  </TableRow>
                ) : (
                  params.map((param, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ border: '1px solid black' }}>
                        <TextField
                          value={param.id}
                          onChange={(e) => {
                            const newParams = [...params];
                            newParams[index].id = e.target.value;
                            setParams(newParams);
                            renderParamsOnImage(page);
                          }}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell sx={{ border: '1px solid black' }}>
                        <Select
                          value={param.type}
                          onChange={(e) => {
                            const newParams = [...params];
                            newParams[index].type = e.target.value;
                            setParams(newParams);
                          }}
                          fullWidth
                        >
                          {['string', 'date', 'number', 'currency'].map((type) => (
                            <MenuItem key={type} value={type}>{type}</MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell sx={{ border: '1px solid black', textAlign: 'center' }}>
                        <Checkbox
                          checked={param.isMultiline || false}
                          onChange={(e) => {
                            const newParams = [...params];
                            newParams[index].isMultiline = e.target.checked;
                            setParams(newParams);
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ border: '1px solid black', textAlign: 'center' }}>N/A</TableCell>
                      <TableCell sx={{ border: '1px solid black' }}>{`(${param.x1}, ${param.y1})`}</TableCell>
                      <TableCell sx={{ border: '1px solid black' }}>{`(${param.x2}, ${param.y2})`}</TableCell>
                      <TableCell sx={{ border: '1px solid black' }}>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => {
                            setParams((prev) => {
                              const newParams = [...prev];
                              newParams.splice(index, 1);
                              return newParams;
                            });
                            renderParamsOnImage(page);
                          }}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )
              )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', bgcolor: '#f8f9fa', p: 2, overflowY: 'auto', width: '100vw' }}>
      {/* Header Buttons */}
      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <Button variant="contained" color="primary" onClick={() => navigate('/invoice')}>
          Go to Invoice Page
        </Button>
        <Button variant="contained" color="primary" onClick={() => fileInputRef.current.click()}>
          Import Template Image
        </Button>
        <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageUpload} />
        <Button variant="contained" color="primary" onClick={() => pdfInputRef.current.click()}>
          Import PDF
        </Button>
        <input type="file" accept="application/pdf" ref={pdfInputRef} style={{ display: 'none' }} onChange={handlePdfUpload} />
        {
          templateOptionsList?.length &&
          <FormControl>
            <InputLabel id="templates-helper-label">Templates</InputLabel>
            <Select
              labelId="templates-helper-label"
              id="demo-simple-select-helper"
              // onClose={handleClose}
              // onOpen={handleOpen}
              value={selectedTemplate}
              onChange={handleSelectTemplate}
              label="Templates"
              style={{
                width: 200
              }}
            // onChange={handleChange}
            >
              {templateOptionsList.map(({ text, value }) => (
                <MenuItem key={text} value={value}>{text}</MenuItem>
              ))}
            </Select>
          </FormControl>
        }

        <Button
          variant="contained"
          color="primary"
          disabled={!imageSrc || imageSrc === PLACEHOLDER_PATH || (pdfDoc && Object.values(pdfPageParams).every((p) => p.length === 0)) || (!pdfDoc && params.length === 0)}
          onClick={() => saveTemplate(true)}
        >
          Upload Template
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={!imageSrc || imageSrc === PLACEHOLDER_PATH || (pdfDoc && Object.values(pdfPageParams).every((p) => p.length === 0)) || (!pdfDoc && params.length === 0)}
          onClick={saveTemplate}
        >
          Save Template
        </Button>
        <Button variant="contained" color="primary" onClick={() => jsonInputRef.current.click()}>
          Load Template
        </Button>
        <input type="file" accept=".json" ref={jsonInputRef} style={{ display: 'none' }} onChange={handleLoadTemplate} />
      </Box>

      {/* PDF Controls */}
      {pdfDoc && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Button variant="outlined" disabled={page <= 1 || loading.open} onClick={() => handlePageChange(page - 1)}>
            Previous Page
          </Button>
          <Typography>
            Page {page} of {totalPages}
          </Typography>
          <Button variant="outlined" disabled={page >= totalPages || loading.open} onClick={() => handlePageChange(page + 1)}>
            Next Page
          </Button>
        </Box>
      )}

      {/* Main Container */}
      <Box sx={{ display: 'flex', gap: 2, mt: 2, maxWidth: 1400, width: '100%' }}>
        {/* Image Section */}
        <Box
          ref={containerRef}
          sx={{ border: '2px solid orange', width: 800, height: 1131, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Template Image"
            style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', zIndex: 1 }}
            onDragStart={(e) => e.preventDefault()}
          />
          <div style={{ position: 'absolute', zIndex: 99 }} >
            <canvas ref={canvasRef} />
          </div>
        </Box>

        {/* Parameters Panel */}
        <Box sx={{ flex: 1, minWidth: 400, maxWidth: 600, border: '1px solid black', p: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Button
              variant="contained"
              color={isSelecting ? 'success' : 'primary'}
              disabled={imageSrc === PLACEHOLDER_PATH || imageSrc === window.location.href}
              onClick={startSelection}
            >
              Select Params
            </Button>
            <Button
              variant="contained"
              color="primary"
              disabled={(pdfDoc && !(pdfPageParams[page]?.length > 0)) || (!pdfDoc && params.length === 0)}
              onClick={clearAllParams}
            >
              {pdfDoc ? 'Clear Page Params' : 'Clear All Params'}
            </Button>
          </Box>
          {renderParamsTable()}
        </Box>
      </Box>

      {/* Loading Overlay */}
      {loading.open && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            bgcolor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <Box
            sx={{
              border: '16px solid #f3f3f3',
              borderTop: '16px solid #007BFF',
              borderRadius: '50%',
              width: 80,
              height: 80,
              animation: 'spin 2s linear infinite',
              mb: 2,
            }}
          />
          <Typography sx={{ color: 'white', fontSize: '18px', mb: 1 }}>{loading.text}</Typography>
          <Box sx={{ width: 300, bgcolor: '#f3f3f3', borderRadius: '5px' }}>
            <Box sx={{ width: `${loading.progress}%`, height: 20, bgcolor: '#007BFF', borderRadius: '5px', transition: 'width 0.3s' }} />
          </Box>
        </Box>
      )}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
}

export default TemplateEditor;