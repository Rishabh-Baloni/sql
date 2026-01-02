'use client';

import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { QUESTIONS, Question } from '@/server/practice/questions';

// Since we cannot import from server files in client components directly if they contain node-only code,
// and `questions.ts` is purely data, we can duplicate the interface or just use `any`.
// But ideally, `questions.ts` should be shared or fetched.
// For simplicity in this additive phase, I will hardcode the questions list here OR 
// fetch them from an API if I made one. The prompt says "Hardcode at least 3 SQL questions".
// I'll define the questions constant here as well to avoid server-client import issues in Next.js App Router 
// if the file is not marked 'use client' or safe.
// Actually, let's just create a shared constants file or define it here. 
// Defining it here is safest to avoid import errors.

const PRACTICE_QUESTIONS = [
  {
    id: 1,
    title: 'High Earners',
    description: 'List all employees earning more than 60000. Return all columns.',
  },
  {
    id: 2,
    title: 'Department Average Salary',
    description: 'Find the average salary per department. Return columns: department, avg_salary.',
  },
  {
    id: 3,
    title: 'Managers',
    description: 'List employees whose salary is greater than their manager. Return columns: emp_name, salary.',
  },
];

export default function Home() {
  const [mode, setMode] = useState<'normal' | 'practice'>('normal');
  const [query, setQuery] = useState('SELECT * FROM employee;');
  const [results, setResults] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  // Practice Mode State
  const [currentQuestionId, setCurrentQuestionId] = useState<number>(1);
  const [practiceFeedback, setPracticeFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);

  const runQuery = async () => {
    setLoading(true);
    setError(null);
    setPracticeFeedback(null);
    setResults([]);
    setColumns([]);
    setHasRun(true);

    try {
      let url = '/api/sql';
      let body: any = { query };

      if (mode === 'practice') {
        url = '/api/practice/submit';
        body = { query, questionId: currentQuestionId };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute query');
      }

      if (mode === 'practice') {
        setPracticeFeedback({
          isCorrect: data.isCorrect,
          message: data.message
        });
        // Practice API returns rows/columns in the response as well (from engine.ts logic)
        // engine.ts returns: { isCorrect, message, userRows, userColumns, expectedRows... }
        setResults(data.userRows || []);
        setColumns(data.userColumns || []);
      } else {
        setResults(data.rows || []);
        setColumns(data.columns || []);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = PRACTICE_QUESTIONS.find(q => q.id === currentQuestionId);

  return (
    <main className="flex h-screen flex-col bg-gray-950 text-white">
      <header className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
             <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
             </svg>
             <h1 className="text-xl font-bold tracking-tight">SQL IDE <span className="text-xs font-normal text-gray-500 ml-2">Phase 2</span></h1>
           </div>
           
           {/* Mode Toggle */}
           <div className="flex bg-gray-800 rounded-lg p-1 ml-4">
             <button
               onClick={() => { setMode('normal'); setQuery('SELECT * FROM employee;'); setResults([]); setHasRun(false); setPracticeFeedback(null); }}
               className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${mode === 'normal' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
             >
               Normal
             </button>
             <button
               onClick={() => { setMode('practice'); setQuery(''); setResults([]); setHasRun(false); setPracticeFeedback(null); }}
               className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${mode === 'practice' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
             >
               Practice
             </button>
           </div>
        </div>

        <div className="space-x-3">
            <button 
                onClick={runQuery} 
                disabled={loading}
                className={`${mode === 'practice' ? 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800' : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800'} disabled:cursor-not-allowed px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center gap-2 text-white`}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {loading ? 'Running...' : (mode === 'practice' ? 'Submit Answer' : 'Run Query')}
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
        {/* Left Panel Container */}
        <div className="w-1/2 border-r border-gray-800 flex flex-col bg-[#1e1e1e]">
            
            {/* Practice Question Panel */}
            {mode === 'practice' && (
              <div className="bg-gray-900 border-b border-gray-800 p-4">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-purple-400 font-bold text-sm uppercase tracking-wider">Problem {currentQuestion?.id}</h2>
                  <div className="flex gap-2">
                     <select 
                       className="bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1 text-gray-300"
                       value={currentQuestionId}
                       onChange={(e) => {
                         setCurrentQuestionId(Number(e.target.value));
                         setQuery('');
                         setResults([]);
                         setHasRun(false);
                         setPracticeFeedback(null);
                         setError(null);
                       }}
                     >
                       {PRACTICE_QUESTIONS.map(q => (
                         <option key={q.id} value={q.id}>Problem {q.id}</option>
                       ))}
                     </select>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">{currentQuestion?.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-3">{currentQuestion?.description}</p>
                
                <div className="bg-gray-800/50 rounded p-2 text-xs font-mono text-gray-500">
                  <span className="text-gray-400 font-bold">Schema: </span>
                  employee(emp_id, emp_name, department, salary, manager_id)
                </div>
              </div>
            )}

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
            {/* Feedback Panel */}
            {mode === 'practice' && practiceFeedback && (
              <div className={`p-4 border-b ${practiceFeedback.isCorrect ? 'bg-green-900/20 border-green-900' : 'bg-red-900/20 border-red-900'}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${practiceFeedback.isCorrect ? 'bg-green-600' : 'bg-red-600'}`}>
                    {practiceFeedback.isCorrect ? (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                  </div>
                  <div>
                    <h3 className={`font-bold ${practiceFeedback.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                      {practiceFeedback.isCorrect ? 'Correct Answer!' : 'Incorrect Answer'}
                    </h3>
                    <p className="text-sm text-gray-300">{practiceFeedback.message}</p>
                  </div>
                </div>
              </div>
            )}

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
                            <p className="text-sm mt-2 max-w-xs mx-auto">
                              {mode === 'practice' 
                                ? 'Read the problem statement and write your query.' 
                                : 'Run a query to view the employee table data.'}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </main>
  );
}
