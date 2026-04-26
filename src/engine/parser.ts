import { Token, TokenType, ASTNode, CompilerError, FunctionParam } from './types';

export function parse(tokens: Token[], errors: CompilerError[] = []): ASTNode | null {
  let current = 0;

  function peek(): Token {
    return tokens[current] || tokens[tokens.length - 1];
  }

  function match(...types: TokenType[]): boolean {
    if (types.includes(peek().type)) {
      current++;
      return true;
    }
    return false;
  }

  function consume(type: TokenType, message: string): Token | null {
    if (peek().type === type) {
      return tokens[current++];
    }
    errors.push({ line: peek().line, column: peek().column, message });
    return null;
  }

  function matchKeyword(kw: string): boolean {
    if (peek().type === TokenType.KEYWORD && peek().value === kw) {
      current++;
      return true;
    }
    return false;
  }

  function consumePunctuation(p: string, message: string): Token | null {
    if (peek().type === TokenType.PUNCTUATION && peek().value === p) {
      return tokens[current++];
    }
    errors.push({ line: peek().line, column: peek().column, message });
    return null;
  }

  function isTypeSpecifier(): boolean {
    if (peek().type === TokenType.KEYWORD) {
      return ['int', 'float', 'double', 'char', 'void', 'auto'].includes(peek().value);
    }
    return false;
  }

  // ═══════════════════════════════════════════
  // PRECEDENCE CHAIN (lowest to highest)
  // ═══════════════════════════════════════════

  // Level 1: Assignment (right-associative) — =, +=, -=, *=, /=
  function parseExpression(): ASTNode {
    let expr = parseLogicalOr();

    const assignOps = ['=', '+=', '-=', '*=', '/='];
    if (peek().type === TokenType.OPERATOR && assignOps.includes(peek().value)) {
      const op = tokens[current++];
      const right = parseExpression(); // Right-associative
      return { type: 'AssignmentExpression', operator: op.value, left: expr, right, line: op.line };
    }
    return expr;
  }

  // Level 2: Logical OR — ||
  function parseLogicalOr(): ASTNode {
    let expr = parseLogicalAnd();
    while (peek().type === TokenType.OPERATOR && peek().value === '||') {
      const op = tokens[current++];
      const right = parseLogicalAnd();
      expr = { type: 'BinaryExpression', operator: op.value, left: expr, right, line: op.line };
    }
    return expr;
  }

  // Level 3: Logical AND — &&
  function parseLogicalAnd(): ASTNode {
    let expr = parseEquality();
    while (peek().type === TokenType.OPERATOR && peek().value === '&&') {
      const op = tokens[current++];
      const right = parseEquality();
      expr = { type: 'BinaryExpression', operator: op.value, left: expr, right, line: op.line };
    }
    return expr;
  }

  // Level 4: Equality — ==, !=
  function parseEquality(): ASTNode {
    let expr = parseRelational();
    while (peek().type === TokenType.OPERATOR && ['==', '!='].includes(peek().value)) {
      const op = tokens[current++];
      const right = parseRelational();
      expr = { type: 'BinaryExpression', operator: op.value, left: expr, right, line: op.line };
    }
    return expr;
  }

  // Level 5: Relational — <, >, <=, >=
  function parseRelational(): ASTNode {
    let expr = parseAdditive();
    while (peek().type === TokenType.OPERATOR && ['<', '>', '<=', '>='].includes(peek().value)) {
      const op = tokens[current++];
      const right = parseAdditive();
      expr = { type: 'BinaryExpression', operator: op.value, left: expr, right, line: op.line };
    }
    return expr;
  }

  // Level 6: Additive — +, -
  function parseAdditive(): ASTNode {
    let expr = parseMultiplicative();
    while (peek().type === TokenType.OPERATOR && ['+', '-'].includes(peek().value)) {
      const op = tokens[current++];
      const right = parseMultiplicative();
      expr = { type: 'BinaryExpression', operator: op.value, left: expr, right, line: op.line };
    }
    return expr;
  }

  // Level 7: Multiplicative — *, /, %
  function parseMultiplicative(): ASTNode {
    let expr = parseUnary();
    while (peek().type === TokenType.OPERATOR && ['*', '/', '%'].includes(peek().value)) {
      const op = tokens[current++];
      const right = parseUnary();
      expr = { type: 'BinaryExpression', operator: op.value, left: expr, right, line: op.line };
    }
    return expr;
  }

  // Level 8: Unary — !, -, prefix ++, prefix --
  function parseUnary(): ASTNode {
    if (peek().type === TokenType.OPERATOR && peek().value === '!') {
      const op = tokens[current++];
      const argument = parseUnary();
      return { type: 'UnaryExpression', operator: op.value, argument, line: op.line };
    }
    if (peek().type === TokenType.OPERATOR && peek().value === '-') {
      // Check if this is a unary minus (not subtraction)
      // Unary minus: at start, after operator, after punctuation like ( , ;
      const prevToken = current > 0 ? tokens[current - 1] : null;
      const isUnary = !prevToken
        || prevToken.type === TokenType.OPERATOR
        || prevToken.type === TokenType.PUNCTUATION
        || prevToken.type === TokenType.KEYWORD;
      if (isUnary) {
        const op = tokens[current++];
        const argument = parseUnary();
        return { type: 'UnaryExpression', operator: op.value, argument, line: op.line };
      }
    }
    if (peek().type === TokenType.OPERATOR && ['++', '--'].includes(peek().value)) {
      const op = tokens[current++];
      const argument = parseUnary();
      return { type: 'UpdateExpression', operator: op.value, prefix: true, argument, line: op.line };
    }
    return parsePrimary();
  }

  // Level 9: Primary — literals, identifiers, (expr), function calls, postfix ++/--
  function parsePrimary(): ASTNode {
    const t = peek();

    // Integer/Float literals
    if (match(TokenType.INTEGER_LITERAL, TokenType.FLOAT_LITERAL)) {
      return { type: 'Literal', value: Number(t.value), raw: t.value, line: t.line };
    }

    // String literals
    if (match(TokenType.STRING_LITERAL)) {
      return { type: 'Literal', value: t.value.slice(1, -1), raw: t.value, line: t.line };
    }

    // Identifiers, function calls, and postfix operators
    if (match(TokenType.IDENTIFIER)) {
      let id: ASTNode = { type: 'Identifier', name: t.value, line: t.line };

      // Function call: identifier(args)
      if (peek().value === '(' && peek().type === TokenType.PUNCTUATION) {
        consumePunctuation('(', 'Expected "("');
        const args: ASTNode[] = [];
        if (peek().value !== ')') {
          do {
            args.push(parseExpression());
          } while (
            peek().type === TokenType.PUNCTUATION &&
            peek().value === ',' &&
            consumePunctuation(',', 'Expected ","')
          );
        }
        consumePunctuation(')', 'Expected ")"');
        id = { type: 'CallExpression', callee: { type: 'Identifier', name: t.value, line: t.line }, arguments: args, line: t.line };
      }

      // Postfix ++ / --
      if (peek().type === TokenType.OPERATOR && ['++', '--'].includes(peek().value)) {
        const op = tokens[current++];
        return { type: 'UpdateExpression', operator: op.value, prefix: false, argument: id, line: op.line };
      }

      return id;
    }

    // Parenthesized expression
    if (peek().value === '(' && peek().type === TokenType.PUNCTUATION) {
      consumePunctuation('(', 'Expected "("');
      const expr = parseExpression();
      consumePunctuation(')', 'Expected ")"');
      return expr;
    }

    // Error recovery
    errors.push({ line: t.line, column: t.column, message: `Unexpected token: "${t.value}"` });
    current++;
    return { type: 'Identifier', name: 'error', line: t.line };
  }

  // ═══════════════════════════════════════════
  // STATEMENTS
  // ═══════════════════════════════════════════

  function parseStatement(): ASTNode {
    // If statement
    if (matchKeyword('if')) {
      const line = tokens[current - 1].line;
      consumePunctuation('(', 'Expected "("');
      const test = parseExpression();
      consumePunctuation(')', 'Expected ")"');
      const consequent = parseStatement();
      let alternate: ASTNode | null = null;
      if (matchKeyword('else')) {
        alternate = parseStatement();
      }
      return { type: 'IfStatement', test, consequent, alternate, line };
    }

    // While statement
    if (matchKeyword('while')) {
      const line = tokens[current - 1].line;
      consumePunctuation('(', 'Expected "("');
      const test = parseExpression();
      consumePunctuation(')', 'Expected ")"');
      const body = parseStatement();
      return { type: 'WhileStatement', test, body, line };
    }

    // For statement
    if (matchKeyword('for')) {
      return parseForStatement();
    }

    // Return statement
    if (matchKeyword('return')) {
      const line = tokens[current - 1].line;
      let arg: ASTNode | null = null;
      if (peek().value !== ';') {
        arg = parseExpression();
      }
      consumePunctuation(';', 'Expected ";"');
      return { type: 'ReturnStatement', argument: arg, line };
    }

    // Block statement
    if (peek().value === '{') {
      return parseBlock();
    }

    // Variable declaration or expression statement
    if (isTypeSpecifier()) {
      return parseDeclaration();
    }

    const expr = parseExpression();
    consumePunctuation(';', 'Expected ";"');
    return { type: 'ExpressionStatement', expression: expr, line: 'line' in expr && expr.line ? expr.line : 1 };
  }

  // ═══════════════════════════════════════════
  // FOR LOOP
  // ═══════════════════════════════════════════

  function parseForStatement(): ASTNode {
    const line = tokens[current - 1].line;
    consumePunctuation('(', 'Expected "(" after for');

    // Init: variable declaration, expression, or empty
    let init: ASTNode | null = null;
    if (peek().value !== ';') {
      if (isTypeSpecifier()) {
        // Variable declaration (without trailing semicolon — parseDeclaration handles it)
        init = parseDeclaration();
      } else {
        init = parseExpression();
        consumePunctuation(';', 'Expected ";"');
      }
    } else {
      consumePunctuation(';', 'Expected ";"');
    }

    // Condition
    let condition: ASTNode | null = null;
    if (peek().value !== ';') {
      condition = parseExpression();
    }
    consumePunctuation(';', 'Expected ";"');

    // Update
    let update: ASTNode | null = null;
    if (peek().value !== ')') {
      update = parseExpression();
    }
    consumePunctuation(')', 'Expected ")" after for');

    const body = parseStatement();

    return { type: 'ForStatement', init, condition, update, body, line };
  }

  // ═══════════════════════════════════════════
  // DECLARATIONS
  // ═══════════════════════════════════════════

  function parseDeclaration(): ASTNode {
    const typeToken = tokens[current++];
    const idToken = consume(TokenType.IDENTIFIER, 'Expected identifier');
    const line = typeToken.line;

    // Function declaration: type name(params) { ... }
    if (peek().value === '(' && peek().type === TokenType.PUNCTUATION) {
      consumePunctuation('(', 'Expected "("');

      // Parse parameter list properly
      const params: FunctionParam[] = [];
      while (peek().value !== ')' && peek().type !== TokenType.EOF) {
        if (isTypeSpecifier()) {
          const paramType = tokens[current++].value;
          const paramName = consume(TokenType.IDENTIFIER, 'Expected parameter name');
          params.push({
            type: paramType,
            name: paramName?.value || 'unknown',
            line: paramName?.line || line,
          });
        } else {
          // Skip unexpected tokens in param list gracefully
          current++;
        }
        // Skip comma between params
        if (peek().value === ',' && peek().type === TokenType.PUNCTUATION) {
          current++;
        }
      }
      consumePunctuation(')', 'Expected ")"');
      const body = parseBlock();
      return {
        type: 'FunctionDeclaration',
        name: idToken?.value || 'unknown',
        returnType: typeToken.value,
        params,
        body,
        line,
      };
    }

    // Variable declaration: type name = expr;
    let init: ASTNode | null = null;
    if (peek().type === TokenType.OPERATOR && peek().value === '=') {
      current++; // consume '='
      init = parseExpression();
    }
    consumePunctuation(';', 'Expected ";"');
    return {
      type: 'VariableDeclaration',
      name: idToken?.value || 'unknown',
      varType: typeToken.value,
      init,
      line,
    };
  }

  function parseBlock(): ASTNode {
    const line = peek().line;
    consumePunctuation('{', 'Expected "{"');
    const body: ASTNode[] = [];
    while (peek().type !== TokenType.EOF && peek().value !== '}') {
      body.push(parseStatement());
    }
    consumePunctuation('}', 'Expected "}"');
    return { type: 'BlockStatement', body, line };
  }

  // ═══════════════════════════════════════════
  // PROGRAM (top-level)
  // ═══════════════════════════════════════════

  const body: ASTNode[] = [];
  while (peek().type !== TokenType.EOF) {
    try {
      if (isTypeSpecifier()) {
        body.push(parseDeclaration());
      } else {
        body.push(parseStatement());
      }
    } catch (e) {
      current++;
    }
  }

  return { type: 'Program', body };
}
