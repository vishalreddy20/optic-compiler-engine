import { OptimizationSuggestion, ASTNode } from './types';

export function applyOptimizations(sourceCode: string, suggestions: OptimizationSuggestion[], _ast: ASTNode | null): string {
  if (!suggestions || suggestions.length === 0) return sourceCode;

  let lines = sourceCode.split('\n');

  // Process suggestions sorted by line number DESCENDING
  const sorted = [...suggestions].sort((a, b) => {
    const lineA = a.line || a.startLine || 0;
    const lineB = b.line || b.startLine || 0;
    return lineB - lineA;
  });

  let invCounter = 0;

  for (const s of sorted) {
    try {
      if (s.type === 'Constant Folding' && s.originalText && s.afterCode) {
        const l = s.line - 1;
        if (l >= 0 && l < lines.length) {
          lines[l] = lines[l].replace(s.originalText, s.afterCode);
        }
      } else if (s.type === 'Dead Code Elimination' && s.startLine && s.endLine) {
        const start = s.startLine - 1;
        const end = s.endLine - 1;
        if (start >= 0 && end < lines.length) {
          const indentMatch = lines[start].match(/^\s*/);
          const indent = indentMatch ? indentMatch[0] : '';
          lines.splice(start, end - start + 1);
          lines.splice(start, 0, `${indent}// [Dead code removed by optimizer]`);
        }
      } else if (s.type === 'Unused Variable Detection' && s.hash) {
        const l = s.line - 1;
        if (l >= 0 && l < lines.length) {
          const lineText = lines[l];
          const indentMatch = lineText.match(/^\s*/);
          const indent = indentMatch ? indentMatch[0] : '';
          
          if (lineText.includes('(') && lineText.includes('=')) {
            // Function call side effect
            const parts = lineText.split('=');
            if (parts.length > 1) {
              const rhs = parts.slice(1).join('=').trim();
              lines[l] = `${indent}${rhs} // [Unused variable '${s.hash}' removed by optimizer]`;
            }
          } else {
            lines.splice(l, 1);
            lines.splice(l, 0, `${indent}// [Unused variable '${s.hash}' removed by optimizer]`);
          }
        }
      } else if (s.type === 'Common Subexpression Elimination' && s.hash && s.nodes) {
        if (s.nodes.length > 0) {
          const firstLine = (s.nodes[0] as any).line - 1;
          const tempName = `__opt_${Math.abs(hashString(s.hash)).toString(16)}`;
          
          let maxLine = 0;
          for (const n of s.nodes) {
            const nl = (n as any).line - 1;
            if (nl > maxLine) maxLine = nl;
            if (nl >= 0 && nl < lines.length) {
              const unParenHash = s.hash.replace(/^\((.*)\)$/, '$1');
              lines[nl] = lines[nl].replace(s.hash, tempName);
              lines[nl] = lines[nl].replace(`(${s.hash})`, tempName);
              lines[nl] = lines[nl].replace(unParenHash, tempName);
            }
          }
          
          if (firstLine >= 0 && firstLine < lines.length) {
            const indentMatch = lines[firstLine].match(/^\s*/);
            const indent = indentMatch ? indentMatch[0] : '';
            lines.splice(firstLine, 0, `${indent}auto ${tempName} = ${s.hash};`);
          }
        }
      } else if (s.type === 'Loop-Invariant Code Motion' && s.targetLine && s.node) {
        const nodeLine = s.line - 1;
        const target = s.targetLine - 1;
        
        if (nodeLine >= 0 && target >= 0 && nodeLine < lines.length && target < lines.length) {
          const stmtText = lines[nodeLine].trim();
          const varName = `__inv_${invCounter++}`;
          
          let expressionToHoist = s.originalText || '';
          if (!expressionToHoist) {
             if (stmtText.includes('=')) {
               const parts = stmtText.split('=');
               expressionToHoist = parts.slice(1).join('=').trim();
               if (expressionToHoist.endsWith(';')) expressionToHoist = expressionToHoist.slice(0, -1);
             } else {
               expressionToHoist = stmtText;
             }
          }

          // Replace inside loop
          if (s.originalText) {
             lines[nodeLine] = lines[nodeLine].replace(s.originalText, varName);
             lines[nodeLine] = lines[nodeLine].replace(`(${s.originalText})`, varName);
          } else {
             const nodeIndentMatch = lines[nodeLine].match(/^\s*/);
             const nodeIndent = nodeIndentMatch ? nodeIndentMatch[0] : '';
             lines[nodeLine] = `${nodeIndent}${stmtText.split('=')[0]} = ${varName};`;
          }
          
          // Insert before loop
          const targetIndentMatch = lines[target].match(/^\s*/);
          const targetIndent = targetIndentMatch ? targetIndentMatch[0] : '';
          lines.splice(target, 0, `${targetIndent}auto ${varName} = ${expressionToHoist};`);
        }
      }
    } catch (e) {
      console.warn(`Failed to apply optimization ${s.id}:`, e);
    }
  }

  return lines.join('\n');
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}
