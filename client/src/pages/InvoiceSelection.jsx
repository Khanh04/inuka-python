import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box, Button, Typography, TextField, Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import * as pdfjs from 'pdfjs-dist';
import * as fabric from 'fabric';
import { useTenantApiStore } from '../store/apiStore';
import { useNavigate } from 'react-router-dom';

function InvoiceSelection() {
  const navigate = useNavigate();
  const {
    templates,
    forms,
    files,
    loading: loadValue,
    getAllTemplatesForTenant,
    getAllFilesForTenant,
    uploadDocumentToFile,
    exportFileByID,
    getDocumentForTenantByFileID,
    getFormForTenantByTemplateID,
    createNewFile,
    xmlFile,
  } = useTenantApiStore();

  const [loading, setLoading] = useState({ open: false, text: '', progress: 0 });
  const [imageSrc, setImageSrc] = useState('./placeholder.png');
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
  const [page, setPage] = useState(1);
  const [params, setParams] = useState([]);
  const [newFile, setNewFile] = useState({
    name: '',
    userId: 1,
    templateId: null
  });
  const [createFileDialogOpen, setCreateFileDialogOpen] = useState(false);

  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const pdfInputRef = useRef(null);

  const renderParamsOnImage = useCallback((pageNum) => {
    const currentParams = pdfDoc ? (pdfPageParams[pageNum] || []) : params;
    for (const param of currentParams) {
      const x1 = Number.parseFloat(param.x1);
      const y1 = Number.parseFloat(param.y1);
      const x2 = Number.parseFloat(param.x2);
      const y2 = Number.parseFloat(param.y2);
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

    }
    fabricCanvasRef.current.requestRenderAll();
  }, [pdfDoc, pdfPageParams, params, fabricCanvasRef]);

  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.54/pdf.worker.min.mjs';
  }, []);

  useEffect(() => {
    if (fabricCanvasRef?.current && pdfDoc) {
      renderParamsOnImage(page);
    }
  }, [params, pdfPageParams, page, pdfDoc, renderParamsOnImage]);

  useEffect(() => {
    fabricCanvasRef.current = new fabric.Canvas(canvasRef.current, {
      interactive: true,
    });

    return () => {

      fabricCanvasRef.current.dispose();
    };
  }, [pdfDoc, page]);

  useEffect(() => {
    const resizeCanvas = () => {
      if (imageRef.current && fabricCanvasRef.current) {
        const img = imageRef.current;
        const container = containerRef.current;
        if (!container) return;

        const rect = img.getBoundingClientRect();

        canvasRef.current.style.position = 'absolute';
        canvasRef.current.style.width = `${rect.width}px`;
        canvasRef.current.style.height = `${rect.height}px`;
        canvasRef.current.style.zIndex = 99;

        fabricCanvasRef.current.setDimensions({
          width: rect.width,
          height: rect.height,
        });

        renderParamsOnImage(page);
      }
    };

    const img = imageRef.current;
    if (img) {
      img.addEventListener('load', resizeCanvas);
      if (img.complete) {
        resizeCanvas();
      }
    }

    globalThis.addEventListener('resize', resizeCanvas);

    return () => {
      if (img) {
        img.removeEventListener('load', resizeCanvas);
      }
      globalThis.removeEventListener('resize', resizeCanvas);
    };
  }, [imageSrc, page, renderParamsOnImage]);

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
        setTotalPages(formSelected.template.source.totalPages || 1);
        setPage(formSelected.template.source.allPages[0] || 1);
        setPdfDoc({
          numPages: formSelected.template.source.totalPages || 1,
          getPage: (pageNum) => Promise.resolve({
            getViewport: () => {
              const pageData = formSelected.template.data.find((d) => d.page === pageNum);
              return {
                width: pageData?.size?.width || 800,
                height: pageData?.size?.height || 1131,
              };
            },
          }),
        });
        const pageImages = {};
        for (const pageData of formSelected.template.data) {
          const imgSrc = pageData.binary.startsWith('data:') ? pageData.binary : `data:${pageData.type || 'image/png'};base64,${pageData.binary}`;
          pageImages[pageData.page] = imgSrc;
        }
        globalThis.pageImages = pageImages;
        setImageSrc(pageImages[page]);
        setPdfPageParams(
          Object.fromEntries(
            Object.entries(formSelected.allPageParams || {}).map(([pageNum, pageParams]) => [
              pageNum,
              pageParams.map((param) => ({
                id: param.id || `Param ${Math.random().toString(36).substring(2, 9)}`,
                type: param.type || 'string',
                x1: Number.parseFloat(param.x1 || 0).toFixed(2),
                y1: Number.parseFloat(param.y1 || 0).toFixed(2),
                x2: Number.parseFloat(param.x2 || 0).toFixed(2),
                y2: Number.parseFloat(param.y2 || 0).toFixed(2),
                isMultiline: Boolean(param.isMultiline),
                page: Number(pageNum),
              })),
            ])
          )
        );
        setParams([...(formSelected.allPageParams[page] || [])]);

      }
    }
  }, [selectForms, allForms, page]);

  useEffect(() => {
    getAllTemplatesForTenant(1);
    getAllFilesForTenant(1);
  }, [getAllTemplatesForTenant, getAllFilesForTenant]);

  useEffect(() => {
    if (selectedFiles) getDocumentForTenantByFileID(1, selectedFiles);
  }, [selectedFiles, getDocumentForTenantByFileID]);

  useEffect(() => {
    if (xmlFile) {
      const xmlBlob = new Blob([xmlFile], { type: 'application/xml' });
      const url = globalThis.URL.createObjectURL(xmlBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'response.xml'; // Customize the filename as needed
      document.body.appendChild(link);
      link.click();
      link.remove();
      globalThis.URL.revokeObjectURL(url);
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
  }, [selectedTemplate, getFormForTenantByTemplateID]);

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

  const saveCurrentPageParams = () => {
    if (pdfDoc && params.length > 0) {
      setPdfPageParams((prev) => ({ ...prev, [page]: [...params] }));
    }
  };

  const loadPageParams = (pageNum) => {
    setParams(pdfPageParams[pageNum] || []);
    renderParamsOnImage(pageNum);
  };

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

  const renderPage = async (pageNumber, pdf = null) => {
    const renderPdf = pdfDoc || pdf;
    if (globalThis.pageImages?.[pageNumber]) {
      setImageSrc(globalThis.pageImages[pageNumber]);
      renderParamsOnImage(pageNumber);
      return;
    }
    if (renderPdf) {
      try {
        const page = await Promise.race([
          renderPdf.getPage(pageNumber),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Page loading timed out')), 10000)),
        ]);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        const dataUrl = canvas.toDataURL('image/png');
        setImageSrc(dataUrl);
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
    if (file && file?.type === 'application/pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer();

        const loadPromise = pdfjs.getDocument({ data: arrayBuffer }).promise;
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('PDF loading timed out')), 30000)
        );
        const pdf = await Promise.race([loadPromise, timeoutPromise]);

        const totalPages = pdf.numPages;
        const formData = new FormData();
        formData.append('page_count', String(totalPages));
        const pagesArray = [];

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const page = await pdf.getPage(pageNum);

          const viewport = page.getViewport({ scale: 1 }); 
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

          const pngDataUrl = canvas.toDataURL('image/png');

          const blob = await (await fetch(pngDataUrl)).blob();

          const pngFile = new File([blob], `page-${pageNum}.png`, { type: 'image/png' });
          pagesArray.push(pngFile);
          formData.append(`${pageNum}`, pngFile, `page-${pageNum}.png`);
        }

        console.log('FormData before upload:', pagesArray);
        console.log('FormData entries:');
        let hasEntries = false;
        for (const [key, value] of formData.entries()) {
          console.log(key, value);
          hasEntries = true;
        }

        if (hasEntries) {
          await uploadDocumentToFile(formData, 1, selectedFiles, selectForms);
          await getAllFilesForTenant(1);
        } else {
          throw new Error('FormData is empty');
        }

      } catch (error) {
        console.error('Error loading PDF:', error);
        alert('Failed to load PDF: ' + error.message);
      }
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
            <Button variant="contained" color="primary" onClick={() => setCreateFileDialogOpen(true)}>
              Create new File
            </Button>
          </Box>

        </Box>
        <Box className="flex flex-row justify-normal">
          {
            Boolean(templateOptionsList?.length) &&
            <Box className='mr-5'>
              <FormControl >
                <InputLabel id="templates-helper-label">Templates</InputLabel>
                <Select
                  labelId="templates-helper-label"
                  id="demo-simple-select-helper"
                  value={selectedTemplate || ''}
                  onChange={handleSelectTemplate}
                  label="Templates"
                  style={{
                    width: 200
                  }}
                >
                  {templateOptionsList.map(({ text, value }) => (
                    <MenuItem key={text} value={value}>{text}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

          }

          {
            Boolean(filesOptionsList?.length) &&
            <Box className='mr-5'>
              <FormControl >
                <InputLabel id="templates-helper-label">Files</InputLabel>
                <Select
                  labelId="templates-helper-label"
                  id="demo-simple-select-helper"
                  value={selectedFiles}
                  onChange={handleSelectFile}
                  label="File"
                  style={{
                    width: 200
                  }}
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
                alt="Template"
                style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', zIndex: 1 }}
                onDragStart={(e) => e.preventDefault()}
              />
              <div style={{ position: 'absolute', zIndex: 99 }} >
                <canvas ref={canvasRef} />
              </div>
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

      <Dialog 
        open={createFileDialogOpen} 
        onClose={() => setCreateFileDialogOpen(false)}
        sx={{
          '& .MuiDialog-paper': {
            minWidth: 400,
            minHeight: 300,
            borderRadius: 2,
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>Create New File</DialogTitle>
        <DialogContent sx={{ px: 3, pb: 2 }}>
          <TextField
            label="File Name"
            fullWidth
            onChange={handleChangeFileName}
            value={newFile.name}
            sx={{ mt: 1, mb: 2 }}
          />
          {Boolean(templateOptionsList?.length) && (
            <FormControl fullWidth sx={{ mt: 1 }}>
              <InputLabel id="templates-dialog-label">Templates</InputLabel>
              <Select
                labelId="templates-dialog-label"
                id="demo-simple-select-dialog"
                value={selectedTemplate || ''}
                onChange={handleSelectTemplate}
                label="Templates"
              >
                {templateOptionsList.map(({ text, value }) => (
                  <MenuItem key={text} value={value}>{text}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 0 }}>
          <Button onClick={() => setCreateFileDialogOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={() => {
              CreateNewFile();
              setCreateFileDialogOpen(false);
            }}
            disabled={!newFile?.name?.length || !selectedTemplate}
            variant="contained"
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default InvoiceSelection;