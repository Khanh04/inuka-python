import { create } from 'zustand';
import { templatesApi, filesApi, formsApi, documentsApi } from './api';

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
      const data = await templatesApi.getAllTemplatesForTenant();
      set({ templates: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  getTemplateForTenantByTemplateID: async (templateID) => {
    set({ loading: true, error: null });
    try {
      const data = await templatesApi.getTemplateForTenantByTemplateID(templateID);
      set({ template: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  getAllFilesForTenant: async () => {
    set({ loading: true, error: null });
    try {
      const data = await filesApi.getAllFilesForTenant();
      set({ files: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  getFileForTenantByFileID: async (fileID) => {
    set({ loading: true, error: null });
    try {
      const data = await filesApi.getFileForTenantByFileID(fileID);
      set({ file: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  getDocumentForTenantByFileID: async (fileID) => {
    set({ loading: true, error: null });
    try {
      const data = await documentsApi.getDocumentForTenantByFileID(fileID);
      set({ document: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  getFormForTenantByTemplateID: async (templateID) => {
    set({ loading: true, error: null });
    try {
      const data = await formsApi.getFormForTenantByTemplateID(templateID);
      set({ forms: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  createTemplate: async (templateData) => {
    set({ loading: true, error: null });
    try {
      const data = await templatesApi.createTemplate(templateData);
      set({ template: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  uploadFormByTemplateID: async (formData, templateID) => {
    set({ loading: true, error: null, newTemplate: null });
    try {
      const data = await formsApi.uploadFormByTemplateID(formData, templateID);
      set({ newTemplate: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  uploadDocumentToFile: async (document, fileID, formID) => {
    set({ loading: true, error: null, newTemplate: null });
    try {
      const data = await documentsApi.uploadDocumentToFile(document, fileID, formID);
      set({ newTemplate: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  exportFileByID: async (fileID) => {
    set({ loading: true, error: null, newTemplate: null });
    try {
      const data = await filesApi.exportFileByID(fileID);
      set({ xmlFile: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  createNewFile: async (file) => {
    set({ loading: true, error: null, newTemplate: null });
    try {
      const data = await filesApi.createNewFile(file);
      set({ newTemplate: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  clearNewTemplate: () => set({ newTemplate: null, error: null }),
}));