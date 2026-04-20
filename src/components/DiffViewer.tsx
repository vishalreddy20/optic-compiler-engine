
interface DiffViewerProps {
  beforeCode: string;
  afterCode: string;
}

export function DiffViewer({ beforeCode, afterCode }: DiffViewerProps) {
  const beforeLines = beforeCode.split('\\n');
  const afterLines = afterCode.split('\\n');
  
  // Very simple diff just for visualization in the suggestion card
  
  return (
    <div className="grid grid-cols-2 gap-4 mt-4 font-mono text-xs">
      <div className="bg-red-900/20 border border-red-900/50 rounded overflow-hidden">
        <div className="bg-red-900/40 px-2 py-1 text-red-400 font-semibold border-b border-red-900/50">Before</div>
        <div className="p-2 overflow-x-auto">
          {beforeLines.map((line, i) => (
             <div key={i} className="text-red-300 line-through opacity-80">{line || ' '}</div>
          ))}
        </div>
      </div>
      <div className="bg-green-900/20 border border-green-900/50 rounded overflow-hidden">
        <div className="bg-green-900/40 px-2 py-1 text-green-400 font-semibold border-b border-green-900/50">After</div>
        <div className="p-2 overflow-x-auto">
          {afterLines.map((line, i) => (
             <div key={i} className="text-green-300">{line || ' '}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
