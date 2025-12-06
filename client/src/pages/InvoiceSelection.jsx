import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Button, Typography, TextField, Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import * as pdfjs from 'pdfjs-dist';
import { useTenantApiStore } from '../store/apiStore';
import { useNavigate } from 'react-router-dom';
import PdfViewer from '../components/PdfViewer';
import SectionCanvas from '../components/SectionCanvas';

function InvoiceSelection() {
  const navigate = useNavigate();
  const {
    templates,
    forms,
    files,
    loading: loadValue,
    getAllTemplatesForTenant,
    getAllFilesForTenant,
    exportFileByID,
    getDocumentForTenantByFileID,
    getFormForTenantByTemplateID,
    uploadDocumentToFile,
    createNewFile,
    xmlFile,
  } = useTenantApiStore();

  const [loading, setLoading] = useState({ open: false, text: '', progress: 0 });
  const [templateOptionsList, setTemplateOptionsList] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [filesOptionsList, setFilesOptionsList] = useState([]);
  const [formViewers, setFormViewers] = useState([]);
  const [newFile, setNewFile] = useState({
    name: '',
    userId: 1,
    templateId: null
  });
  const [createFileDialogOpen, setCreateFileDialogOpen] = useState(false);

  const canvasHandlersRef = useRef({});
  const pdfInputRef = useRef(null);

  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.54/pdf.worker.min.mjs';
  }, []);

  useEffect(() => {
    if (loadValue) {
      setLoading({ open: true, text: 'Pending...', progress: 0 });
    } else {
      setLoading({ open: false, text: '', progress: 0 });
    }
  }, [loadValue]);

  useEffect(() => {
    getAllTemplatesForTenant();
    getAllFilesForTenant();
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
      const viewers = forms.map(form => {
        const viewer = {
          id: form.id,
          name: form.name,
          description: form.description,
          pdfDoc: null,
          page: 1,
          totalPages: 1,
          imageSrc: './placeholder.png',
          pdfPageParams: {},
          params: [],
          isSelecting: false,
          pageImages: {}
        };
        if (form.template.source) {
          viewer.totalPages = form.template.data.length || 1;
          viewer.page = form.template.source.allPages[0] || 1;
          viewer.pdfDoc = {
            numPages: form.template.data.length || 1,
            getPage: (pageNum) => Promise.resolve({
              getViewport: () => {
                const pageData = form.template.data.find((d) => d.page === pageNum);
                return {
                  width: (pageData?.size?.width || 800) / 1.5,
                  height: (pageData?.size?.height || 1131) / 1.5,
                };
              },
            }),
          };
          const pageImages = {};
          for (const pageData of form.template.data) {
            const imgSrc = pageData.binary.startsWith('data:') ? pageData.binary : `data:${pageData.type || 'image/png'};base64,${pageData.binary}`;
            pageImages[pageData.page] = imgSrc;
          }
          viewer.pageImages = pageImages;
          viewer.imageSrc = viewer.pageImages[viewer.page];
          viewer.pdfPageParams = Object.fromEntries(
            Object.entries(form.allPageParams || {}).map(([pageNum, pageParams]) => [
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
          );
          viewer.params = [...(form.allPageParams[viewer.page] || [])];
        }
        return viewer;
      });
      setFormViewers(viewers);
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
      getFormForTenantByTemplateID(selectedTemplate);
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

  const handlePdfUpload = async (event, selectForms) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
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

        const totalPages = pdf.numPages;
        const formData = new FormData(); 

        formData.append('page_count', String(totalPages));
        const pagesArray = [];

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const page = await pdf.getPage(pageNum);

          const viewport = page.getViewport({ scale: 1.0 });
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
          await uploadDocumentToFile(formData, selectedFiles, selectForms);
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
    getAllFilesForTenant();
  }

  const handleCanvasHandlerReady = (sectionId) => (handler) => {
    canvasHandlersRef.current[sectionId] = handler;
  };

  return (
    <Box className="min-h-screen bg-gray-100 p-6 w-screen">
      <Box className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <Typography variant="h4" className="text-2xl font-bold text-gray-800 mb-6">
          Invoice Details
        </Typography>
        <Box className="flex flex-row justify-normal mb-6">
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
        <Box className="flex flex-row justify-normal mb-6">
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

        </Box >
        <Box className="flex flex-row justify-normal mb-6">
          {
            selectedFiles && <Button variant="contained" color="secondary" onClick={ExportFile}>
              Export XML
            </Button>
          }
        </Box>

        {formViewers.map((viewer) => (
          <Box key={viewer.id} sx={{ width: '100%', mb: 4, position: 'relative' }} >

            <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
              <Typography variant="h6">{viewer.name}</Typography>
              <Button variant="outlined" size="small" onClick={() => pdfInputRef.current.click()}>
                Import PDF
              </Button>
              <input type="file" accept="application/pdf" ref={pdfInputRef} style={{ display: 'none' }} onChange={(e) => handlePdfUpload(e, viewer.id)} />

            </Box>
            <Box sx={{ display: 'flex', gap: 2, maxWidth: 1400, width: '100%', position: 'relative' }} data-section={viewer.id}>
              <PdfViewer
                imageSrc={viewer.imageSrc}
                pdfDoc={viewer.pdfDoc}
                page={viewer.page}
                totalPages={viewer.totalPages}
                onPageChange={async (newPage) => {
                  if (newPage >= 1 && newPage <= viewer.totalPages) {
                    const imageSrc = viewer.pageImages[newPage] || viewer.imageSrc;
                    const params = [...(viewer.pdfPageParams[newPage] || [])];
                    const updatedViewer = {
                      ...viewer,
                      page: newPage,
                      imageSrc,
                      params
                    };
                    setFormViewers(prev => prev.map(v => v.id === viewer.id ? updatedViewer : v));
                    
                    setTimeout(() => {
                      const handler = canvasHandlersRef.current[viewer.id];
                      if (handler) {
                        handler.setParams(params);
                        handler.renderParamsOnImage(params);
                        
                        const sectionContainer = document.querySelector(`[data-section="${viewer.id}"]`);
                        const sectionImg = sectionContainer?.querySelector('img');
                        
                        if (sectionImg && sectionImg.complete && sectionImg.naturalWidth > 0 && handler.handleCanvasReady && handler.isCanvasReady && handler.fabricCanvasRef?.current) {
                          const imgRect = sectionImg.getBoundingClientRect();
                          const sectionRect = sectionContainer.getBoundingClientRect();
                          
                          const viewportRect = {
                            left: imgRect.left - sectionRect.left,
                            top: imgRect.top - sectionRect.top,
                            width: imgRect.width,
                            height: imgRect.height,
                          };
                          handler.handleCanvasReady(viewportRect);
                        }
                      }
                    }, 100);
                  }
                }}
                loading={false}
                onCanvasReady={(viewportRect) => {
                  const attemptPosition = (attempts = 0) => {
                    const currentHandler = canvasHandlersRef.current[viewer.id];
                    
                    if (currentHandler && currentHandler.handleCanvasReady && currentHandler.isCanvasReadyRef?.current && currentHandler.fabricCanvasRef?.current) {
                      console.log(`PdfViewer onCanvasReady positioning section ${viewer.id} (attempt ${attempts + 1})`);
                      currentHandler.handleCanvasReady(viewportRect);
                    } else if (attempts < 30) {
                      console.log(`PdfViewer onCanvasReady waiting for handler section ${viewer.id} (attempt ${attempts + 1}):`, {
                        hasHandler: !!currentHandler,
                        hasHandleCanvasReady: !!currentHandler?.handleCanvasReady,
                        isCanvasReady: currentHandler?.isCanvasReadyRef?.current,
                        hasFabricCanvas: !!currentHandler?.fabricCanvasRef?.current
                      });
                      setTimeout(() => attemptPosition(attempts + 1), 100);
                    } else {
                      console.error(`PdfViewer onCanvasReady gave up for section ${viewer.id} after ${attempts} attempts`);
                    }
                  };
                  
                  attemptPosition();
                }}
              />
              <SectionCanvas
                section={viewer}
                isSelecting
                onParamSelected={() => { }}
                onCanvasHandlerReady={handleCanvasHandlerReady(viewer.id)}
                onlyView
              />
            </Box>

          </Box>
        ))}

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