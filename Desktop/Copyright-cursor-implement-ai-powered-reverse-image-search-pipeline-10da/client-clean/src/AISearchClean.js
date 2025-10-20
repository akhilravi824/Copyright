import React, { useState } from 'react';
import { Upload, ImageIcon, Search, Loader2, AlertCircle, ExternalLink } from 'lucide-react';

const AISearchClean = () => {
  const [file, setFile] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

  // Simple login function
  const handleLogin = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (response.ok) {
        setToken(data.token);
        setIsLoggedIn(true);
        setError(null);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error during login');
    }
  };

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

      const response = await fetch(`${API_BASE_URL}/api/ai-search/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.results || []);
      } else {
        setError(data.message || 'Search failed');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setIsLoggedIn(false);
    setResults([]);
    setFile(null);
    setError(null);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="mx-auto h-12 w-12 bg-yellow-500 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-lg">DSP</span>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Google Vision AI Search
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Clean implementation without database dependencies
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email" className="sr-only">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  defaultValue="admin@dsp.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  defaultValue="admin123"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-sm">DSP</span>
              </div>
              <h1 className="ml-3 text-2xl font-semibold text-gray-900">
                Google Vision AI Search
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <ImageIcon className="h-5 w-5 text-blue-600 mt-0.5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-900 mb-1">How it works</h3>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Upload a screenshot of proprietary material</li>
                  <li>• AI performs reverse image search using Google Vision API</li>
                  <li>• Results show where the image appears on the web</li>
                  <li>• Click "View Page" to visit external websites</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Upload Form */}
          <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Screenshot (Required)
              </label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg text-gray-500 hover:border-blue-400 cursor-pointer transition-colors bg-gray-50 hover:bg-blue-50">
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                <div className="flex flex-col items-center space-y-2">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <span className="text-sm font-medium">
                    {file ? file.name : 'Click to upload image for reverse search'}
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
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2" 
                disabled={loading || !file}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Searching...' : 'Search'}
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
                Search Results ({results.length} found)
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
                            <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800 font-medium">
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
                            className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                          >
                            View Page <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : (
                          <a
                            href={result.url}
                            className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
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
                <p>Upload an image to start reverse image search on the web</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AISearchClean;
