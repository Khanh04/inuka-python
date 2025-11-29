const baseUrl = import.meta.env.VITE_API_URL || '';
const token = 1111;

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

export const filesApi = {
  getAllFilesForTenant: async () => {
    return apiRequest('/api/files');
  },

  getFileForTenantByFileID: async (fileID) => {
    const data = await apiRequest(`/api/files/${fileID}`);
    return [data]; // Store as array for consistency
  },

  createNewFile: async (file) => {
    return apiRequest('/api/files', {
      method: 'POST',
      body: JSON.stringify(file),
    });
  },

  exportFileByID: async (fileID) => {
    const headers = {
      Accept: 'application/xml',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
    const response = await fetch(`${baseUrl}/api/files/${fileID}/export`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      throw new Error('Failed to export file');
    }
    return response.text();
  },
};