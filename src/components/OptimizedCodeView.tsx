import { useMemo } from 'react';
import { AnalysisReport } from '../engine/types';

interface OptimizedCodeViewProps {
  originalCode: string;
  report: AnalysisReport;
  onApply: (optimizedCode: string) => void;
}

export function OptimizedCodeView({ originalCode, report, onApply }: OptimizedCodeViewProps) {
  const { optimizedCode, optimizationsApplied } = report;

  const diffLines = useMemo(() => {
    if (!optimizedCode) return [];
    
    // Very basic LCS line diff
    const origLines = originalCode.split('\n');
    const optLines = optimizedCode.split('\n');
    
    const dp: number[][] = Array(origLines.length + 1).fill(0).map(() => Array(optLines.length + 1).fill(0));
    
    for (let i = 1; i <= origLines.length; i++) {
      for (let j = 1; j <= optLines.length; j++) {
        if (origLines[i-1] === optLines[j-1]) {
          dp[i][j] = dp[i-1][j-1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
        }
      }
    }
    
    let i = origLines.length;
    let j = optLines.length;
    const diff: { type: 'added' | 'removed' | 'unchanged', text: string }[] = [];
    
    while (i > 0 && j > 0) {
      if (origLines[i-1] === optLines[j-1]) {
        diff.unshift({ type: 'unchanged', text: origLines[i-1] });
        i--;
        j--;
      } else if (dp[i-1][j] > dp[i][j-1]) {
        diff.unshift({ type: 'removed', text: origLines[i-1] });
        i--;
      } else {
        diff.unshift({ type: 'added', text: optLines[j-1] });
        j--;
      }
    }
    
    while (i > 0) {
      diff.unshift({ type: 'removed', text: origLines[i-1] });
      i--;
    }
    while (j > 0) {
      diff.unshift({ type: 'added', text: optLines[j-1] });
      j--;
    }
    
    return diff;
  }, [originalCode, optimizedCode]);

  if (!optimizedCode) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No optimizations applied.
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(optimizedCode);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0e1a] text-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-[#111827] border-b border-white/10 shrink-0">
        <h3 className="text-[#10b981] font-semibold flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          {optimizationsApplied} optimizations applied
        </h3>
        <div className="flex gap-2">
          <button 
            onClick={handleCopy}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded text-xs font-medium border border-white/10 transition-colors"
          >
            Copy to Clipboard
          </button>
          <button 
            onClick={() => onApply(optimizedCode)}
            className="px-3 py-1.5 bg-[#00d4ff]/20 hover:bg-[#00d4ff]/30 text-[#00d4ff] rounded text-xs font-medium border border-[#00d4ff]/30 transition-colors"
          >
            Apply to Editor
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 font-mono text-[13px] leading-relaxed">
        {diffLines.map((line, idx) => {
          let className = "px-2 py-0.5 rounded-sm my-0.5 whitespace-pre ";
          if (line.type === 'added') {
            className += "bg-green-500/10 text-green-400";
          } else if (line.type === 'removed') {
            className += "bg-red-500/10 text-red-400 line-through opacity-60";
          } else {
            className += "text-gray-300";
          }
          
          return (
            <div key={idx} className={className}>
              {line.type === 'added' && '+ '}
              {line.type === 'removed' && '- '}
              {line.type === 'unchanged' && '  '}
              {line.text || ' '}
            </div>
          );
        })}
      </div>
    </div>
  );
}
