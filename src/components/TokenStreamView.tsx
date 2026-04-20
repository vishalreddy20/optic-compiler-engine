import { Token } from '../engine/types';

interface TokenStreamViewProps {
  tokens: Token[];
}

export function TokenStreamView({ tokens }: TokenStreamViewProps) {
  const getTokenColor = (type: string) => {
    switch (type) {
      case 'KEYWORD': return 'text-purple-400';
      case 'IDENTIFIER': return 'text-blue-300';
      case 'INTEGER_LITERAL':
      case 'FLOAT_LITERAL': return 'text-green-400';
      case 'STRING_LITERAL':
      case 'CHAR_LITERAL': return 'text-yellow-300';
      case 'OPERATOR': return 'text-pink-400';
      case 'PUNCTUATION': return 'text-gray-400';
      case 'PREPROCESSOR': return 'text-orange-400';
      case 'COMMENT': return 'text-green-600 italic';
      default: return 'text-white';
    }
  };

  return (
    <div className="p-4 bg-[#0a0e1a] rounded-lg border border-white/10 h-full overflow-y-auto">
      <h3 className="text-[#00d4ff] font-semibold mb-4 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
        Lexer Token Stream
      </h3>
      <div className="flex flex-wrap gap-2">
        {tokens.filter(t => t.type !== 'EOF').map((token, i) => (
          <div 
            key={`${i}-${token.line}-${token.column}`}
            className="flex flex-col bg-black/40 px-2 py-1 rounded text-xs border border-white/5 hover:border-[#00d4ff]/50 transition-colors"
            title={`Line ${token.line}, Col ${token.column}`}
          >
            <span className="text-gray-500 text-[10px] uppercase tracking-wider">{token.type}</span>
            <span className={`font-mono ${getTokenColor(token.type)}`}>{token.value}</span>
          </div>
        ))}
      </div>
      {tokens.length === 0 && (
        <div className="text-gray-500 text-sm text-center mt-10">Awaiting input...</div>
      )}
    </div>
  );
}
