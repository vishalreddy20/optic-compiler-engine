import { ASTNode, OptimizationSuggestion } from '../types';

export function analyzeLoopInvariant(ast: ASTNode | null): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];

  function traverse(node: ASTNode | null) {
    if (!node) return;
    
    if (node.type === 'WhileStatement') {
      // Very basic LICM check: look for binary expressions in the body that don't depend on the loop condition
      // A robust implementation would need def-use chains. This is a heuristic for demonstration.
      if (node.body.type === 'BlockStatement') {
        for (const stmt of node.body.body) {
          if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'AssignmentExpression') {
            const right = stmt.expression.right;
            if (right.type === 'BinaryExpression' && right.left.type === 'Literal' && right.right.type === 'Literal') {
               suggestions.push({
                 id: `licm-${stmt.line}`,
                 type: 'Loop-Invariant Code Motion',
                 title: 'Loop Invariant Computation',
                 description: `The computation here does not depend on the loop's state. Hoist it outside the loop to avoid recalculating it every iteration.`,
                 line: stmt.line,
                 severity: 'high',
                 beforeCode: `while (...) {\n  // ...\n  x = ${right.left.raw} ${right.operator} ${right.right.raw};\n}`,
                 afterCode: `x = ${right.left.raw} ${right.operator} ${right.right.raw};\nwhile (...) {\n  // ...\n}`
               });
            }
          }
        }
      }
    }

    Object.values(node).forEach(child => {
      if (child && typeof child === 'object') {
        if (Array.isArray(child)) {
          child.forEach(c => traverse(c as ASTNode));
        } else if ('type' in child) {
          traverse(child as ASTNode);
        }
      }
    });
  }

  traverse(ast);
  return suggestions;
}
