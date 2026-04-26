import { ASTNode, OptimizationSuggestion } from '../types';

export function analyzeLoopInvariant(ast: ASTNode | null): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];

  function traverse(node: ASTNode | null) {
    if (!node) return;
    
    if (node.type === 'WhileStatement' || node.type === 'ForStatement') {
      // Very basic LICM check: look for binary expressions in the body that don't depend on the loop condition
      // A robust implementation would need def-use chains. This is a heuristic for demonstration.
      let loopVars = ['i', 'j', 'k', 'idx'];
      if (node.type === 'ForStatement' && node.init && node.init.type === 'VariableDeclaration') {
        loopVars.push(node.init.name);
      }

      const body = node.body.type === 'BlockStatement' ? node.body.body : [node.body];
      
      const findInvariant = (expr: any): any => {
        if (!expr) return null;
        if (expr.type === 'BinaryExpression') {
          // If both are identifiers but not loop vars, or literals
          const leftIsInv = (expr.left.type === 'Identifier' && !loopVars.includes(expr.left.name)) || expr.left.type === 'Literal';
          const rightIsInv = (expr.right.type === 'Identifier' && !loopVars.includes(expr.right.name)) || expr.right.type === 'Literal';
          
          if (leftIsInv && rightIsInv && expr.left.type !== 'Literal' && expr.right.type !== 'Literal') {
             return expr; // Found a non-trivial invariant binary expression (like x * y)
          }
          
          const leftRes = findInvariant(expr.left);
          if (leftRes) return leftRes;
          return findInvariant(expr.right);
        }
        return null;
      };

      for (const stmt of body) {
        if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'AssignmentExpression') {
          const inv = findInvariant(stmt.expression.right);
          if (inv) {
             suggestions.push({
               id: `licm-${stmt.line}`,
               type: 'Loop-Invariant Code Motion',
               title: 'Loop Invariant Computation',
               description: `The computation here does not depend on the loop's state. Hoist it outside the loop to avoid recalculating it every iteration.`,
               line: stmt.line,
               severity: 'high',
               beforeCode: `// Loop code\n  ... ${inv.left.name} ${inv.operator} ${inv.right.name} ...`,
               afterCode: `// Hoisted`,
               node: stmt,
               targetLine: node.line,
               originalText: `${inv.left.name} ${inv.operator} ${inv.right.name}`
             });
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
