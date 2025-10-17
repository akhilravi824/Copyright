const fs = require('fs').promises;
const path = require('path');
const { randomUUID } = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'reference-images.json');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'reference-images');

const HEX_BIT_COUNTS = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];

async function ensureStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  try {
    await fs.access(DATA_FILE);
  } catch (error) {
    await fs.writeFile(DATA_FILE, JSON.stringify({ images: [] }, null, 2));
  }
}

async function readStore() {
  await ensureStorage();

  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Legacy format support
      return parsed;
    }
    if (Array.isArray(parsed?.images)) {
      return parsed.images;
    }
    return [];
  } catch (error) {
    console.error('Failed to parse reference image store. Resetting file.', error);
    await fs.writeFile(DATA_FILE, JSON.stringify({ images: [] }, null, 2));
    return [];
  }
}

async function writeStore(images) {
  await ensureStorage();
  await fs.writeFile(
    DATA_FILE,
    JSON.stringify({
      updatedAt: new Date().toISOString(),
      images,
    }, null, 2)
  );
}

function normaliseTags(rawTags = []) {
  if (Array.isArray(rawTags)) {
    return rawTags.map((tag) => String(tag).trim()).filter(Boolean);
  }

  return String(rawTags)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function validateFingerprint(hexString) {
  if (!hexString || typeof hexString !== 'string') {
    throw new Error('Fingerprint is required');
  }

  const normalised = hexString.trim().toLowerCase();
  if (!/^([0-9a-f]+)$/.test(normalised)) {
    throw new Error('Fingerprint must be a hex-encoded string');
  }

  return normalised;
}

function hammingDistance(fingerprintA, fingerprintB, length) {
  const maxLength = length || Math.min(fingerprintA.length, fingerprintB.length);
  const paddedA = fingerprintA.slice(0, maxLength).padEnd(maxLength, '0');
  const paddedB = fingerprintB.slice(0, maxLength).padEnd(maxLength, '0');

  let distance = 0;
  for (let index = 0; index < maxLength; index += 1) {
    const digitA = parseInt(paddedA[index], 16);
    const digitB = parseInt(paddedB[index], 16);
    const xor = (digitA ^ digitB) & 0x0f;
    distance += HEX_BIT_COUNTS[xor];
  }

  return distance;
}

async function listReferenceImages() {
  const images = await readStore();
  return images
    .map((image) => ({
      ...image,
      createdAt: image.createdAt || image.uploadedAt,
    }))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

async function addReferenceImage({
  title,
  description,
  sourceUrl,
  tags,
  fingerprint,
  fingerprintAlgorithm,
  fingerprintLength,
  fileName,
  mimeType,
  fileSize,
  uploadedBy,
}) {
  const images = await readStore();

  const normalisedFingerprint = validateFingerprint(fingerprint);
  const payload = {
    id: randomUUID(),
    title: title || 'Untitled reference',
    description: description || '',
    sourceUrl: sourceUrl || '',
    tags: normaliseTags(tags),
    fingerprint: normalisedFingerprint,
    fingerprintAlgorithm: (fingerprintAlgorithm || 'ahash').toLowerCase(),
    fingerprintLength: Number.parseInt(fingerprintLength, 10) || normalisedFingerprint.length,
    fileName,
    mimeType,
    fileSize,
    uploadedBy: uploadedBy || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  images.push(payload);
  await writeStore(images);
  return payload;
}

async function deleteReferenceImage(id) {
  if (!id) {
    return null;
  }

  const images = await readStore();
  const index = images.findIndex((image) => image.id === id);

  if (index === -1) {
    return null;
  }

  const [removed] = images.splice(index, 1);
  await writeStore(images);
  return removed;
}

async function findSimilarImages({
  fingerprint,
  fingerprintAlgorithm = 'ahash',
  fingerprintLength,
  limit = 10,
  minSimilarity = 0,
}) {
  const start = Date.now();
  const targetFingerprint = validateFingerprint(fingerprint);
  const candidateFingerprintLength = Number.parseInt(fingerprintLength, 10) || targetFingerprint.length;
  const normalisedAlgorithm = fingerprintAlgorithm.toLowerCase();

  const images = await listReferenceImages();
  const candidates = images.filter((image) => image.fingerprintAlgorithm === normalisedAlgorithm);

  const scored = candidates.map((image) => {
    const length = Math.min(candidateFingerprintLength, image.fingerprintLength || image.fingerprint.length);
    const bits = length * 4;
    if (bits === 0) {
      return {
        image,
        similarity: 0,
        distance: 0,
        bitCount: 0,
      };
    }

    const distance = hammingDistance(targetFingerprint, image.fingerprint, length);
    const similarity = 1 - distance / bits;

    return {
      image,
      similarity,
      distance,
      bitCount: bits,
    };
  });

  const filtered = scored
    .filter((entry) => entry.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, Math.max(1, Math.min(Number(limit) || 10, 50)));

  const matches = filtered.map((entry) => ({
    ...entry.image,
    similarity: Number(entry.similarity.toFixed(4)),
    distance: entry.distance,
    bitCount: entry.bitCount,
  }));

  const end = Date.now();

  return {
    matches,
    summary: {
      totalCandidates: candidates.length,
      evaluated: scored.length,
      minSimilarity,
      limit: Number(limit) || 10,
      executionTimeMs: end - start,
    },
  };
}

module.exports = {
  listReferenceImages,
  addReferenceImage,
  deleteReferenceImage,
  findSimilarImages,
  ensureStorage,
  constants: {
    DATA_DIR,
    DATA_FILE,
    UPLOADS_DIR,
  },
};
