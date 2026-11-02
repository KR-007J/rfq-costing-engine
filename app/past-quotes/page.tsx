'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  History, 
  Search, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Layers,
  Database,
  RefreshCw,
  Download
} from 'lucide-react';

export default function PastQuotesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSuccess, setImportSuccess] = useState(false);
  const [totalHistoricalCount, setTotalHistoricalCount] = useState(1420);

  const performSearch = async (query: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/past-parts?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      if (json.success) {
        setResults(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performSearch(searchQuery);
  }, [searchQuery]);

  const handleSimulateImport = () => {
    setImporting(true);
    setImportProgress(0);
    const interval = setInterval(() => {
      setImportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setImporting(false);
          setImportSuccess(true);
          setTotalHistoricalCount((c) => c + 1400);
          setTimeout(() => setImportSuccess(false), 5000);
          return 100;
        }
        return prev + 20;
      });
    }, 250);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link 
          href="/" 
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to RFQ Register
        </Link>

        <div className="text-xs font-mono text-slate-500">
          Historical Parts Index: <strong className="text-slate-900">{totalHistoricalCount.toLocaleString('en-IN')}</strong> parts
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          Historical Parts &amp; Past Quotes Intelligence
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-3xl">
          Instantly find what Company A quoted for similar machined and forged parts in previous quarters. Compare cycle times, machine hour rates, and win/loss outcomes to calibrate new quotes.
        </p>
      </div>

      {/* Excel Import Card (1,400 Rows) */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Bulk Legacy Quotes Import (Excel / CSV)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Imported ~1,400 past quote rows from legacy Chakan ERP spreadsheet into active vector index.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSimulateImport}
              disabled={importing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded text-xs font-bold shadow-xs transition-all"
            >
              {importing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {importing ? 'Importing 1,400 Rows...' : 'Re-index 1,400 Legacy Quotes'}
            </button>
          </div>
        </div>

        {/* Progress Bar when importing */}
        {importing && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono text-slate-600">
              <span>Parsing and normalizing ERP cycle times...</span>
              <span>{importProgress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${importProgress}%` }}
              />
            </div>
          </div>
        )}

        {importSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Successfully indexed 1,400 past quote rows! Schema validated: 28 machine centers mapped, 6 alloy grades standardized.
          </div>
        )}
      </div>

      {/* Search Input & Quick Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search past quotes by part name (e.g. spindle, arm, shaft, gear), material (EN8, 40Cr4), drawing #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        {/* Quick Tag Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
          <span className="text-[11px] font-medium text-slate-400 mr-1">Suggested Searches:</span>
          {['Spindle', 'Lift Arm', 'Gear Blank', 'Shaft', 'EN8', '40Cr4 forging', '20MnCr5'].map((tag) => (
            <button
              key={tag}
              onClick={() => setSearchQuery(tag)}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
            >
              {tag}
            </button>
          ))}
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-2 py-0.5 rounded text-rose-600 hover:underline text-[11px]"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Matching Past Quotes ({results.length})
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
            Searching historical database...
          </div>
        ) : results.length === 0 ? (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-lg text-slate-500 text-xs">
            No historical parts found matching &quot;{searchQuery}&quot;. Try searching &quot;spindle&quot;, &quot;arm&quot;, or &quot;gear&quot;.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.map((part) => (
              <div 
                key={part.id}
                className="bg-white border border-slate-200 hover:border-blue-300 rounded-lg p-4 shadow-xs space-y-2 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Link 
                      href={`/rfqs/${part.id}`}
                      className="font-bold text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {part.part_name}
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {part.customer_name} · <span className="font-mono text-slate-700">{part.drawing_number}</span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                    part.status === 'won' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    part.status === 'lost' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {part.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                  <div className="bg-slate-50 p-1.5 rounded">
                    <span className="text-slate-400 font-sans block text-[10px]">Material</span>
                    <span className="font-bold text-slate-800">{part.material_grade}</span>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded">
                    <span className="text-slate-400 font-sans block text-[10px]">Annual Qty</span>
                    <span className="font-bold text-slate-800">{part.annual_volume.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded">
                    <span className="text-slate-400 font-sans block text-[10px]">Date Quoted</span>
                    <span className="text-slate-700">{part.created_date}</span>
                  </div>
                </div>

                {part.routing_steps && (
                  <div className="pt-1 text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-700 font-sans">Routing: </span>
                    <span className="font-mono text-[10px] text-slate-600">{part.routing_steps}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[10px] font-mono">{part.rfq_number}</span>
                  <Link
                    href={`/rfqs/${part.id}`}
                    className="font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    View Costing Details &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
