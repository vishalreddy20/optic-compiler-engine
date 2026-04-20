import { AnalysisReport } from '../engine/types';

interface MetricsPanelProps {
  metrics: AnalysisReport['metrics'];
}

export function MetricsPanel({ metrics }: MetricsPanelProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <MetricCard label="Tokens Parsed" value={metrics.tokensCount} icon="M4 6h16M4 12h16M4 18h7" />
      <MetricCard label="AST Nodes" value={metrics.astNodesCount} icon="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4z" />
      <MetricCard label="CFG Nodes" value={metrics.cfgNodesCount} icon="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      <MetricCard label="Analysis Time" value={`${metrics.analysisTimeMs}ms`} icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      <MetricCard label="Lines of Code" value={metrics.linesOfCode} icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      <MetricCard label="Cyclomatic Cpx" value={metrics.cyclomaticComplexity} icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      <MetricCard label="Reachable Blks" value={metrics.reachableBlocks} color="text-green-400" icon="M5 13l4 4L19 7" />
      <MetricCard label="Dead Blocks" value={metrics.deadBlocks} color="text-red-400" icon="M6 18L18 6M6 6l12 12" />
    </div>
  );
}

function MetricCard({ label, value, icon, color = 'text-[#00d4ff]' }: { label: string, value: string | number, icon: string, color?: string }) {
  return (
    <div className="bg-[#0a0e1a]/80 border border-white/5 rounded-lg p-3 flex items-center gap-3">
      <div className={`p-2 bg-black/40 rounded-md ${color}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon}></path>
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-gray-400 text-[10px] uppercase tracking-wider truncate" title={label}>{label}</div>
        <div className="text-white font-mono text-lg font-bold">{value}</div>
      </div>
    </div>
  );
}
