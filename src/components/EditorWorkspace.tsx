import { useState } from 'react';
import { CodeEditor } from './CodeEditor';
import { DiagnosticsView } from './DiagnosticsView';
import { TokenStreamView } from './TokenStreamView';
import { ASTViewer } from './ASTViewer';
import { CFGViewer } from './CFGViewer';
import { ASTCompareView } from './ASTCompareView';
import { OptimizedCodeView } from './OptimizedCodeView';
import { AnalysisReport } from '../engine/types';

interface EditorWorkspaceProps {
  code: string;
  setCode: (code: string) => void;
  report: AnalysisReport | null;
  isAnalyzing: boolean;
}

export function EditorWorkspace({ code, setCode, report, isAnalyzing }: EditorWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'tokens'|'ast'|'cfg'|'compare'|'optimized'>('ast');

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top Section: Massive Full-Width Visualizer Hero Area */}
      <div className="w-full h-[500px] flex flex-col gap-4">
        <div className="flex bg-[#111827] rounded-lg border border-white/5 p-1 gap-1 shrink-0 w-fit mx-auto shadow-lg overflow-x-auto max-w-full">
          <button 
            className={`px-8 py-2 text-sm rounded-md transition-colors font-medium whitespace-nowrap ${activeTab === 'tokens' ? 'bg-[#00d4ff]/20 text-[#00d4ff]' : 'text-gray-400 hover:bg-white/5'}`}
            onClick={() => setActiveTab('tokens')}
          >
            Tokens
          </button>
          <button 
            className={`px-8 py-2 text-sm rounded-md transition-colors font-medium whitespace-nowrap ${activeTab === 'ast' ? 'bg-[#00d4ff]/20 text-[#00d4ff]' : 'text-gray-400 hover:bg-white/5'}`}
            onClick={() => setActiveTab('ast')}
          >
            AST
          </button>
          <button 
            className={`px-8 py-2 text-sm rounded-md transition-colors font-medium whitespace-nowrap ${activeTab === 'cfg' ? 'bg-[#00d4ff]/20 text-[#00d4ff]' : 'text-gray-400 hover:bg-white/5'}`}
            onClick={() => setActiveTab('cfg')}
          >
            CFG
          </button>
          <button 
            className={`px-8 py-2 text-sm rounded-md transition-colors font-medium whitespace-nowrap ${activeTab === 'compare' ? 'bg-[#00d4ff]/20 text-[#00d4ff]' : 'text-gray-400 hover:bg-white/5'}`}
            onClick={() => setActiveTab('compare')}
          >
            AST Compare
          </button>
          <button 
            className={`px-8 py-2 text-sm rounded-md transition-colors font-medium whitespace-nowrap ${activeTab === 'optimized' ? 'bg-[#00d4ff]/20 text-[#00d4ff]' : 'text-gray-400 hover:bg-white/5'}`}
            onClick={() => setActiveTab('optimized')}
          >
            Optimized Code
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden bg-[#0a0e1a] rounded-xl border border-white/10 shadow-2xl relative">
          {activeTab === 'tokens' && <TokenStreamView tokens={report?.tokens || []} />}
          {activeTab === 'ast' && <ASTViewer ast={report?.ast || null} />}
          {activeTab === 'cfg' && <CFGViewer cfg={report?.cfg || null} />}
          {activeTab === 'compare' && <ASTCompareView beforeAST={report?.ast || null} afterAST={report?.afterAST || null} suggestions={report?.suggestions || []} />}
          {activeTab === 'optimized' && report && <OptimizedCodeView originalCode={code} report={report} onApply={setCode} />}
        </div>
      </div>

      {/* Bottom Section: Editor & Diagnostics Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
        {/* Editor Panel */}
        <div className="h-full">
          <CodeEditor 
            code={code} 
            onChange={setCode} 
            isAnalyzing={isAnalyzing} 
          />
        </div>

        {/* Diagnostics Panel */}
        <div className="h-full bg-[#111827] rounded-xl border border-white/5 p-6 shadow-xl overflow-hidden shrink-0">
          <DiagnosticsView report={report} />
        </div>
      </div>
    </div>
  );
}
