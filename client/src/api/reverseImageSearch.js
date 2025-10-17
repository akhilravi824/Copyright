import api from './api';

export const performReverseImageSearch = async ({ file, imageUrl, includeMetadata = true }) => {
  const formData = new FormData();

  if (file) {
    formData.append('image', file);
  }

  if (imageUrl) {
    formData.append('imageUrl', imageUrl);
  }

  formData.append('includeMetadata', includeMetadata);

  const response = await api.post('/api/reverse-image-search', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
};
