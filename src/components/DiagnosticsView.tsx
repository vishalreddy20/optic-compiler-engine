import { AnalysisReport } from '../engine/types';
import { OptimizationCard } from './OptimizationCard';
import { MetricsPanel } from './MetricsPanel';

interface DiagnosticsViewProps {
  report: AnalysisReport | null;
}

export function DiagnosticsView({ report }: DiagnosticsViewProps) {
  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <svg className="w-16 h-16 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        <p className="text-lg">Awaiting code analysis...</p>
        <p className="text-sm mt-2">Type in the editor to see real-time suggestions</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pr-2 scrollbar-hide">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <svg className="w-6 h-6 text-[#00d4ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Compiler Diagnostics
        </h2>
      </div>

      <MetricsPanel metrics={report.metrics} />

      {report.errors.length > 0 && (
        <div className="mb-6 space-y-3">
          <h3 className="text-red-400 font-semibold flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Compilation Errors ({report.errors.length})
          </h3>
          {report.errors.map((error, idx) => (
            <div key={idx} className="bg-red-900/20 border border-red-900/50 rounded-lg p-3 text-red-300 text-sm flex gap-3">
               <span className="font-mono text-red-500 opacity-80">
                 {error.line ? `[${error.line}:${error.column || 0}]` : '[SYS]'}
               </span>
               <div>
                 <strong className="block text-red-400">Error</strong>
                 {error.message}
               </div>
            </div>
          ))}
        </div>
      )}

      {report.suggestions.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-green-400 font-semibold flex items-center gap-2">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Optimization Opportunities ({report.suggestions.length})
          </h3>
          {report.suggestions.map((suggestion) => (
            <OptimizationCard key={suggestion.id} suggestion={suggestion} />
          ))}
        </div>
      ) : (
        report.errors.length === 0 && (
          <div className="text-center p-8 bg-[#111827] border border-white/5 rounded-lg mt-6">
            <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-white">Code is optimal!</h3>
            <p className="text-gray-400 text-sm mt-1">No static optimization opportunities detected.</p>
          </div>
        )
      )}
    </div>
  );
}
