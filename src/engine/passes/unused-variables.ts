import { OptimizationSuggestion } from '../types';
import { SymbolTable } from '../symbolTable';

export function analyzeUnusedVariables(symbolTable: SymbolTable): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];
  const unused = symbolTable.getAllUnused();

  for (const sym of unused) {
    suggestions.push({
      id: `unused-var-${sym.name}-${sym.line}`,
      type: 'Unused Variable Detection',
      title: 'Unused Variable',
      description: `The variable \`${sym.name}\` is declared but never read or written to within its scope. It wastes memory and clutters the code.`,
      line: sym.line,
      severity: 'low',
      beforeCode: `${sym.type} ${sym.name};`,
      afterCode: '// Remove declaration',
      hash: sym.name
    });
  }

  return suggestions;
}
