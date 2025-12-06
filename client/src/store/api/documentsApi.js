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

export const documentsApi = {
  getDocumentForTenantByFileID: async (fileID) => {
    return apiRequest(`/api/files/${fileID}/documents`);
  },

  uploadDocumentToFile: async (document, fileID, formID) => {
    const headers = {
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    const response = await fetch(`${baseUrl}/api/files/${fileID}/documents/${formID}`, {
      method: 'POST',
      headers,
      body: document,
    });

    if (!response.ok) {
      throw new Error('Failed to upload document');
    }

    return response.json();
  },
};