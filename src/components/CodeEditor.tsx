import Editor from 'react-simple-code-editor';
// @ts-ignore
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-c';
import 'prismjs/themes/prism-tomorrow.css';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  isAnalyzing?: boolean;
}

const SAMPLE_CODES = [
  {
    name: 'Dead Code',
    code: `int main() {
    int x = 10;
    return x;
    int y = 20; // Dead code
}`
  },
  {
    name: 'Constant Folding',
    code: `int calculate() {
    int a = 5 + 3 * 2;
    return a;
}`
  },
  {
    name: 'Unused Variables',
    code: `void process() {
    int used = 100;
    int unused_var = 42;
    printf("%d", used);
}`
  },
  {
    name: 'CSE',
    code: `int compute(int x, int y) {
    int a = x * y + 10;
    int b = x * y + 20;
    return a + b;
}`
  },
  {
    name: 'LICM',
    code: `void loop() {
    int i = 0;
    int x = 10;
    int y = 20;
    while (i < 100) {
        int z = x + y; // Invariant
        i = i + 1;
    }
}`
  }
];

export function CodeEditor({ code, onChange, isAnalyzing }: CodeEditorProps) {
  return (
    <div className="flex flex-col h-full bg-[#111827] rounded-lg border border-white/10 overflow-hidden shadow-2xl">
      <div className="bg-[#0a0e1a] px-4 py-3 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="ml-2 text-sm text-gray-400 font-mono">source.c</span>
        </div>
        <div className="flex items-center gap-3">
          <select 
            className="bg-black/50 border border-white/10 text-white text-xs rounded px-2 py-1 outline-none focus:border-[#00d4ff]"
            onChange={(e) => {
              if (e.target.value === "") {
                onChange("");
                return;
              }
              const selected = SAMPLE_CODES.find(s => s.name === e.target.value);
              if (selected) onChange(selected.code);
            }}
            defaultValue=""
          >
            <option value="">Load Sample...</option>
            {SAMPLE_CODES.map(s => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
          {isAnalyzing && (
             <span className="text-[#00d4ff] text-xs font-mono animate-pulse">Analyzing...</span>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto relative">
        <Editor
          value={code}
          onValueChange={onChange}
          highlight={code => highlight(code, languages.c, 'c')}
          padding={20}
          className="font-mono text-[14px] min-h-full"
          style={{
            backgroundColor: '#111827',
            color: '#e2e8f0',
            fontFamily: '"Fira Code", "JetBrains Mono", monospace',
          }}
        />
      </div>
    </div>
  );
}
