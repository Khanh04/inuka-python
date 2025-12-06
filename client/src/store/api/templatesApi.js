const baseUrl = import.meta.env.VITE_API_URL || '';
const token = 1111;

const getHeaders = (contentType = 'application/json') => ({
  'Content-Type': contentType,
  ...(token && { Authorization: `Bearer ${token}` }),
});

const apiRequest = async (url, options = {}) => {
  const response = await fetch(`${baseUrl}${url}`, {
    headers: getHeaders(),
    ...options,
  });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  return response.json();
};

export const templatesApi = {
  getAllTemplatesForTenant: async () => {
    return apiRequest('/api/templates');
  },

  getTemplateForTenantByTemplateID: async (templateID) => {
    const data = await apiRequest(`/api/templates/${templateID}`);
    return [data]; 
  },

  createTemplate: async (template) => {
    return apiRequest('/api/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  },
};