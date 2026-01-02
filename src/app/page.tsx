'use client';

import { useState } from 'react';
import Editor from '@monaco-editor/react';

export default function Home() {
  const [query, setQuery] = useState('SELECT * FROM employee;');
  const [results, setResults] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const runQuery = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    setColumns([]);
    setHasRun(true);

    try {
      const res = await fetch('/api/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute query');
      }

      setResults(data.rows || []);
      setColumns(data.columns || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex h-screen flex-col bg-gray-950 text-white">
      <header className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
           <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
           </svg>
           <h1 className="text-xl font-bold tracking-tight">SQL IDE <span className="text-xs font-normal text-gray-500 ml-2">Phase 1</span></h1>
        </div>
        <div className="space-x-3">
            <button 
                onClick={runQuery} 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center gap-2"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {loading ? 'Running...' : 'Run Query'}
            </button>
             <button 
                onClick={() => setQuery('')} 
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2 rounded text-sm font-medium transition-colors"
            >
                Clear
            </button>
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Editor */}
        <div className="w-1/2 border-r border-gray-800 flex flex-col bg-[#1e1e1e]">
            <Editor
                height="100%"
                defaultLanguage="sql"
                theme="vs-dark"
                value={query}
                onChange={(value) => setQuery(value || '')}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    scrollBeyondLastLine: false,
                    padding: { top: 16, bottom: 16 },
                    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                }}
            />
        </div>

        {/* Right: Results */}
        <div className="w-1/2 flex flex-col bg-gray-900">
            {error ? (
                <div className="p-6">
                    <div className="p-4 bg-red-900/20 border border-red-500/50 text-red-200 rounded-lg flex gap-3 items-start">
                        <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <div>
                            <h3 className="font-semibold text-red-100">Execution Error</h3>
                            <p className="mt-1 text-sm opacity-90">{error}</p>
                        </div>
                    </div>
                </div>
            ) : results.length > 0 ? (
                <div className="flex-1 overflow-auto">
                    <table className="min-w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-800 sticky top-0 z-10 shadow-sm">
                            <tr>
                                {columns.map((col) => (
                                    <th key={col} className="px-6 py-3 font-semibold text-gray-300 border-b border-gray-700">
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {results.map((row, i) => (
                                <tr key={i} className="hover:bg-gray-800/50 transition-colors">
                                    {columns.map((col) => (
                                        <td key={col} className="px-6 py-3 text-gray-400 font-mono text-xs">
                                            {row[col] === null ? <span className="text-gray-600 italic">NULL</span> : String(row[col])}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="px-6 py-2 bg-gray-800/50 border-t border-gray-800 text-xs text-gray-500 text-right">
                        {results.length} row{results.length !== 1 ? 's' : ''} returned
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
                    {loading ? (
                        <div className="animate-pulse flex flex-col items-center">
                            <div className="h-4 w-32 bg-gray-800 rounded mb-2"></div>
                            <div className="h-3 w-24 bg-gray-800 rounded"></div>
                        </div>
                    ) : hasRun ? (
                         <div className="text-gray-400">
                            <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4" /></svg>
                            <p>Query returned no results.</p>
                         </div>
                    ) : (
                        <div className="text-gray-400">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                            <p className="text-lg font-medium text-gray-300">Ready to execute SQL</p>
                            <p className="text-sm mt-2 max-w-xs mx-auto">Run a query to view the <code>employee</code> table data.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </main>
  );
}
