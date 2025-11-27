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
import { useNavigate } from 'react-router-dom';
import { useTenantApiStore } from '../store/apiStore';
import LoadingOverlay from '../components/LoadingOverlay';
import SelectDropdown from '../components/SelectDropdown';
import ParametersTable from '../components/ParametersTable';
import PdfViewer from '../components/PdfViewer';
import { usePdfHandler } from '../hooks/usePdfHandler';
import { useCanvas } from '../hooks/useCanvas';

function TemplateEditor() {
  const navigate = useNavigate();
  const {
    templates,
    getAllTemplatesForTenant,
    getAllFilesForTenant,
    getFormForTenantByTemplateID,
    uploadFormByTemplateID
  } = useTenantApiStore();

  const PLACEHOLDER_PATH = `${import.meta.env.BASE_URL}placeholder.png`;

  const [templateOptionsList, setTemplateOptionsList] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [pdfPageParams, setPdfPageParams] = useState({});
  const [loading, setLoading] = useState({ open: false, text: '', progress: 0 });

  const pdfHandler = usePdfHandler();
  const canvasHandler = useCanvas(isSelecting, pdfHandler.pdfDoc, pdfHandler.page, (newParam) => {
    // Handle new parameter selection
    if (pdfHandler.pdfDoc) {
      setPdfPageParams((prevParams) => ({
        ...prevParams,
        [pdfHandler.page]: [...(prevParams[pdfHandler.page] || []), newParam],
      }));
    }
  }, (resizeFn) => {
    // Handle canvas resize
  });

  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const jsonInputRef = useRef(null);

  // Handle parameter selection
  const startSelection = () => {
    setIsSelecting(true);
  };

  const handleSelectTemplate = event => {
    const value = event.target.value;
    setSelectedTemplate(value);
  };

  useEffect(() => {
    getAllTemplatesForTenant(1);
    getAllFilesForTenant(1);
  }, [getAllTemplatesForTenant, getAllFilesForTenant]);

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

  // Handle image upload
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      pdfHandler.loadImage(file);
    }
  };

  // Handle PDF upload
  const handlePdfUpload = async (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      await pdfHandler.loadPdf(file);
    }
  };



  // Save template
  const saveTemplate = async (isUpload) => {
    if (pdfHandler.imageSrc === PLACEHOLDER_PATH || pdfHandler.imageSrc === window.location.href) {
      alert('Please import a template image or PDF first.');
      return;
    }
    if ((pdfHandler.pdfDoc && Object.values(pdfPageParams).every((p) => p.length === 0)) || (!pdfHandler.pdfDoc && canvasHandler.params.length === 0)) {
      alert('Please add at least one parameter before saving the template.');
      return;
    }
    setLoading({ open: true, text: 'Processing template...', progress: 0 });
    const templateData = {
      description: `Template created on ${new Date().toLocaleDateString()}`,
      template: {
        source: pdfHandler.pdfDoc
          ? {
            type: 'pdf',
            filename: pdfHandler.pdfOriginalFilename,
            allPages: Object.keys(pdfPageParams).map(Number),
            totalPages: pdfHandler.totalPages,
          }
          : undefined,
        data: [],
      },
      params: pdfHandler.pdfDoc ? [] : canvasHandler.params,
      allPageParams: pdfHandler.pdfDoc ? pdfPageParams : undefined,
    };
    if (pdfHandler.pdfDoc) {
      const allPageData = [];
      const originalPage = pdfHandler.page;
      for (let pageNum = 1; pageNum <= pdfHandler.totalPages; pageNum++) {
        setLoading({ open: true, text: `Processing page ${pageNum} of ${pdfHandler.totalPages}...`, progress: (pageNum / pdfHandler.totalPages) * 100 });
        await pdfHandler.renderPage(pageNum);
        const img = document.querySelector('img'); // Assuming the image is rendered
        allPageData.push({
          page: pageNum,
          binary: img.src.split(',')[1] || '',
          size: { width: img.naturalWidth, height: img.naturalHeight },
          type: 'image/png',
        });
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      templateData.template.data = allPageData;
      pdfHandler.setPage(originalPage);
      await pdfHandler.renderPage(originalPage);
      setLoading({ open: false, text: '', progress: 0 });
    } else {
      const img = document.querySelector('img');
      templateData.template.data = [{
        page: 1,
        binary: img.src.split(',')[1] || '',
        size: { width: img.naturalWidth, height: img.naturalHeight },
        type: 'image/png',
      }];
    }
    const jsonData = JSON.stringify(templateData, null, 4);
    if (isUpload) {
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
          canvasHandler.setParams([]);
          setPdfPageParams({});
          const isPdfTemplate = jsonData.template.source && jsonData.template.source.type === 'pdf';
          if (isPdfTemplate) {
            pdfHandler.setPdfDoc({
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
            pdfHandler.setImageSrc(pageImages[pdfHandler.page]);
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
            canvasHandler.setParams([...(jsonData.allPageParams[pdfHandler.page] || [])]);
          } else {
            pdfHandler.setPdfDoc(null);
            pdfHandler.setTotalPages(1);
            pdfHandler.setPage(1);
            const imgSrc = jsonData.template.data[0].binary.startsWith('data:') ? jsonData.template.data[0].binary : `data:${jsonData.template.data[0].type || 'image/png'};base64,${jsonData.template.data[0].binary}`;
            pdfHandler.setImageSrc(imgSrc);
            canvasHandler.setParams(jsonData.params.map((param) => ({
              id: param.id || `Param ${canvasHandler.params.length + 1}`,
              type: param.type || 'string',
              x1: parseFloat(param.x1 || 0).toFixed(2),
              y1: parseFloat(param.y1 || 0).toFixed(2),
              x2: parseFloat(param.x2 || 0).toFixed(2),
              y2: parseFloat(param.y2 || 0).toFixed(2),
              isMultiline: Boolean(param.isMultiline),
            })));
          }
          canvasHandler.renderParamsOnImage(pdfHandler.page);
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
    if (window.confirm('Are you sure you want to clear all parameters?' + (pdfHandler.pdfDoc ? ' (This will clear parameters for the current page only)' : ''))) {
      if (pdfHandler.pdfDoc) {
        canvasHandler.setParams([]);
        setPdfPageParams((prev) => {
          const newParams = { ...prev };
          delete newParams[pdfHandler.page];
          return newParams;
        });
      } else {
        canvasHandler.setParams([]);
      }
      canvasHandler.renderParamsOnImage(pdfHandler.page);
    }
  };

  // Render parameter table
  const renderParamsTable = () => {
    return (
      <ParametersTable
        pdfDoc={pdfHandler.pdfDoc}
        pdfPageParams={pdfPageParams}
        params={canvasHandler.params}
        page={pdfHandler.page}
        onUpdateParam={(pageNum, newParams) => {
          if (pageNum) {
            setPdfPageParams((prev) => ({ ...prev, [pageNum]: newParams }));
          } else {
            canvasHandler.setParams(newParams);
          }
        }}
        onDeleteParam={(pageNum, index) => {
          if (Number(pageNum) !== pdfHandler.page) {
            if (window.confirm(`Are you sure you want to delete parameter from page ${pageNum}?`)) {
              const newParams = [...pdfPageParams[pageNum]];
              newParams.splice(index, 1);
              setPdfPageParams((prev) => ({ ...prev, [pageNum]: newParams }));
            }
          } else {
            const newParams = [...canvasHandler.params];
            newParams.splice(index, 1);
            canvasHandler.setParams(newParams);
            setPdfPageParams((prevParams) => ({ ...prevParams, [pdfHandler.page]: newParams }));
            canvasHandler.renderParamsOnImage(pdfHandler.page);
          }
        }}
        renderParamsOnImage={canvasHandler.renderParamsOnImage}
      />
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
          <SelectDropdown
            label="Templates"
            value={selectedTemplate}
            onChange={handleSelectTemplate}
            options={templateOptionsList}
            width={200}
          />
        }

        <Button
          variant="contained"
          color="primary"
          disabled={!pdfHandler.imageSrc || pdfHandler.imageSrc === PLACEHOLDER_PATH || (pdfHandler.pdfDoc && Object.values(pdfPageParams).every((p) => p.length === 0)) || (!pdfHandler.pdfDoc && canvasHandler.params.length === 0)}
          onClick={() => saveTemplate(true)}
        >
          Upload Template
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={!pdfHandler.imageSrc || pdfHandler.imageSrc === PLACEHOLDER_PATH || (pdfHandler.pdfDoc && Object.values(pdfPageParams).every((p) => p.length === 0)) || (!pdfHandler.pdfDoc && canvasHandler.params.length === 0)}
          onClick={saveTemplate}
        >
          Save Template
        </Button>
        <Button variant="contained" color="primary" onClick={() => jsonInputRef.current.click()}>
          Load Template
        </Button>
        <input type="file" accept=".json" ref={jsonInputRef} style={{ display: 'none' }} onChange={handleLoadTemplate} />
      </Box>

      <PdfViewer
        imageSrc={pdfHandler.imageSrc}
        pdfDoc={pdfHandler.pdfDoc}
        page={pdfHandler.page}
        totalPages={pdfHandler.totalPages}
        onPageChange={pdfHandler.handlePageChange}
        loading={pdfHandler.loading}
        onCanvasReady={(rect) => {
          // Handle canvas resize
        }}
      >
        <div style={{ position: 'absolute', zIndex: 99 }} >
          <canvas ref={canvasHandler.canvasRef} />
        </div>
      </PdfViewer>

      {/* Parameters Panel */}
      <Box sx={{ flex: 1, minWidth: 400, maxWidth: 600, border: '1px solid black', p: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Button
            variant="contained"
            color={isSelecting ? 'success' : 'primary'}
            disabled={pdfHandler.imageSrc === PLACEHOLDER_PATH || pdfHandler.imageSrc === window.location.href}
            onClick={startSelection}
          >
            Select Params
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={(pdfHandler.pdfDoc && !(pdfPageParams[pdfHandler.page]?.length > 0)) || (!pdfHandler.pdfDoc && canvasHandler.params.length === 0)}
            onClick={clearAllParams}
          >
            {pdfHandler.pdfDoc ? 'Clear Page Params' : 'Clear All Params'}
          </Button>
        </Box>
        {renderParamsTable()}
      </Box>

      <LoadingOverlay {...loading} />
    </Box>
  );
}

export default TemplateEditor;