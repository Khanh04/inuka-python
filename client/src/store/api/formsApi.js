const baseUrl = import.meta.env.VITE_API_URL || '';
const token = 1111;

// Common headers function
const getHeaders = (contentType = 'application/json') => ({
  'Content-Type': contentType,
  ...(token && { Authorization: `Bearer ${token}` }),
});

// Common fetch wrapper
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

export const formsApi = {
  getFormForTenantByTemplateID: async (templateID) => {
    return apiRequest(`/api/templates/${templateID}/forms`);
  },

  uploadFormByTemplateID: async (formData, templateID) => {
    const response = await fetch(`${baseUrl}/api/templates/${templateID}/forms`, {
      method: 'POST',
      headers: getHeaders('application/json'),
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload form: ${response.statusText}`);
    }

    return response.json();
  },
};