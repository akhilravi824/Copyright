import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  BrainCircuit,
  Clock,
  ExternalLink,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  ShieldCheck,
  Sparkles,
  Upload,
  Zap
} from 'lucide-react';
import { performReverseImageSearch } from '../api/reverseImageSearch';

const formatDate = (isoString) => new Date(isoString).toLocaleString();

const ConfidenceBadge = ({ confidence }) => {
  const tone = useMemo(() => {
    if (confidence >= 85) return 'bg-red-100 text-red-700 border-red-200';
    if (confidence >= 70) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }, [confidence]);

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${tone}`}>
      <ShieldCheck className="w-3 h-3 mr-1" />
      {confidence}% match
    </span>
  );
};

const RiskBadge = ({ riskLevel }) => {
  if (!riskLevel) {
    return null;
  }

  const tone = {
    very_high: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-amber-100 text-amber-700 border-amber-200',
    medium: 'bg-blue-100 text-blue-700 border-blue-200',
    low: 'bg-emerald-100 text-emerald-700 border-emerald-200'
  }[riskLevel] || 'bg-gray-100 text-gray-700 border-gray-200';

  const label = {
    very_high: 'Very high risk',
    high: 'High risk',
    medium: 'Moderate risk',
    low: 'Low risk'
  }[riskLevel] || 'Risk level';

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${tone}`}>
      <BrainCircuit className="w-3 h-3 mr-1" />
      {label}
    </span>
  );
};

const MatchCard = ({ match }) => (
  <div className="card">
    <div className="card-body space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{match.source}</h3>
          <p className="text-sm text-gray-500">{match.domain}</p>
        </div>
        <ConfidenceBadge confidence={match.confidence} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-gray-700">Listing details</p>
          <p className="mt-1 text-sm text-gray-600">{match.snippet}</p>

          <div className="mt-3 space-y-2 text-sm text-gray-500">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2 text-gray-400" />
              <span>
                Last seen: <strong>{formatDate(match.lastSeen)}</strong>
              </span>
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2 text-gray-400" />
              <span>
                First detected: <strong>{formatDate(match.firstSeen)}</strong>
              </span>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <a
            href={match.listingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            View listing
            <ExternalLink className="w-4 h-4 ml-1" />
          </a>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recommended actions</p>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              {match.actions.map((action) => (
                <li key={action} className="flex items-start">
                  <Zap className="w-4 h-4 mr-2 mt-0.5 text-indigo-500" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ReverseImageSearch = () => {
  const [file, setFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [useAiInsights, setUseAiInsights] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!file && !imageUrl) {
      setError('Upload an image or provide a public image URL to start a search.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setResults(null);

      const data = await performReverseImageSearch({
        file,
        imageUrl,
        includeMetadata,
        useAiInsights
      });
      setResults(data);
    } catch (err) {
      const message = err?.response?.data?.message || 'Reverse image search failed. Try again later.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between md:space-x-6 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reverse Image Search</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload a reference image or paste an image URL to discover potential unauthorized uses across the web.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="card-body space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <label className="flex flex-col">
              <span className="text-sm font-medium text-gray-700 flex items-center">
                <Upload className="w-4 h-4 mr-2 text-gray-400" /> Upload reference image
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className="mt-2 block w-full text-sm text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-indigo-600 hover:file:bg-indigo-100"
              />
              <span className="mt-2 text-xs text-gray-500">Supported formats: JPG, PNG, WebP up to 10MB.</span>
            </label>

            <label className="flex flex-col">
              <span className="text-sm font-medium text-gray-700 flex items-center">
                <LinkIcon className="w-4 h-4 mr-2 text-gray-400" /> Or paste image URL
              </span>
              <input
                type="url"
                placeholder="https://example.com/reference-image.jpg"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                className="mt-2 form-input"
              />
              <span className="mt-2 text-xs text-gray-500">
                Use this option for publicly accessible images hosted online.
              </span>
            </label>
          </div>

          <div className="flex flex-col space-y-4 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-4 sm:space-y-0">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(event) => {
                    const nextValue = event.target.checked;
                    setIncludeMetadata(nextValue);
                    if (!nextValue) {
                      setUseAiInsights(false);
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-600">Include forensic analysis metadata</span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={useAiInsights}
                  onChange={(event) => setUseAiInsights(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  disabled={!includeMetadata}
                />
                <span
                  className={`text-sm flex items-center ${
                    includeMetadata ? 'text-gray-600' : 'text-gray-400'
                  }`}
                  title={includeMetadata ? undefined : 'Enable forensic metadata to unlock AI insights'}
                >
                  <Sparkles className="w-4 h-4 mr-1 text-indigo-500" /> AI risk assessment
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary inline-flex items-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning image...
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Start search
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Reverse image search error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {results && (
        <div className="space-y-6">
          {results.metadata && (
            <div className="card">
              <div className="card-body space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Forensic summary</h2>
                    <p className="text-sm text-gray-500">Generated {formatDate(results.generatedAt)}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {results.metadata.matchStatistics.riskLevel && (
                      <RiskBadge riskLevel={results.metadata.matchStatistics.riskLevel} />
                    )}
                    <ConfidenceBadge confidence={results.metadata.matchStatistics.highestConfidence} />
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Key finding</p>
                    <p className="mt-1 text-sm text-gray-700">{results.metadata.summary}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fingerprint</p>
                    <p className="mt-1 text-sm text-gray-700 break-all">{results.metadata.fingerprint.signature}</p>
                    <p className="mt-1 text-xs text-gray-500">SHA-256 hash signature</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">File details</p>
                    <p className="mt-1 text-sm text-gray-700">{results.metadata.fileName}</p>
                    <p className="text-xs text-gray-500">
                      {results.metadata.mimeType} • {(results.metadata.fingerprint.byteLength / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                {results.metadata.aiInsights && (
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-indigo-800 uppercase tracking-wide flex items-center">
                        <Sparkles className="w-4 h-4 mr-2" /> AI-generated risk assessment
                      </p>
                      <RiskBadge riskLevel={results.metadata.aiInsights.riskLevel} />
                    </div>
                    <p className="text-sm text-indigo-900">{results.metadata.aiInsights.summary}</p>
                    {results.metadata.aiInsights.confidenceStatement && (
                      <p className="text-xs text-indigo-700">{results.metadata.aiInsights.confidenceStatement}</p>
                    )}
                    <ul className="space-y-1 text-sm text-indigo-900">
                      {results.metadata.aiInsights.recommendedActions?.map((action) => (
                        <li key={action} className="flex items-start">
                          <Zap className="w-4 h-4 mr-2 mt-0.5" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-indigo-500">
                      Generated via {results.metadata.aiInsights.provider?.toUpperCase() || 'AI service'} on{' '}
                      {formatDate(results.metadata.aiInsights.generatedAt)}
                    </p>
                  </div>
                )}
                {!results.metadata.aiInsights && (
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
                    <p className="text-xs font-medium text-indigo-800 uppercase tracking-wide">Suggested next steps</p>
                    <ul className="mt-2 space-y-1 text-sm text-indigo-800">
                      {results.metadata.recommendedActions.map((action) => (
                        <li key={action} className="flex items-start">
                          <Zap className="w-4 h-4 mr-2 mt-0.5" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Potential matches</h2>
              <span className="text-sm text-gray-500">
                {results.matches.length} result{results.matches.length !== 1 ? 's' : ''} detected
              </span>
            </div>
            <div className="space-y-4">
              {results.matches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReverseImageSearch;
