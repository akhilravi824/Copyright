import React, { useState } from 'react';
import { Upload, ImageIcon, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import api from '../api/api';

const CleanAISearch = () => {
  const [file, setFile] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResults([]);
    setLoading(true);

    try {
      if (!file) {
        setError('Please select an image file');
        return;
      }

      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post('/api/ai-search-clean/clean', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResults(response.data.results || []);
    } catch (err) {
      console.error('Clean AI Search error:', err);
      setError(err.response?.data?.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Clean AI Search</h1>
        <p className="mt-1 text-sm text-gray-600">
          Fast, lightweight reverse image search without database dependencies.
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <ImageIcon className="h-5 w-5 text-green-600 mt-0.5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-green-900 mb-1">Clean Implementation</h3>
            <ul className="text-xs text-green-800 space-y-1">
              <li>• No database dependencies - works independently</li>
              <li>• Faster processing with minimal overhead</li>
              <li>• Google Vision API with fallback mode</li>
              <li>• Perfect for quick searches and demos</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Image for Clean Search
          </label>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg text-gray-500 hover:border-green-400 cursor-pointer transition-colors bg-gray-50 hover:bg-green-50">
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <div className="flex flex-col items-center space-y-2">
              <Upload className="h-8 w-8 text-gray-400" />
              <span className="text-sm font-medium">
                {file ? file.name : 'Click to upload image'}
              </span>
              <span className="text-xs text-gray-400">
                PNG, JPG, GIF, WebP (Max 5MB)
              </span>
            </div>
          </label>
        </div>

        <div className="flex gap-3">
          <button 
            type="submit" 
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2" 
            disabled={loading || !file}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Searching...' : 'Clean Search'}
          </button>
          <button 
            type="button" 
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50" 
            onClick={() => { 
              setFile(null); 
              setResults([]);
              setError(null);
            }}
          >
            Reset
          </button>
        </div>
      </form>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Clean Search Results ({results.length} found)
          </h3>
          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h4 className="font-medium text-gray-900">{result.title}</h4>
                      
                      {/* Platform Badge */}
                      {result.platform && (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">
                          {result.platform}
                        </span>
                      )}

                      {/* Match Type Badge */}
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        result.type === 'page-match'
                          ? 'bg-red-100 text-red-800'
                          : result.type === 'web-entity'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {result.type.replace('-', ' ')}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-2">{result.description}</p>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="font-medium">
                        Confidence: {Math.round(result.similarity * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex-shrink-0">
                    {result.externalUrl ? (
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                      >
                        View Page <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      <a
                        href={result.url}
                        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                      >
                        View Details
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && results.length === 0 && !error && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center text-gray-500">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Upload an image to start clean AI search</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CleanAISearch;
