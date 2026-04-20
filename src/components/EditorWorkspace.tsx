import { useState } from 'react';
import { CodeEditor } from './CodeEditor';
import { DiagnosticsView } from './DiagnosticsView';
import { TokenStreamView } from './TokenStreamView';
import { ASTViewer } from './ASTViewer';
import { CFGViewer } from './CFGViewer';
import { AnalysisReport } from '../engine/types';

interface EditorWorkspaceProps {
  code: string;
  setCode: (code: string) => void;
  report: AnalysisReport | null;
  isAnalyzing: boolean;
}

export function EditorWorkspace({ code, setCode, report, isAnalyzing }: EditorWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'tokens'|'ast'|'cfg'>('ast');

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top Section: Massive Full-Width Visualizer Hero Area */}
      <div className="w-full h-[500px] flex flex-col gap-4">
        <div className="flex bg-[#111827] rounded-lg border border-white/5 p-1 gap-1 shrink-0 w-fit mx-auto shadow-lg">
          <button 
            className={`px-12 py-2 text-sm rounded-md transition-colors font-medium ${activeTab === 'ast' ? 'bg-[#00d4ff]/20 text-[#00d4ff]' : 'text-gray-400 hover:bg-white/5'}`}
            onClick={() => setActiveTab('ast')}
          >
            Abstract Syntax Tree
          </button>
          <button 
            className={`px-12 py-2 text-sm rounded-md transition-colors font-medium ${activeTab === 'cfg' ? 'bg-[#00d4ff]/20 text-[#00d4ff]' : 'text-gray-400 hover:bg-white/5'}`}
            onClick={() => setActiveTab('cfg')}
          >
            Control Flow Graph
          </button>
          <button 
            className={`px-12 py-2 text-sm rounded-md transition-colors font-medium ${activeTab === 'tokens' ? 'bg-[#00d4ff]/20 text-[#00d4ff]' : 'text-gray-400 hover:bg-white/5'}`}
            onClick={() => setActiveTab('tokens')}
          >
            Tokens
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden bg-[#0a0e1a] rounded-xl border border-white/10 shadow-2xl relative">
          {activeTab === 'tokens' && <TokenStreamView tokens={report?.tokens || []} />}
          {activeTab === 'ast' && <ASTViewer ast={report?.ast || null} />}
          {activeTab === 'cfg' && <CFGViewer cfg={report?.cfg || null} />}
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
