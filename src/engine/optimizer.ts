import { tokenize } from './lexer';
import { parse } from './parser';
import { buildCFG } from './cfg';
import { SymbolTable } from './symbolTable';
import { analyzeDeadCode } from './passes/dead-code';
import { analyzeConstantFolding } from './passes/constant-folding';
import { analyzeUnusedVariables } from './passes/unused-variables';
import { analyzeCommonSubexpressions } from './passes/cse';
import { analyzeLoopInvariant } from './passes/licm';
import { AnalysisReport, CompilerError, OptimizationSuggestion } from './types';

export function analyzeCode(code: string): AnalysisReport {
  const startTime = performance.now();
  const errors: CompilerError[] = [];
  
  // 1. Lexical Analysis
  const tokens = tokenize(code, errors);
  
  // 2. Syntax Analysis (AST Generation)
  const ast = parse(tokens, errors);
  
  // 3. Semantic Analysis (Symbol Table & Scope)
  const symbolTable = new SymbolTable();
  if (ast) {
    symbolTable.analyze(ast);
  }

  // 4. Control Flow Graph
  const cfg = buildCFG(ast);

  // 5. Optimization Passes
  let suggestions: OptimizationSuggestion[] = [];
  
  try {
    suggestions = [
      ...analyzeDeadCode(cfg, ast),
      ...analyzeConstantFolding(ast),
      ...analyzeUnusedVariables(symbolTable),
      ...analyzeCommonSubexpressions(ast),
      ...analyzeLoopInvariant(ast)
    ];
  } catch (e) {
    console.error("Error during optimization passes", e);
  }

  // 6. Metrics Calculation
  const astNodesCount = countASTNodes(ast);
  const reachableBlocks = cfg.filter(n => n.isReachable).length;
  const deadBlocks = cfg.length - reachableBlocks;
  
  // Cyclomatic complexity (E - N + 2P). For a single connected component CFG: edges - nodes + 2
  let edges = 0;
  cfg.forEach(node => { edges += node.successors.length; });
  const cyclomaticComplexity = Math.max(1, edges - cfg.length + 2);

  const analysisTimeMs = Math.round(performance.now() - startTime);

  return {
    tokens,
    ast,
    cfg,
    errors,
    suggestions,
    metrics: {
      analysisTimeMs,
      tokensCount: tokens.length,
      astNodesCount,
      cfgNodesCount: cfg.length,
      cyclomaticComplexity,
      linesOfCode: code.split('\n').length,
      reachableBlocks,
      deadBlocks
    }
  };
}

function countASTNodes(node: any): number {
  if (!node) return 0;
  let count = 1;
  Object.values(node).forEach(child => {
    if (child && typeof child === 'object') {
      if (Array.isArray(child)) {
        child.forEach(c => { count += countASTNodes(c); });
      } else if ('type' in child) {
        count += countASTNodes(child);
      }
    }
  });
  return count;
}
