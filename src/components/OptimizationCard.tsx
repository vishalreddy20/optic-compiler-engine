import { useState } from 'react';
import { OptimizationSuggestion } from '../engine/types';
import { DiffViewer } from './DiffViewer';

interface OptimizationCardProps {
  suggestion: OptimizationSuggestion;
}

export function OptimizationCard({ suggestion }: OptimizationCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'MEDIUM': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'LOW': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'DEAD_CODE':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />;
      case 'CONSTANT_FOLDING':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />;
      case 'UNUSED_VARIABLE':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
      case 'CSE':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />;
      case 'LICM':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />;
      default:
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />;
    }
  };

  return (
    <div className="bg-[#111827] border border-white/5 rounded-lg overflow-hidden transition-all hover:border-white/10">
      <div 
        className="p-4 cursor-pointer flex items-start gap-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`p-2 rounded-lg border ${getSeverityColor(suggestion.severity)}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {getTypeIcon(suggestion.type)}
          </svg>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium">{suggestion.title}</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-mono">
                Line {suggestion.line}
              </span>
              <svg 
                className={`w-5 h-5 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          
          <p className="text-gray-400 text-sm mt-1">{suggestion.description}</p>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5 bg-[#0a0e1a]/50">
          <div className="mt-4 p-3 bg-blue-900/10 border border-blue-900/30 rounded text-blue-200 text-sm">
            <strong className="text-blue-300 block mb-1">Compiler Theory:</strong>
            {suggestion.compilerTheory}
          </div>
          
          <DiffViewer beforeCode={suggestion.beforeCode} afterCode={suggestion.afterCode} />

          <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-[#00d4ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Est. Speedup: <span className="text-white">{suggestion.estimatedSpeedup}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
