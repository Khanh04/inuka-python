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

export const formsApi = {
  getFormForTenantByTemplateID: async (templateID) => {
    return apiRequest(`/api/templates/${templateID}/forms`);
  },

  uploadFormByTemplateID: async (formData, templateID) => {
    const headers = {
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    const formDataToSend = new FormData();
    formDataToSend.append('name', formData.name);
    
    let imageBlob;
    if (formData.image.startsWith('data:')) {
      const base64Data = formData.image.split(',')[1];
      const mimeType = formData.image.match(/data:([^;]+)/)?.[1] || 'image/png';
      const byteString = atob(base64Data);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      imageBlob = new Blob([ab], { type: mimeType });
    } else {
      imageBlob = formData.image;
    }
    
    formDataToSend.append('image', imageBlob, 'form.png');

    const response = await fetch(`${baseUrl}/api/templates/${templateID}/forms`, {
      method: 'POST',
      headers,
      body: formDataToSend,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload form: ${response.statusText}`);
    }

    return response.json();
  },
};