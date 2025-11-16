export function payloadToFormData(payload) {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (item instanceof File || item instanceof Blob) {
            formData.append(`${key}[${index}]`, item);
          } else {
            formData.append(`${key}[${index}]`, String(item));
          }
        });
      } else if (value instanceof File || value instanceof Blob) {
        formData.append(key, value);
      } else {
        formData.append(key, String(value));
      }
    }
  });

  return formData;
}