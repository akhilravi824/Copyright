import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Upload, Image as ImageIcon, Trash2, RefreshCw, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/api';
import { computeAverageHash, similarityToPercentage } from '../utils/imageFingerprint';
import LoadingSpinner from '../components/LoadingSpinner';

const defaultFilters = {
  minSimilarity: 0.6,
  limit: 6,
};

const ReverseImageSearch = () => {
  const [referenceImages, setReferenceImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchSummary, setSearchSummary] = useState(null);
  const [queryPreview, setQueryPreview] = useState(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [newReference, setNewReference] = useState({
    title: '',
    description: '',
    sourceUrl: '',
    tags: '',
    file: null,
  });

  const uploadInputRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    fetchReferenceImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (queryPreview?.objectUrl) {
        URL.revokeObjectURL(queryPreview.objectUrl);
      }
    };
  }, [queryPreview]);

  const fetchReferenceImages = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/reverse-image-search/reference');
      setReferenceImages(data.images || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load reference images.');
    } finally {
      setLoading(false);
    }
  };

  const handleReferenceChange = (field, value) => {
    setNewReference((prev) => ({ ...prev, [field]: value }));
  };

  const handleReferenceFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      event.target.value = '';
      return;
    }

    handleReferenceChange('file', file);
  };

  const resetReferenceForm = () => {
    setNewReference({
      title: '',
      description: '',
      sourceUrl: '',
      tags: '',
      file: null,
    });
    if (uploadInputRef.current) {
      uploadInputRef.current.value = '';
    }
  };

  const handleCreateReference = async (event) => {
    event.preventDefault();
    if (!newReference.file) {
      toast.error('Please upload an image to index.');
      return;
    }

    setUploading(true);
    try {
      const fingerprint = await computeAverageHash(newReference.file);

      const formData = new FormData();
      formData.append('title', newReference.title || newReference.file.name);
      formData.append('description', newReference.description);
      formData.append('sourceUrl', newReference.sourceUrl);
      formData.append('tags', newReference.tags);
      formData.append('fingerprint', fingerprint.fingerprint);
      formData.append('fingerprintAlgorithm', fingerprint.algorithm);
      formData.append('fingerprintLength', fingerprint.length);
      formData.append('image', newReference.file);

      const { data } = await api.post('/reverse-image-search/reference', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setReferenceImages((prev) => [data.image, ...prev]);
      toast.success('Reference image added successfully.');
      resetReferenceForm();
    } catch (error) {
      console.error(error);
      const message = error.response?.data?.message || error.message || 'Failed to create reference image.';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteReference = async (id) => {
    if (!window.confirm('Remove this reference image from the library?')) {
      return;
    }

    try {
      await api.delete(`/reverse-image-search/reference/${id}`);
      setReferenceImages((prev) => prev.filter((image) => image.id !== id));
      toast.success('Reference image removed.');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Unable to remove reference image.');
    }
  };

  const handleSearchFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      event.target.value = '';
      return;
    }

    if (queryPreview?.objectUrl) {
      URL.revokeObjectURL(queryPreview.objectUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setQueryPreview({ objectUrl, file });
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    const file = queryPreview?.file;
    if (!file) {
      toast.error('Upload an image to search.');
      return;
    }

    setSearching(true);
    try {
      const fingerprint = await computeAverageHash(file);
      const minSimilarity = Number(filters.minSimilarity) || 0;
      const limit = Number(filters.limit) || 6;

      const { data } = await api.post('/reverse-image-search/search', {
        fingerprint: fingerprint.fingerprint,
        fingerprintAlgorithm: fingerprint.algorithm,
        fingerprintLength: fingerprint.length,
        minSimilarity,
        limit,
      });

      setSearchResults(data.matches || []);
      setSearchSummary(data.summary || null);

      if (!data.matches?.length) {
        toast('No similar images found in the reference library.');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Reverse image search failed.');
    } finally {
      setSearching(false);
    }
  };

  const resetSearch = () => {
    setSearchResults([]);
    setSearchSummary(null);
    if (queryPreview?.objectUrl) {
      URL.revokeObjectURL(queryPreview.objectUrl);
    }
    setQueryPreview(null);
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
  };

  const sortedReferenceImages = useMemo(
    () => [...referenceImages].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [referenceImages]
  );

  return (
    <div className="space-y-8">
      <header className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Reverse Image Search</h1>
            <p className="mt-2 text-sm text-gray-600 max-w-3xl">
              Upload known DSP assets to build a visual fingerprint library, then search for potential infringements by uploading a suspected image. The search engine uses perceptual hashing to measure visual similarity directly in the browser before comparing fingerprints server-side.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchReferenceImages}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </header>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Upload className="h-6 w-6 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Add reference image</h2>
          </div>
          <form className="space-y-4" onSubmit={handleCreateReference}>
            <div>
              <label className="block text-sm font-medium text-gray-700">Image file</label>
              <input
                type="file"
                accept="image/*"
                ref={uploadInputRef}
                onChange={handleReferenceFileChange}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={newReference.title}
                  onChange={(event) => handleReferenceChange('title', event.target.value)}
                  placeholder="e.g. Official ASL course cover"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Source URL</label>
                <input
                  type="url"
                  value={newReference.sourceUrl}
                  onChange={(event) => handleReferenceChange('sourceUrl', event.target.value)}
                  placeholder="https://"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tags</label>
              <input
                type="text"
                value={newReference.tags}
                onChange={(event) => handleReferenceChange('tags', event.target.value)}
                placeholder="product, campaign, year"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                rows={3}
                value={newReference.description}
                onChange={(event) => handleReferenceChange('description', event.target.value)}
                placeholder="Add context, release details, or usage restrictions"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={resetReferenceForm}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                {uploading ? (
                  <>
                    <LoadingSpinner size="small" /> Indexing…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> Index image
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Search className="h-6 w-6 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Search by image</h2>
          </div>
          <form className="space-y-4" onSubmit={handleSearch}>
            <div>
              <label className="block text-sm font-medium text-gray-700">Upload suspected image</label>
              <input
                type="file"
                accept="image/*"
                ref={searchInputRef}
                onChange={handleSearchFileChange}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-100"
              />
            </div>
            {queryPreview && (
              <div className="flex items-center gap-4 rounded-lg border border-dashed border-emerald-200 bg-emerald-50/60 p-4">
                <img
                  src={queryPreview.objectUrl}
                  alt="Query preview"
                  className="h-16 w-16 rounded-md object-cover shadow-sm"
                />
                <div>
                  <p className="text-sm font-medium text-emerald-900">Query image ready</p>
                  <p className="text-xs text-emerald-800">We will compute a perceptual hash in the browser before searching.</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Minimum similarity</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={filters.minSimilarity}
                  onChange={(event) => setFilters((prev) => ({ ...prev, minSimilarity: event.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                />
                <p className="mt-1 text-xs text-gray-500">Enter a value between 0 and 1. Higher values narrow results.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Maximum matches</label>
                <input
                  type="number"
                  min="1"
                  max="25"
                  value={filters.limit}
                  onChange={(event) => setFilters((prev) => ({ ...prev, limit: event.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={resetSearch}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={searching}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
              >
                {searching ? (
                  <>
                    <LoadingSpinner size="small" /> Searching…
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" /> Find matches
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ImageIcon className="h-6 w-6 text-blue-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Reference library</h2>
              <p className="text-sm text-gray-500">Indexed assets are stored securely on the server with their perceptual fingerprints.</p>
            </div>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">{referenceImages.length} stored</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : referenceImages.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-600">No reference images yet. Start by indexing key brand assets to build your fingerprint library.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sortedReferenceImages.map((image) => (
              <article key={image.id} className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="relative h-40 w-full bg-gray-100">
                  {image.imageUrl ? (
                    <img src={image.imageUrl} alt={image.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">No preview</div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4 space-y-3">
                  <header>
                    <h3 className="text-base font-semibold text-gray-900">{image.title || 'Untitled reference'}</h3>
                    {image.sourceUrl && (
                      <a
                        href={image.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-500"
                      >
                        {image.sourceUrl}
                      </a>
                    )}
                  </header>
                  {image.description && <p className="text-sm text-gray-600">{image.description}</p>}
                  {image.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {image.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-auto flex items-center justify-between text-xs text-gray-500">
                    <div>
                      <p>Indexed {new Date(image.createdAt).toLocaleString()}</p>
                      <p>Fingerprint length: {(image.fingerprintLength ?? image.fingerprint?.length ?? 0) * 4} bits</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteReference(image.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {searchResults.length > 0 && (
        <section className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Search className="h-6 w-6 text-emerald-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Search results</h2>
              {searchSummary && (
                <p className="text-sm text-gray-500">
                  Reviewed {searchSummary.evaluated} candidates in {searchSummary.executionTimeMs} ms. Showing top {searchSummary.limit} matches with similarity ≥ {filters.minSimilarity}.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {searchResults.map((result) => (
              <article key={result.id} className="flex flex-col overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50/60 shadow-sm">
                <div className="relative h-40 w-full bg-gray-100">
                  {result.imageUrl ? (
                    <img src={result.imageUrl} alt={result.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">No preview</div>
                  )}
                  <div className="absolute top-3 right-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
                    {similarityToPercentage(result.similarity)} match
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4 space-y-3">
                  <header>
                    <h3 className="text-base font-semibold text-gray-900">{result.title}</h3>
                    {result.sourceUrl && (
                      <a
                        href={result.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-500"
                      >
                        {result.sourceUrl}
                      </a>
                    )}
                  </header>
                  {result.description && <p className="text-sm text-gray-600">{result.description}</p>}
                  <div className="rounded-md bg-white/80 p-3 text-xs text-gray-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <Info className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Distance: {result.distance} ({result.bitCount} bits compared)</span>
                    </div>
                    {result.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {result.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ReverseImageSearch;
