import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Button, Typography, TextField, Select, MenuItem, FormControl, InputLabel, Paper, Table, TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
} from '@mui/material';
import * as pdfjs from 'pdfjs-dist';
import * as fabric from 'fabric';
import { useTenantApiStore } from '../store/apiStore';
import { useNavigate } from 'react-router-dom';
import LoadingOverlay from '../components/LoadingOverlay';
import SelectDropdown from '../components/SelectDropdown';
import ParametersTable from '../components/ParametersTable';
import PdfViewer from '../components/PdfViewer';
import { usePdfHandler } from '../hooks/usePdfHandler';
import { useCanvas } from '../hooks/useCanvas';

function InvoiceSelection() {
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
    uploadDocumentToFile,
    exportFileByID,
    getTemplateForTenantByTemplateID,
    getFileForTenantByFileID,
    getDocumentForTenantByFileID,
    getFormForTenantByTemplateID,
    createTemplate,
    uploadFormByTemplateID,
    clearNewTemplate,
    createNewFile,
    xmlFile,
  } = useTenantApiStore();
  const [loading, setLoading] = useState({ open: false, text: '', progress: 0 });
  const [imageSrc, setImageSrc] = useState('./placeholder.png');
  const [originalImageFilename, setOriginalImageFilename] = useState('template.png');
  const [invoiceType, setInvoiceType] = useState('');
  const [status, setStatus] = useState('');
  const [templateOptionsList, setTemplateOptionsList] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formsOptionsList, setFormsOptionsList] = useState([]);
  const [selectForms, setSelectForms] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [filesOptionsList, setFilesOptionsList] = useState([]);
  const [pdfPageParams, setPdfPageParams] = useState({});
  const [allForms, setAllForms] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [newFormFile, setNewFormFile] = useState(null);
  const [page, setPage] = useState(1);
  const [isSelecting, setIsSelecting] = useState(false);
  const [params, setParams] = useState([]);
  const [pdfOriginalFilename, setPdfOriginalFilename] = useState('');
  const [newFile, setNewFile] = useState({
    name: '',
    userId: 1,
    templateId: null
  });

  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const jsonInputRef = useRef(null);


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

    return () => {

      fabricCanvasRef.current.dispose();
    };
  }, [isSelecting, pdfDoc, page]);

  // Resize canvas to match image dimensions and position
  useEffect(() => {
    const resizeCanvas = () => {
      if (imageRef.current && fabricCanvasRef.current) {
        const img = imageRef.current;
        const container = containerRef.current;
        if (!container) return;

        const rect = img.getBoundingClientRect();

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

  useEffect(() => {
    if (loadValue) {
      setLoading({ open: true, text: 'Pending...', progress: 0 });
    } else {
      setLoading({ open: false, text: '', progress: 0 });
    }
  }, [loadValue]);

  useEffect(() => {
    if (selectForms && allForms) {
      const formSelected = allForms.find(form => form.id === selectForms);
      if (formSelected) {
        setPdfOriginalFilename(formSelected.template.source.filename);
        setTotalPages(formSelected.template.source.totalPages || 1);
        setPage(formSelected.template.source.allPages[0] || 1);
        setPdfDoc({
          numPages: formSelected.template.source.totalPages || 1,
          getPage: (pageNum) => Promise.resolve({
            getViewport: () => ({
              width: formSelected.template.data.find((d) => d.page === pageNum)?.size?.width || 800,
              height: formSelected.template.data.find((d) => d.page === pageNum)?.size?.height || 1131,
            }),
          }),
        });
        const pageImages = {};
        formSelected.template.data.forEach((pageData) => {
          const imgSrc = pageData.binary.startsWith('data:') ? pageData.binary : `data:${pageData.type || 'image/png'};base64,${pageData.binary}`;
          pageImages[pageData.page] = imgSrc;
        });
        window.pageImages = pageImages;
        setImageSrc(pageImages[page]);
        setPdfPageParams(
          Object.fromEntries(
            Object.entries(formSelected.allPageParams || {}).map(([pageNum, pageParams]) => [
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
        setParams([...(formSelected.allPageParams[page] || [])]);

      }
    }
  }, [selectForms, allForms]);

  useEffect(() => {
    getAllTemplatesForTenant(1);
    getAllFilesForTenant(1);
  }, []);

  useEffect(() => {
    if (selectedFiles) getDocumentForTenantByFileID(1, selectedFiles);
  }, [selectedFiles]);

  useEffect(() => {
    if (xmlFile) {
      const xmlBlob = new Blob([xmlFile], { type: 'application/xml' });
      const url = window.URL.createObjectURL(xmlBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'response.xml'; // Customize the filename as needed
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  }, [xmlFile])

  useEffect(() => {
    if (forms?.length) {
      const returnOptionsList = forms.map(obj => {
        const { id, description } = obj;
        return {
          text: description,
          value: id
        }
      })
      setFormsOptionsList([...returnOptionsList]);
      setAllForms(forms);
    }
  }, [forms]);

  useEffect(() => {
    if (files?.length) {
      const returnOptionsList = files.map(obj => {
        const { id, name, template_id, user_id } = obj;
        return {
          text: name,
          value: id,
          templateId: template_id,
          userId: user_id
        }
      })
      setFilesOptionsList([...returnOptionsList]);
    }
  }, [files]);

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

  useEffect(() => {
    if (selectedTemplate) {
      getFormForTenantByTemplateID(1, selectedTemplate);
      setNewFile(prevState => {
        return {
          ...prevState,
          templateId: selectedTemplate
        }
      })
    }
  }, [selectedTemplate]);

  const handleSelectTemplate = event => {
    const value = event.target.value;
    setSelectedTemplate(value);
  };

  const handleSelectForm = event => {
    const value = event.target.value;
    setSelectForms(value);
  }

  const handleSelectFile = event => {
    const value = event.target.value;
    setSelectedFiles(value);
  }

  const handleChangeFileName = event => {
    const value = event.target.value;
    setNewFile(prevState => {
      return {
        ...prevState,
        name: value
      }
    });
  }

  // Save current page params
  const saveCurrentPageParams = () => {
    if (pdfDoc && params.length > 0) {
      setPdfPageParams((prev) => ({ ...prev, [page]: [...params] }));
    }
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

  // Load page params
  const loadPageParams = (pageNum) => {
    setParams(pdfPageParams[pageNum] || []);
    renderParamsOnImage(pageNum);
  };

  // Handle parameter selection
  const startSelection = () => {
    setIsSelecting(true);
    fabricCanvasRef.current.setCursor('crosshair');
    canvasRef.current.style.cursor = 'crosshair';
    canvasRef.current.style.pointerEvents = 'auto';
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

  const handlePdfUpload = async (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      try {
        // Read PDF file as ArrayBuffer
        const arrayBuffer = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (error) => reject(error);
          reader.readAsArrayBuffer(file);
        });

        // Load PDF document
        const loadPromise = pdfjs.getDocument({ data: arrayBuffer }).promise;
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('PDF loading timed out')), 30000)
        );
        const pdf = await Promise.race([loadPromise, timeoutPromise]);

        const totalPages = pdf.numPages;
        const formData = new FormData(); // Create FormData object

        // Append page_count to FormData
        formData.append('page_count', String(totalPages));
        const pagesArray = [];

        // Iterate through each page
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          // Get the page
          const page = await pdf.getPage(pageNum);

          // Set up canvas
          const viewport = page.getViewport({ scale: 1.0 }); // Adjust scale for resolution
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          // Render page to canvas
          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

          // Convert canvas to PNG data URL
          const pngDataUrl = canvas.toDataURL('image/png');

          // Convert data URL to Blob
          const blob = await (await fetch(pngDataUrl)).blob();

          // Create a File object from the Blob
          const pngFile = new File([blob], `page-${pageNum}.png`, { type: 'image/png' });
          pagesArray.push(pngFile);
          // Append the File to FormData with integer key (e.g., '1', '2')
          formData.append(`${pageNum}`, pngFile, `page-${pageNum}.png`);
        }

        // Debug: Log FormData contents
        console.log('FormData before upload:', pagesArray);
        console.log('FormData entries:');
        let hasEntries = false;
        for (const [key, value] of formData.entries()) {
          console.log(key, value);
          hasEntries = true;
        }

        if (hasEntries) {
          // Pass defined fileID and formID (replace with actual values if available)
          await uploadDocumentToFile(formData, 1, selectedFiles, selectForms);
          await getAllFilesForTenant(1);
        } else {
          throw new Error('FormData is empty');
        }

      } catch (error) {
        console.error('Error loading PDF:', error);
        alert('Failed to load PDF: ' + error.message);
        // setLoading({ open: false, text: '', progress: 0 });
      }
    }
  };

  // Render parameter table
  const renderParamsTable = () => {
    const isImageLoaded = imageSrc !== './placeholder.png' && imageSrc !== window.location.href;
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

  const ExportFile = () => {
    exportFileByID(1, selectedFiles);
  }

  const CreateNewFile = () => {
    const formFile = {
      name: newFile.name,
      template_id: newFile.templateId,
      user_id: newFile.userId
    }
    createNewFile(formFile, 1);
  }

  return (
    <Box className="min-h-screen bg-gray-100 p-6 w-screen">
      <Box className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <Typography variant="h4" className="text-2xl font-bold text-gray-800 mb-6">
          Invoice Details
        </Typography>
        <Box className="flex flex-row justify-normal">
          <Box className='mr-5'>
            <Button variant="contained" color="primary" onClick={() => navigate('/editor')}>
              Go to Upload Form
            </Button>
          </Box>
          <Box>
            <Button variant="contained" color="primary" onClick={CreateNewFile} disabled={newFile?.name?.length && selectedTemplate ? false : true}>
              Create new File
            </Button>
          </Box>

        </Box>
        <Box className="space-y-4 my-4">
          <TextField label="File Name" fullWidth className="w-full my-4" onChange={handleChangeFileName} />
        </Box>
        <Box className="space-y-4 my-4 flex flex-row justify-normal">
          {
            templateOptionsList?.length &&
            <Box className='mr-5'>
              <FormControl >
                <InputLabel id="templates-helper-label">Templates</InputLabel>
                <Select
                  labelId="templates-helper-label"
                  id="demo-simple-select-helper"
                  // onClose={handleClose}
                  // onOpen={handleOpen}
                  value={selectedTemplate || ''}
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
            </Box>

          }

          {
            filesOptionsList?.length &&
            <Box className='mr-5'>
              <FormControl >
                <InputLabel id="templates-helper-label">Files</InputLabel>
                <Select
                  labelId="templates-helper-label"
                  id="demo-simple-select-helper"
                  // onClose={handleClose}
                  // onOpen={handleOpen}
                  value={selectedFiles}
                  onChange={handleSelectFile}
                  label="File"
                  style={{
                    width: 200
                  }}
                // onChange={handleChange}
                >
                  {filesOptionsList.map(({ text, value }) => (
                    <MenuItem key={value} value={value}>{text}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

          }

          {
            formsOptionsList?.length ?
              <Box className='mr-5'>
                <FormControl >
                  <InputLabel id="templates-helper-label">Forms</InputLabel>
                  <Select
                    labelId="templates-helper-label"
                    id="demo-simple-select-helper"
                    // onClose={handleClose}
                    // onOpen={handleOpen}
                    value={selectForms}
                    onChange={handleSelectForm}
                    label="Templates"
                    style={{
                      width: 200
                    }}
                  >
                    {formsOptionsList.map(({ text, value }) => (
                      <MenuItem key={`${text}_${value}`} value={value}>{text}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              : null
          }

          {/* <Box>
        <Button variant="contained" color="primary" onClick={() => pdfInputRef.current.click()}>
          Import PDF
        </Button>
        <input type="file" accept="application/pdf" ref={pdfInputRef} style={{ display: 'none' }} onChange={handlePdfUpload} />
          </Box> */}

        </Box >
        <Box className="flex flex-row justify-normal">
          {
            selectForms && selectedFiles ? <Box className="mr-5">
              <Button variant="contained" color="primary" onClick={() => pdfInputRef.current.click()}>
                Import PDF
              </Button>
              <input type="file" accept="application/pdf" ref={pdfInputRef} style={{ display: 'none' }} onChange={handlePdfUpload} />

            </Box> : null
          }
          {
            selectedFiles && <Button variant="contained" color="secondary" onClick={ExportFile}>
              Export PDF
            </Button>
          }
        </Box>

      </Box>

      {
        selectForms && <Box>
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
                  disabled={imageSrc === './placeholder.png' || imageSrc === window.location.href}
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
        </Box>
      }



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
      <style >{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
}

export default InvoiceSelection;