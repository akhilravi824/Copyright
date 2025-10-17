export async function computeAverageHash(file, options = {}) {
  const { size = 8 } = options;

  if (!file) {
    throw new Error('A file is required to compute the image fingerprint.');
  }

  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const { fingerprint, bits } = extractFingerprint(image, size);

  return {
    fingerprint,
    bits,
    length: fingerprint.length,
    algorithm: 'ahash',
    size,
    dataUrl,
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read the selected file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load the selected image.'));
    image.src = src;
  });
}

function extractFingerprint(image, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  context.drawImage(image, 0, 0, size, size);
  const imageData = context.getImageData(0, 0, size, size);

  const grayscaleValues = [];
  for (let index = 0; index < imageData.data.length; index += 4) {
    const r = imageData.data[index];
    const g = imageData.data[index + 1];
    const b = imageData.data[index + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    grayscaleValues.push(gray);
  }

  const average = grayscaleValues.reduce((acc, value) => acc + value, 0) / grayscaleValues.length;

  const bits = grayscaleValues.map((value) => (value >= average ? 1 : 0));
  let fingerprint = '';
  for (let index = 0; index < bits.length; index += 4) {
    const nibble =
      ((bits[index] || 0) << 3) |
      ((bits[index + 1] || 0) << 2) |
      ((bits[index + 2] || 0) << 1) |
      (bits[index + 3] || 0);
    fingerprint += nibble.toString(16);
  }

  return { fingerprint, bits };
}

export function similarityToPercentage(similarity) {
  return `${Math.round(similarity * 100)}%`;
}
