import { useState, useCallback } from 'react';
import axios from 'axios';
import { 
  Globe, 
  Search, 
  Download, 
  Table as TableIcon, 
  Loader2, 
  AlertCircle,
  ExternalLink,
  Github,
  CheckCircle2,
  FileSpreadsheet,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Typing for API responses
interface TableData {
  table_index: number;
  title: string;
  row_count: number;
  col_count: number;
  columns: string[];
  preview: Record<string, any>[];
}

interface ExtractResponse {
  url: string;
  table_count: number;
  tables: TableData[];
  warning?: string;
}

export default function App() {
  // State
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<ExtractResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTableIdx, setActiveTableIdx] = useState(0);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  // Handlers
  const handleExtract = async () => {
    if (!url) return;
    setIsLoading(true);
    setError(null);
    setData(null);
    
    try {
      const response = await axios.post<ExtractResponse>('/api/extract', { url });
      setData(response.data);
      if (response.data.tables.length > 0) {
        setActiveTableIdx(0);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to connect to the server. Check backend status.';
      setError(Array.isArray(msg) ? msg[0].msg : msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (format: 'csv' | 'excel') => {
    if (!data) return;
    setDownloadingFormat(format);
    try {
      const downloadUrl = `/api/download?url=${encodeURIComponent(data.url)}&table_index=${activeTableIdx}&format=${format}`;
      // Direct window location for trigger download
      window.location.href = downloadUrl;
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setTimeout(() => setDownloadingFormat(null), 1000);
    }
  };

  const selectedTable = data?.tables[activeTableIdx];

  return (
    <div className="min-h-screen selection:bg-royal-500/30 selection:text-royal-200">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#020617]">
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-royal-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-blue-900/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 md:py-24">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16 space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-royal-500/30 bg-royal-500/10 text-royal-400 text-sm font-medium mb-2">
            <CheckCircle2 size={14} />
            <span>AI-Powered Extraction</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
            Table Extractor <span className="text-royal-500">AI</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Instantly turn any website's tabular data into clean CSV or Excel files. 
            No more manual copy-pasting.
          </p>
        </motion.div>

        {/* Input Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative max-w-2xl mx-auto glass p-2 rounded-2xl border-royal-400/20 shadow-2xl mb-12 group"
        >
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-royal-400 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Enter website URL (e.g., wikipedia.org/wiki/List_of_cities)" 
                className="w-full bg-transparent border-none focus:ring-0 pl-12 pr-4 py-4 text-slate-200 placeholder:text-slate-600 outline-none"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
              />
            </div>
            <button 
              onClick={handleExtract}
              disabled={isLoading || !url}
              className="bg-royal-600 hover:bg-royal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] active:scale-95"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <Search size={20} />}
              <span>Extract</span>
            </button>
          </div>
        </motion.div>

        {/* Error State */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto mb-8 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3"
            >
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <p className="text-sm font-medium">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results State */}
        <AnimatePresence>
          {data && (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Warnings */}
              {data.warning && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 rounded-xl text-sm flex gap-2 items-center">
                  <AlertCircle size={14} /> {data.warning}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar: Table Selection */}
                <div className="space-y-4">
                  <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider px-2">
                    Detected Tables ({data.table_count})
                  </h3>
                  <div className="space-y-2">
                    {data.tables.map((tbl, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveTableIdx(i)}
                        className={cn(
                          "w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group",
                          activeTableIdx === i 
                            ? "bg-royal-600/20 border-royal-500 text-royal-200" 
                            : "bg-slate-900/40 border-white/5 text-slate-500 hover:border-white/10 hover:bg-slate-800/40"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-sm",
                            activeTableIdx === i ? "bg-royal-500 text-white" : "bg-slate-800 text-slate-500"
                          )}>
                            {i + 1}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{tbl.title}</p>
                            <p className="text-[10px] opacity-60">{tbl.row_count} rows • {tbl.col_count} cols</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className={cn("transition-transform", activeTableIdx === i ? "rotate-0 text-royal-400" : "-rotate-90 opacity-0 group-hover:opacity-100")} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main: Table Preview & Actions */}
                <div className="lg:col-span-3 space-y-6">
                  {selectedTable ? (
                    <>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h2 className="text-2xl font-bold flex items-center gap-2">
                            <TableIcon className="text-royal-500" />
                            {selectedTable.title} Preview
                          </h2>
                          <p className="text-slate-500 text-sm">Showing first {selectedTable.preview.length} rows</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleDownload('csv')}
                            className="flex-1 md:flex-none border border-royal-500/30 hover:bg-royal-500/10 text-royal-300 font-medium px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                          >
                            {downloadingFormat === 'csv' ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            CSV
                          </button>
                          <button 
                            onClick={() => handleDownload('excel')}
                            className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap shadow-lg shadow-emerald-900/20"
                          >
                            {downloadingFormat === 'excel' ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
                            Excel
                          </button>
                        </div>
                      </div>

                      <div className="glass rounded-2xl overflow-hidden border-white/5">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm border-collapse">
                            <thead>
                              <tr className="bg-slate-800/50 border-b border-white/5">
                                {selectedTable.columns.map((col, i) => (
                                  <th key={i} className="px-6 py-4 font-bold text-slate-300 whitespace-nowrap">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {selectedTable.preview.map((row, i) => (
                                <tr key={i} className="hover:bg-white/5 transition-colors group">
                                  {selectedTable.columns.map((col, j) => (
                                    <td key={j} className="px-6 py-4 text-slate-400 group-hover:text-slate-200 truncate max-w-[200px]">
                                      {row[col] || <span className="opacity-20 italic font-light">—</span>}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="h-64 glass rounded-2xl flex flex-col items-center justify-center text-slate-500 space-y-2">
                       <TableIcon size={48} className="opacity-20" />
                       <p>Select a table to see preview</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!data && !isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 pointer-events-none"
          >
            <div className="flex justify-center gap-8 opacity-10">
              <TableIcon size={120} />
              <Search size={120} />
              <Globe size={120} />
            </div>
            <p className="mt-8 text-slate-600 font-medium">Ready to extract your first dataset?</p>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 mt-20">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-royal-600 flex items-center justify-center font-bold">T</div>
            <span className="font-bold tracking-tight">TableExtractor AI</span>
          </div>
          <div className="text-slate-500 text-sm">
            Built with React, FastAPI & BeautifulSoup.
          </div>
          <div className="flex items-center gap-6 text-slate-400">
            <a href="#" className="hover:text-white transition-colors flex items-center gap-2">
              <Github size={18} /> Code
            </a>
            <a href="#" className="hover:text-white transition-colors flex items-center gap-2 text-royal-400">
              <ExternalLink size={18} /> Live Demo
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
