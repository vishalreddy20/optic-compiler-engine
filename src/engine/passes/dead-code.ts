import { ASTNode, CFGNode, OptimizationSuggestion } from '../types';

export function analyzeDeadCode(cfg: CFGNode[], ast: ASTNode | null): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];
  
  if (!ast || cfg.length === 0) return suggestions;

  for (const node of cfg) {
    if (!node.isReachable && !node.isExit && node.statements.length > 0) {
      // Find the first statement in the unreachable block
      const firstStmt = node.statements[0];
      const lastStmt = node.statements[node.statements.length - 1];
      suggestions.push({
        id: `dead-code-${node.id}`,
        type: 'Dead Code Elimination',
        title: 'Unreachable Code Detected',
        description: 'This code block can never be executed based on the control flow graph. It should be removed to reduce binary size and confusion.',
        line: 'line' in firstStmt && firstStmt.line ? firstStmt.line : 0,
        severity: 'high',
        beforeCode: '// Unreachable statements...',
        afterCode: '// Removed',
        startLine: 'line' in firstStmt && firstStmt.line ? firstStmt.line : 0,
        endLine: 'line' in lastStmt && lastStmt.line ? lastStmt.line : 0
      });
    }
  }

  return suggestions;
}
