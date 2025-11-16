import { create } from 'zustand';

const baseUrl = import.meta.env.VITE_API_URL || '';
const token = 1111;

export const useTenantApiStore = create((set) => ({
  templates: [],
  files: [],
  documents: [],
  forms: [],
  newTemplate: null,
  loading: false,
  error: null,
  xmlFile: null,
  getAllTemplatesForTenant: async () => {
    set({ loading: true, error: null });
    try {
      // const token = useAuthStore.getState().token;
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      };
      const response = await fetch(`${baseUrl}/api/templates`, {
        method: 'GET',
        headers,
      });
      if (!response.ok) throw new Error('Failed to fetch template list');
      const data = await response.json();
      set({ templates: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  getTemplateForTenantByTemplateID: async (templateID) => {
    set({ loading: true, error: null });
    try {
      // const token = useAuthStore.getState().token;
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      };
      const response = await fetch(`${baseUrl}/api/templates/${templateID}`, {
        method: 'GET',
        headers,
      });
      if (!response.ok) throw new Error('Failed to fetch template');
      const data = await response.json();
      set({ templates: [data], loading: false }); // Store as array for consistency
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  getAllFilesForTenant: async () => {
    set({ loading: true, error: null });
    try {
      // const token = useAuthStore.getState().token;
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      };
      const response = await fetch(`${baseUrl}/api/files`, {
        method: 'GET',
        headers,
      });
      if (!response.ok) throw new Error('Failed to fetch file list');
      const data = await response.json();
      set({ files: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  getFileForTenantByFileID: async (fileID) => {
    set({ loading: true, error: null });
    try {
      // const token = useAuthStore.getState().token;
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      };
      const response = await fetch(`${baseUrl}/api/files/${fileID}`, {
        method: 'GET',
        headers,
      });
      if (!response.ok) throw new Error('Failed to fetch file');
      const data = await response.json();
      set({ files: [data], loading: false }); // Store as array for consistency
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  getDocumentForTenantByFileID: async (fileID) => {
    set({ loading: true, error: null });
    try {
      // const token = useAuthStore.getState().token;
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      };
      const response = await fetch(`${baseUrl}/api/files/${fileID}/documents`, {
        method: 'GET',
        headers,
      });
      if (!response.ok) throw new Error('Failed to fetch document list');
      const data = await response.json();
      set({ documents: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  getFormForTenantByTemplateID: async (templateID) => {
    set({ loading: true, error: null });
    try {
      // const token = useAuthStore.getState().token;
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      };
      const response = await fetch(`${baseUrl}/api/templates/${templateID}/forms`, {
        method: 'GET',
        headers,
      });
      if (!response.ok) throw new Error('Failed to fetch document list');
      const data = await response.json();
      set({ forms: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  createTemplate: async (template) => {
    set({ loading: true, error: null, newTemplate: null });
    try {
      // const token = useAuthStore.getState().token;
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      };
      const response = await fetch(`${baseUrl}/api/templates`, {
        method: 'POST',
        headers,
        body: JSON.stringify(template),
      });
      if (!response.ok) throw new Error('Failed to create template');
      const data = await response.json();
      set({ newTemplate: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  uploadFormByTemplateID: async (forms, templateID) => {
    set({ loading: true, error: null, newTemplate: null });
    try {
      // const token = useAuthStore.getState().token;
      const headers = {
        ...(token && { Authorization: `Bearer ${token}` }),
      };

      // Python backend expects multipart/form-data with name and image fields
      const formsArray = JSON.parse(forms);

      // Upload each form separately
      const uploadPromises = formsArray.map(async (form) => {
        const formDataSingle = new FormData();
        formDataSingle.append('name', form.name || 'form');

        // Convert base64 to blob
        const base64Data = form.image_data || form.imageData;
        const byteString = atob(base64Data.split(',')[1] || base64Data);
        const mimeType = base64Data.match(/data:([^;]+)/)?.[1] || 'image/png';
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeType });
        formDataSingle.append('image', blob, 'form.png');

        return fetch(`${baseUrl}/api/templates/${templateID}/forms`, {
          method: 'POST',
          headers,
          body: formDataSingle,
        });
      });

      const responses = await Promise.all(uploadPromises);
      const results = await Promise.all(responses.map(r => r.json()));

      set({ newTemplate: results, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  uploadDocumentToFile: async (document, fileID, formID) => {
    set({ loading: true, error: null, newTemplate: null });
    try {
      // const token = useAuthStore.getState().token;
      const headers = {
        ...(token && { Authorization: `Bearer ${token}` }),
      };
      const response = await fetch(`${baseUrl}/api/files/${fileID}/documents/${formID}`, {
        method: 'PUT',
        headers,
        body: document,
      });
      if (!response.ok) throw new Error('Failed to upload document');
      const data = await response.json();
      set({ newTemplate: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  exportFileByID: async (fileID) => {
    set({ loading: true, error: null, newTemplate: null });
    try {
      // const token = useAuthStore.getState().token;
      const headers = {
        Accept: 'application/xml',
        ...(token && { Authorization: `Bearer ${token}` }),
      };
      const response = await fetch(`${baseUrl}/api/files/${fileID}/export`, {
        method: 'GET',
        headers
      });
      if (!response.ok) throw new Error('Failed to export file');
      const xmlText = await response.text();
      set({ xmlFile: xmlText, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  createNewFile: async (file) => {
    set({ loading: true, error: null, newTemplate: null });
    try {
      // const token = useAuthStore.getState().token;
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      };
      const response = await fetch(`${baseUrl}/api/files`, {
        method: 'POST',
        headers,
        body: JSON.stringify(file)
      });
      if (!response.ok) throw new Error('Failed to create file');
      const result = await response.json();
      set({ newTemplate: result, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  clearNewTemplate: () => set({ newTemplate: null, error: null }),
}));