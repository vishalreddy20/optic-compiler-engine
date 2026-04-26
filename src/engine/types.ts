export enum TokenType {
  KEYWORD = 'KEYWORD',
  IDENTIFIER = 'IDENTIFIER',
  INTEGER_LITERAL = 'INTEGER_LITERAL',
  FLOAT_LITERAL = 'FLOAT_LITERAL',
  STRING_LITERAL = 'STRING_LITERAL',
  OPERATOR = 'OPERATOR',
  PUNCTUATION = 'PUNCTUATION',
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

export interface CompilerError {
  line: number;
  column: number;
  message: string;
}

export interface FunctionParam {
  type: string;
  name: string;
  line: number;
}

export type ASTNode =
  | { type: 'Program'; body: ASTNode[] }
  | { type: 'FunctionDeclaration'; name: string; returnType: string; params: FunctionParam[]; body: ASTNode; line?: number }
  | { type: 'VariableDeclaration'; name: string; varType: string; init: ASTNode | null; line: number }
  | { type: 'BinaryExpression'; operator: string; left: ASTNode; right: ASTNode; line: number }
  | { type: 'AssignmentExpression'; operator: string; left: ASTNode; right: ASTNode; line: number }
  | { type: 'UnaryExpression'; operator: string; argument: ASTNode; line: number }
  | { type: 'UpdateExpression'; operator: string; prefix: boolean; argument: ASTNode; line: number }
  | { type: 'Identifier'; name: string; line: number }
  | { type: 'Literal'; value: any; raw: string; line: number }
  | { type: 'ReturnStatement'; argument: ASTNode | null; line: number }
  | { type: 'IfStatement'; test: ASTNode; consequent: ASTNode; alternate: ASTNode | null; line: number }
  | { type: 'WhileStatement'; test: ASTNode; body: ASTNode; line: number }
  | { type: 'ForStatement'; init: ASTNode | null; condition: ASTNode | null; update: ASTNode | null; body: ASTNode; line: number }
  | { type: 'BlockStatement'; body: ASTNode[]; line: number }
  | { type: 'ExpressionStatement'; expression: ASTNode; line: number }
  | { type: 'CallExpression'; callee: ASTNode; arguments: ASTNode[]; line: number };

export interface CFGNode {
  id: number;
  statements: ASTNode[];
  successors: number[];
  predecessors: number[];
  isEntry?: boolean;
  isExit?: boolean;
  isReachable?: boolean;
}

export type OptimizationSeverity = 'high' | 'medium' | 'low';

export interface OptimizationSuggestion {
  id: string;
  type: string;
  title: string;
  description: string;
  line: number;
  severity: OptimizationSeverity;
  beforeCode: string;
  afterCode: string;
  compilerTheory?: string;
  estimatedSpeedup?: string;
  node?: ASTNode;
  nodes?: ASTNode[];
  startLine?: number;
  endLine?: number;
  targetLine?: number;
  hash?: string;
  originalText?: string;
}

export interface AnalysisReport {
  tokens: Token[];
  ast: ASTNode | null;
  cfg: CFGNode[];
  errors: CompilerError[];
  suggestions: OptimizationSuggestion[];
  metrics: {
    analysisTimeMs: number;
    tokensCount: number;
    astNodesCount: number;
    cfgNodesCount: number;
    cyclomaticComplexity: number;
    linesOfCode: number;
    reachableBlocks: number;
    deadBlocks: number;
  };
  optimizedCode?: string;
  optimizationsApplied?: number;
  afterAST?: ASTNode | null;
}
