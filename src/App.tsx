import { useState, useEffect, useRef } from 'react';
import { supabase } from './services/telemetry';
import { analyzeCode } from './engine/optimizer';
import { AnalysisReport } from './engine/types';
import { EditorWorkspace } from './components/EditorWorkspace';
import { TestRunner } from './components/TestRunner';

export default function App() {
  const [code, setCode] = useState('');
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Debug routing
  const isDebug = window.location.search.includes('debug=true');

  useEffect(() => {
    if (!code.trim()) {
      setReport(null);
      setIsAnalyzing(false);
      return;
    }

    setIsAnalyzing(true);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        const newReport = analyzeCode(code);
        setReport(newReport);
        
        // Fire and forget telemetry
        if (newReport.metrics.linesOfCode > 0) {
          saveTelemetry(newReport);
        }
      } catch (err) {
        console.error('Analysis error:', err);
      } finally {
        setIsAnalyzing(false);
      }
    }, 600);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [code]);

  async function saveTelemetry(rep: AnalysisReport) {
    try {
      // Don't wait for it
      supabase.from('analysis_sessions').insert([{
         code_snippet: code,
         diagnostics: rep,
         created_at: new Date().toISOString()
      }]).then(({ error }) => {
         if (error) console.error("Telemetry error", error);
      });
    } catch (e) {
      // Ignore
    }
  }

  if (isDebug) {
    return <TestRunner />;
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <nav className="bg-[#111827] border-b border-white/5 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#00d4ff] to-blue-600 flex items-center justify-center font-bold shadow-[0_0_15px_rgba(0,212,255,0.4)]">
            λ
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Intelligent Code Optimizer
          </h1>
        </div>
        <div className="flex gap-4 text-sm font-mono text-gray-400">
           <div className="flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${
               isAnalyzing 
                 ? 'bg-[#00d4ff] animate-pulse shadow-[0_0_6px_rgba(0,212,255,0.6)]' 
                 : report && report.errors.length > 0 
                   ? 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]' 
                   : 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.4)]'
             }`}></div>
             {isAnalyzing ? 'Analyzing...' : report && report.errors.length > 0 ? `${report.errors.length} Error${report.errors.length > 1 ? 's' : ''}` : 'Ready'}
           </div>
        </div>
      </nav>

      <main className="p-6 w-full max-w-[1920px] mx-auto">
        <EditorWorkspace 
          code={code} 
          setCode={setCode} 
          report={report}
          isAnalyzing={isAnalyzing}
        />
      </main>
    </div>
  );
}
