import { ASTNode } from './types';

const STDLIB_NAMES = new Set([
  'main', 'printf', 'scanf', 'malloc', 'free', 'calloc', 'realloc',
  'strlen', 'strcpy', 'strncpy', 'strcmp', 'strcat', 'memset', 'memcpy',
  'exit', 'abort', 'atoi', 'atof', 'sizeof', 'puts', 'gets', 'getchar', 'putchar',
  'fopen', 'fclose', 'fprintf', 'fscanf', 'fread', 'fwrite',
]);

export interface SymbolInfo {
  name: string;
  type: string;
  line: number;
  isUsed: boolean;
  scopeLevel: number;
  isFunction: boolean;
  isParam: boolean;
}

export class SymbolTable {
  private symbols: Map<string, SymbolInfo[]> = new Map();
  private allDeclaredSymbols: SymbolInfo[] = [];
  private currentScope = 0;

  enterScope() {
    this.currentScope++;
  }

  exitScope() {
    for (const [name, infos] of this.symbols.entries()) {
      const filtered = infos.filter(info => info.scopeLevel < this.currentScope);
      if (filtered.length > 0) {
        this.symbols.set(name, filtered);
      } else {
        this.symbols.delete(name);
      }
    }
    this.currentScope--;
  }

  declare(name: string, type: string, line: number, isFunction = false, isParam = false) {
    const infos = this.symbols.get(name) || [];
    const info = { name, type, line, isUsed: false, scopeLevel: this.currentScope, isFunction, isParam };
    infos.push(info);
    this.allDeclaredSymbols.push(info);
    this.symbols.set(name, infos);
  }

  use(name: string) {
    const infos = this.symbols.get(name);
    if (infos && infos.length > 0) {
      infos[infos.length - 1].isUsed = true;
    }
  }

  getAllUnused(): SymbolInfo[] {
    const unused: SymbolInfo[] = [];
    for (const info of this.allDeclaredSymbols) {
      // Filter out: used symbols, functions, params, stdlib names, underscore-prefixed
      if (info.isUsed) continue;
      if (info.isFunction) continue;
      if (info.isParam) continue;
      if (STDLIB_NAMES.has(info.name)) continue;
      if (info.name.startsWith('_')) continue;
      unused.push(info);
    }
    return unused;
  }

  analyze(node: ASTNode) {
    if (!node) return;
    
    switch (node.type) {
      case 'BlockStatement':
        this.enterScope();
        node.body.forEach(n => this.analyze(n));
        this.exitScope();
        break;
      case 'FunctionDeclaration':
        this.declare(node.name, node.returnType, node.line || 0, true);
        this.enterScope();
        // Register function parameters
        if (node.params && node.params.length > 0) {
          for (const param of node.params) {
            this.declare(param.name, param.type, param.line, false, true);
          }
        }
        this.analyze(node.body);
        this.exitScope();
        break;
      case 'VariableDeclaration':
        this.declare(node.name, node.varType, node.line);
        if (node.init) this.analyze(node.init);
        break;
      case 'Identifier':
        this.use(node.name);
        break;
      case 'BinaryExpression':
        this.analyze(node.left);
        this.analyze(node.right);
        break;
      case 'AssignmentExpression':
        this.analyze(node.left);
        this.analyze(node.right);
        break;
      case 'UnaryExpression':
        this.analyze(node.argument);
        break;
      case 'UpdateExpression':
        this.analyze(node.argument);
        break;
      case 'ReturnStatement':
        if (node.argument) this.analyze(node.argument);
        break;
      case 'IfStatement':
        this.analyze(node.test);
        this.analyze(node.consequent);
        if (node.alternate) this.analyze(node.alternate);
        break;
      case 'WhileStatement':
        this.analyze(node.test);
        this.analyze(node.body);
        break;
      case 'ForStatement':
        this.enterScope();
        if (node.init) this.analyze(node.init);
        if (node.condition) this.analyze(node.condition);
        if (node.update) this.analyze(node.update);
        this.analyze(node.body);
        this.exitScope();
        break;
      case 'CallExpression':
        this.analyze(node.callee);
        node.arguments.forEach(a => this.analyze(a));
        break;
      case 'ExpressionStatement':
        this.analyze(node.expression);
        break;
      case 'Program':
        node.body.forEach(n => this.analyze(n));
        break;
    }
  }
}
