import { ASTNode, OptimizationSuggestion } from '../types';

export function analyzeConstantFolding(ast: ASTNode | null): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];

  function traverse(node: ASTNode | null) {
    if (!node) return;
    if (node.type === 'BinaryExpression') {
      if (node.left.type === 'Literal' && node.right.type === 'Literal') {
        const leftVal = Number(node.left.value);
        const rightVal = Number(node.right.value);
        let result: number | null = null;
        
        switch (node.operator) {
          case '+': result = leftVal + rightVal; break;
          case '-': result = leftVal - rightVal; break;
          case '*': result = leftVal * rightVal; break;
          case '/': if (rightVal !== 0) result = leftVal / rightVal; break;
        }

        if (result !== null) {
          suggestions.push({
            id: `const-fold-${node.line}`,
            type: 'Constant Folding',
            title: 'Constant Folding Opportunity',
            description: `The expression \`${node.left.raw} ${node.operator} ${node.right.raw}\` only contains constants and can be evaluated at compile-time to \`${result}\`.`,
            line: node.line,
            severity: 'medium',
            beforeCode: `${node.left.raw} ${node.operator} ${node.right.raw}`,
            afterCode: `${result}`,
            node,
            originalText: `${node.left.raw} ${node.operator} ${node.right.raw}`
          });
        }
      }
    }

    // Recursively check children
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
