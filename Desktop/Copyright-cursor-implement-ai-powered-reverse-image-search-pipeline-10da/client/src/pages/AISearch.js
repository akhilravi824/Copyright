import React, { useState } from 'react';
import { Upload, ImageIcon, Search } from 'lucide-react';

const AISearch = () => {
  const [query, setQuery] = useState('');
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Placeholder page – hook up to reverse image search API later
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">AI Search</h1>
        <p className="mt-1 text-sm text-gray-600">Find similar images or semantically related cases.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
        <div>
          <label className="form-label">Text query</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              className="form-input pl-10"
              placeholder="Describe the image or case..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="form-label">Upload image</label>
          <label className="flex items-center justify-center w-full h-28 border-2 border-dashed rounded-lg text-gray-500 hover:border-gray-400 cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <div className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>{file ? file.name : 'Click to upload image'}</span>
            </div>
          </label>
        </div>

        <div className="flex gap-3">
          <button type="submit" className="btn btn-primary">Search</button>
          <button type="button" className="btn" onClick={() => { setQuery(''); setFile(null); }}>Reset</button>
        </div>
      </form>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-sm text-gray-500">Results will appear here.</div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="aspect-square bg-gray-100 rounded flex items-center justify-center text-gray-400">
            <ImageIcon className="h-8 w-8" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISearch;


