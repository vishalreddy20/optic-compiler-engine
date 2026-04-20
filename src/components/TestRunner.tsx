import { useState, useEffect } from 'react';
import { analyzeCode } from '../engine/optimizer';

const TESTS = [
  {
    name: 'Constant Folding Test',
    code: `int main() { return 5 + 3; }`,
    verify: (report: any) => report.suggestions.some((s: any) => s.type === 'CONSTANT_FOLDING')
  },
  {
    name: 'Unused Variable Test',
    code: `int main() { int y = 10; return 0; }`,
    verify: (report: any) => report.suggestions.some((s: any) => s.type === 'UNUSED_VARIABLE' && s.title.includes('y'))
  },
  {
    name: 'Dead Code Test',
    code: `int main() { return 0; int z = 5; }`,
    verify: (report: any) => report.suggestions.some((s: any) => s.type === 'DEAD_CODE')
  },
  {
    name: 'CFG BFS Test',
    code: `int main() { if (1) { return 0; } else { return 1; } }`,
    verify: (report: any) => report.cfg && report.cfg.nodes.length > 2
  }
];

export function TestRunner() {
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    const res = TESTS.map(t => {
      try {
        const report = analyzeCode(t.code);
        const passed = t.verify(report);
        return { name: t.name, passed, errors: report.errors };
      } catch (e: any) {
        return { name: t.name, passed: false, error: e.message };
      }
    });
    setResults(res);
  }, []);

  return (
    <div className="p-8 bg-black min-h-screen text-white font-mono">
      <h1 className="text-2xl text-[#00d4ff] mb-6">Engine Test Runner</h1>
      <div className="space-y-4">
        {results.map((r, i) => (
          <div key={i} className={`p-4 border ${r.passed ? 'border-green-500 bg-green-900/20' : 'border-red-500 bg-red-900/20'} rounded`}>
            <h3 className="font-bold flex items-center gap-2">
              {r.passed ? '✅' : '❌'} {r.name}
            </h3>
            {!r.passed && r.errors && (
              <pre className="text-red-400 mt-2 text-xs">{JSON.stringify(r.errors, null, 2)}</pre>
            )}
            {!r.passed && r.error && (
              <p className="text-red-400 mt-2 text-xs">{r.error}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
