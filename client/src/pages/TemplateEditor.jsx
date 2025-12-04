import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTenantApiStore } from '../store/apiStore';
import LoadingOverlay from '../components/LoadingOverlay';
import SelectDropdown from '../components/SelectDropdown';
import ParametersTable from '../components/ParametersTable';
import PdfViewer from '../components/PdfViewer';
import SectionCanvas from '../components/SectionCanvas';
import * as pdfjsLib from 'pdfjs-dist';

if (typeof globalThis.window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.54/pdf.worker.min.mjs';
}

function TemplateEditor() {
  const navigate = useNavigate();
  const {
    templates,
    getAllTemplatesForTenant,
    getFormForTenantByTemplateID,
    uploadFormByTemplateID,
    createTemplate
  } = useTenantApiStore();

  const PLACEHOLDER_PATH = `${import.meta.env.BASE_URL}placeholder.png`;

  const [templateOptionsList, setTemplateOptionsList] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState({ open: false, text: '', progress: 0 });
  const [createTemplateDialogOpen, setCreateTemplateDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: ''
  });
  const [sections, setSections] = useState([{
    id: 1,
    name: 'Section 1',
    imageSrc: PLACEHOLDER_PATH,
    pdfDoc: null,
    page: 1,
    totalPages: 1,
    pdfPageParams: {},
    params: [],
    isSelecting: false 
  }]); 

  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const jsonInputRef = useRef(null);

  const canvasHandlersRef = useRef({});

  useEffect(() => {
    getAllTemplatesForTenant();
  }, [getAllTemplatesForTenant]);

  const toggleSelection = (sectionId) => {
    setSections(prev => prev.map(s => 
      s.id === sectionId 
        ? { ...s, isSelecting: !s.isSelecting }
        : { ...s, isSelecting: false } 
    ));
  };

  const handleParamSelected = (sectionId) => (newParam) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    if (section.pdfDoc) {
      setSections(prev => prev.map(s =>
        s.id === sectionId
          ? {
              ...s,
              pdfPageParams: {
                ...s.pdfPageParams,
                [s.page]: [...(s.pdfPageParams[s.page] || []), newParam]
              }
            }
          : s
      ));
    } else {
      setSections(prev => prev.map(s =>
        s.id === sectionId
          ? { ...s, params: [...s.params, newParam] }
          : s
      ));
    }
  };

  const handleCanvasHandlerReady = (sectionId) => (handler) => {
    canvasHandlersRef.current[sectionId] = handler;
  };

  const handleSelectTemplate = event => {
    const value = event.target.value;
    setSelectedTemplate(value);
  };

  const handleTemplateNameChange = (event) => {
    const value = event.target.value;
    setNewTemplate(prev => ({
      ...prev,
      name: value
    }));
  };

  const handleTemplateDescriptionChange = (event) => {
    const value = event.target.value;
    setNewTemplate(prev => ({
      ...prev,
      description: value
    }));
  };

  const handleCreateTemplate = async () => {
    const templateData = {
      name: newTemplate.name,
      description: newTemplate.description
    };
    await createTemplate(templateData);
    getAllTemplatesForTenant();
    setNewTemplate({ name: '', description: '' });
    setCreateTemplateDialogOpen(false);
  };

  const addNewSection = () => {
    const newSectionId = Math.max(...sections.map(s => s.id)) + 1;
    const newSection = {
      id: newSectionId,
      name: `Section ${newSectionId}`,
      imageSrc: PLACEHOLDER_PATH,
      pdfDoc: null,
      page: 1,
      totalPages: 1,
      pdfPageParams: {},
      params: [],
      isSelecting: false
    };
    setSections(prev => [...prev, newSection]);
  };

  const removeSection = (sectionId) => {
    if (sections.length > 1) {
      setSections(prev => prev.filter(s => s.id !== sectionId));
    }
  };

  const updateSectionName = (sectionId, newName) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId ? { ...section, name: newName } : section
    ));
  };

  const renderPdfPage = async (pdfDoc, pageNum) => {
    if (!pdfDoc || typeof document === 'undefined') return null;
    
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error rendering PDF page:', error);
      return null;
    }
  };

  useEffect(() => {
    if (selectedTemplate) {
      getFormForTenantByTemplateID(1, selectedTemplate);
    }
  }, [selectedTemplate, getFormForTenantByTemplateID]);

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

  const handleImageUpload = (event, sectionId) => {
    const file = event.target.files[0];
    if (file?.type?.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSections(prev => prev.map(section =>
          section.id === sectionId
            ? { ...section, imageSrc: e.target.result, pdfDoc: null, page: 1, totalPages: 1, pdfPageParams: {}, params: [], canvasHandler: null }
            : section
        ));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePdfUpload = async (event, sectionId) => {
    const file = event.target.files[0];
    if (file?.type === 'application/pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        const imageSrc = canvas.toDataURL('image/png');
        
        setSections(prev => prev.map(section =>
          section.id === sectionId
            ? { 
                ...section, 
                imageSrc, 
                pdfDoc: pdf, 
                page: 1, 
                totalPages: pdf.numPages, 
                pdfPageParams: {}, 
                params: [],
                canvasHandler: null
              }
            : section
        ));
      } catch (error) {
        console.error('Error loading PDF:', error);
        alert('Error loading PDF file');
      }
    }
  };

  const saveTemplate = async (isUpload, section = null) => {
    if (!section) return;
    
    if (section.imageSrc === PLACEHOLDER_PATH || section.imageSrc === globalThis.location.href) {
      alert('Please import a template image or PDF first.');
      return;
    }
    if ((section.pdfDoc && Object.values(section.pdfPageParams).every((p) => p.length === 0)) || (!section.pdfDoc && section.params.length === 0)) {
      alert('Please add at least one parameter before saving the template.');
      return;
    }
    setLoading({ open: true, text: 'Processing template...', progress: 0 });
    
    // if (isUpload && section) {
    //   const formData = {
    //     name: section.name,
    //     image: section.imageSrc
    //   };
      
    //   try {
    //     await uploadFormByTemplateID(JSON.stringify(formData), selectedTemplate);
    //     setLoading({ open: false, text: '', progress: 0 });
    //   } catch (error) {
    //     setLoading({ open: false, text: '', progress: 0 });
    //     alert('Failed to upload template: ' + error.message);
    //   }
    //   return;
    // }

    const templateData = {
      description: `Template created on ${new Date().toLocaleDateString()}`,
      template: {
        source: section.pdfDoc
          ? {
            type: 'pdf',
            filename: 'uploaded.pdf', 
            allPages: Object.keys(section.pdfPageParams).map(Number),
            totalPages: section.totalPages,
          }
          : undefined,
        data: [],
      },
      params: section.pdfDoc ? [] : section.params,
      allPageParams: section.pdfDoc ? section.pdfPageParams : undefined,
    };
    
    if (section.pdfDoc) {
      templateData.template.data = [{
        page: section.page,
        binary: section.imageSrc.split(',')[1] || '',
        size: { width: 800, height: 1131 }, 
        type: 'image/png',
      }];
    } else {
      templateData.template.data = [{
        page: 1,
        binary: section.imageSrc.split(',')[1] || '',
        size: { width: 800, height: 1131 }, 
        type: 'image/png',
      }];
    }
    
    const jsonData = JSON.stringify(templateData, null, 4);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `template_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setLoading({ open: false, text: '', progress: 0 });
  };

  const handleLoadTemplate = (event) => {
    const file = event.target.files[0];
    if (file) {
      alert('Template loading is not yet implemented for individual sections. Please use the global template loading feature.');
    }
  };

  const clearAllParams = (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    
    if (globalThis.confirm('Are you sure you want to clear all parameters?' + (section.pdfDoc ? ' (This will clear parameters for the current page only)' : ''))) {
      if (section.pdfDoc) {
        setSections(prev => prev.map(s =>
          s.id === sectionId
            ? { ...s, pdfPageParams: { ...s.pdfPageParams, [s.page]: [] } }
            : s
        ));
      } else {
        setSections(prev => prev.map(s =>
          s.id === sectionId
            ? { ...s, params: [] }
            : s
        ));
      }
    }
  };

  const renderParamsTable = (section) => {
    return (
      <ParametersTable
        pdfDoc={section.pdfDoc}
        pdfPageParams={section.pdfPageParams}
        params={section.params}
        page={section.page}
        onUpdateParam={(pageNum, newParams) => {
          setSections(prev => prev.map(s =>
            s.id === section.id
              ? pageNum
                ? { ...s, pdfPageParams: { ...s.pdfPageParams, [pageNum]: newParams } }
                : { ...s, params: newParams }
              : s
          ));
        }}
        onDeleteParam={(pageNum, index) => {
          if (pageNum && Number(pageNum) !== section.page && globalThis.confirm(`Are you sure you want to delete parameter from page ${pageNum}?`)) {
            const newParams = [...section.pdfPageParams[pageNum]];
            newParams.splice(index, 1);
            setSections(prev => prev.map(s =>
              s.id === section.id
                ? { ...s, pdfPageParams: { ...s.pdfPageParams, [pageNum]: newParams } }
                : s
            ));
          } else {
            if (section.pdfDoc) {
              const newParams = [...(section.pdfPageParams[section.page] || [])];
              newParams.splice(index, 1);
              setSections(prev => prev.map(s =>
                s.id === section.id
                  ? { ...s, pdfPageParams: { ...s.pdfPageParams, [section.page]: newParams } }
                  : s
              ));
            } else {
              const newParams = [...section.params];
              newParams.splice(index, 1);
              setSections(prev => prev.map(s =>
                s.id === section.id
                  ? { ...s, params: newParams }
                  : s
              ));
            }
          }
        }}
        renderParamsOnImage={() => {
          const canvasHandler = canvasHandlersRef.current[section.id];
          if (canvasHandler && canvasHandler.renderParamsOnImage) {
            const params = section.pdfDoc 
              ? (section.pdfPageParams[section.page] || [])
              : section.params;
            canvasHandler.setParams(params);
            canvasHandler.renderParamsOnImage(params);
          }
        }}
      />
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', bgcolor: '#f8f9fa', p: 2, overflowY: 'auto', width: '100vw' }}>
      {/* Top general navigation bar */}
      <Box sx={{ display: 'flex', gap: 1, mt: 2, mb: 2, width: '100%', justifyContent: 'center' }}>
        <Button variant="contained" color="primary" onClick={() => navigate('/invoice')}>
          Go to Invoice Page
        </Button>
        <Button variant="contained" color="primary" onClick={() => setCreateTemplateDialogOpen(true)}>
          Create new Template
        </Button>
        {Boolean(templateOptionsList?.length) &&
          <SelectDropdown
            label="Templates"
            value={selectedTemplate}
            onChange={handleSelectTemplate}
            options={templateOptionsList}
            width={200}
          />
        }
      </Box>

      {/* PDF Viewer and Parameters Panel Sections */}
      {sections.map((section) => (
        <Box key={section.id} sx={{ width: '100%', mb: 4, position: 'relative' }} data-section={section.id}>
          {/* Section Header with Controls */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
            <TextField
              label="Form Name"
              value={section.name}
              onChange={(e) => updateSectionName(section.id, e.target.value)}
              size="small"
              sx={{ mr: 2, minWidth: 150 }}
            />
            <Button variant="outlined" size="small" onClick={() => {
              fileInputRef.current.dataset.sectionId = section.id;
              fileInputRef.current.click();
            }}>
              Import Image
            </Button>
            <Button variant="outlined" size="small" onClick={() => {
              pdfInputRef.current.dataset.sectionId = section.id;
              pdfInputRef.current.click();
            }}>
              Import PDF
            </Button>
            <Button
              variant="contained"
              size="small"
              color="primary"
              disabled={!section.imageSrc || section.imageSrc === PLACEHOLDER_PATH || (section.pdfDoc && Object.values(section.pdfPageParams).every((p) => p.length === 0)) || (!section.pdfDoc && section.params.length === 0)}
              onClick={() => saveTemplate(true, section)}
            >
              Upload Template Form to Server
            </Button>
            <Button
              variant="contained"
              size="small"
              color="primary"
              disabled={!section.imageSrc || section.imageSrc === PLACEHOLDER_PATH || (section.pdfDoc && Object.values(section.pdfPageParams).every((p) => p.length === 0)) || (!section.pdfDoc && section.params.length === 0)}
              onClick={() => saveTemplate(false, section)}
            >
              Save Template Form on Local
            </Button>
            <Button variant="outlined" size="small" onClick={() => jsonInputRef.current.click()}>
              Load Template Form
            </Button>
            {sections.length > 1 && (
              <Button variant="outlined" size="small" color="error" onClick={() => removeSection(section.id)}>
                Remove Section
              </Button>
            )}
          </Box>

          {/* PDF Viewer and Parameters Panel */}
          <Box sx={{ display: 'flex', gap: 2, maxWidth: 1400, width: '100%', position: 'relative' }}>
            <PdfViewer
              imageSrc={section.imageSrc}
              pdfDoc={section.pdfDoc}
              page={section.page}
              totalPages={section.totalPages}
              onPageChange={async (newPage) => {
                if (section.pdfDoc) {
                  const newImageSrc = await renderPdfPage(section.pdfDoc, newPage);
                  if (newImageSrc) {
                    setSections(prev => prev.map(s =>
                      s.id === section.id ? { ...s, page: newPage, imageSrc: newImageSrc } : s
                    ));
                  }
                } else {
                  setSections(prev => prev.map(s =>
                    s.id === section.id ? { ...s, page: newPage } : s
                  ));
                }
              }}
              loading={false}
              onCanvasReady={() => {
              
              }}
            />

            {/* Parameters Panel */}
            <Box sx={{ flex: 1, border: '1px solid black', p: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Button
                  variant="contained"
                  color={section.isSelecting ? 'success' : 'primary'}
                  disabled={section.imageSrc === PLACEHOLDER_PATH || section.imageSrc === globalThis.location.href}
                  onClick={() => toggleSelection(section.id)}
                >
                  {section.isSelecting ? 'Stop Selecting' : 'Select Params'}
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={(section.pdfDoc && (section.pdfPageParams[section.page]?.length <= 0)) || (section.pdfDoc == null && section.params.length === 0)}
                  onClick={() => clearAllParams(section.id)}
                >
                  {section.pdfDoc ? 'Clear Page Params' : 'Clear All Params'}
                </Button>
              </Box>
              {renderParamsTable(section)}
            </Box>
          </Box>

          {/* Section Canvas Overlay */}
          <SectionCanvas
            section={section}
            isSelecting={section.isSelecting}
            onParamSelected={handleParamSelected(section.id)}
            onCanvasHandlerReady={handleCanvasHandlerReady(section.id)}
          />
        </Box>
      ))}

      {/* Add New Section Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 2 }}>
        <Button variant="contained" color="secondary" onClick={addNewSection}>
          Add New Section
        </Button>
      </Box>

      {/* Hidden file inputs */}
      <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => {
        const sectionId = Number.parseInt(e.target.dataset.sectionId);
        handleImageUpload(e, sectionId);
      }} />
      <input type="file" accept="application/pdf" ref={pdfInputRef} style={{ display: 'none' }} onChange={(e) => {
        const sectionId = Number.parseInt(e.target.dataset.sectionId);
        handlePdfUpload(e, sectionId);
      }} />
      <input type="file" accept=".json" ref={jsonInputRef} style={{ display: 'none' }} onChange={handleLoadTemplate} />

      <LoadingOverlay {...loading} />

      <Dialog 
        open={createTemplateDialogOpen} 
        onClose={() => setCreateTemplateDialogOpen(false)}
        sx={{
          '& .MuiDialog-paper': {
            minWidth: 400,
            minHeight: 300,
            borderRadius: 2,
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>Create New Template</DialogTitle>
        <DialogContent sx={{ px: 3, pb: 2 }}>
          <TextField
            label="Template Name"
            fullWidth
            value={newTemplate.name}
            onChange={handleTemplateNameChange}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            label="Template Description"
            fullWidth
            multiline
            rows={3}
            value={newTemplate.description}
            onChange={handleTemplateDescriptionChange}
            sx={{ mt: 1, mb: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 0 }}>
          <Button onClick={() => setCreateTemplateDialogOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleCreateTemplate}
            disabled={!newTemplate.name.trim()}
            variant="contained"
          >
            Create Template
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default TemplateEditor;