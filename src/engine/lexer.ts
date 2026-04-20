import { Token, TokenType, CompilerError } from './types';

const KEYWORDS = new Set([
  'if', 'else', 'while', 'for', 'do', 'return', 'int', 'float', 'double', 'char', 'void',
  'struct', 'typedef', 'const', 'static', 'extern', 'break', 'continue',
]);

export function tokenize(input: string, errors: CompilerError[] = []): Token[] {
  const tokens: Token[] = [];
  let current = 0;
  let line = 1;
  let column = 1;

  function advance(steps = 1) {
    for (let i = 0; i < steps; i++) {
      if (input[current] === '\n') {
        line++;
        column = 1;
      } else {
        column++;
      }
      current++;
    }
  }

  while (current < input.length) {
    let char = input[current];

    if (/\s/.test(char)) {
      advance();
      continue;
    }

    if (char === '/' && input[current + 1] === '/') {
      while (current < input.length && input[current] !== '\n') { advance(); }
      continue;
    }
    if (char === '/' && input[current + 1] === '*') {
      advance(2);
      while (current < input.length && !(input[current] === '*' && input[current + 1] === '/')) {
        advance();
      }
      advance(2);
      continue;
    }

    if (/[a-zA-Z_]/.test(char)) {
      let value = '';
      const startCol = column;
      while (current < input.length && /[a-zA-Z0-9_]/.test(input[current])) {
        value += input[current];
        advance();
      }
      tokens.push({
        type: KEYWORDS.has(value) ? TokenType.KEYWORD : TokenType.IDENTIFIER,
        value,
        line,
        column: startCol,
      });
      continue;
    }

    if (/[0-9]/.test(char)) {
      let value = '';
      const startCol = column;
      let isFloat = false;
      while (current < input.length && /[0-9.]/.test(input[current])) {
        if (input[current] === '.') isFloat = true;
        value += input[current];
        advance();
      }
      tokens.push({
        type: isFloat ? TokenType.FLOAT_LITERAL : TokenType.INTEGER_LITERAL,
        value,
        line,
        column: startCol,
      });
      continue;
    }

    if (char === '"' || char === "'") {
      const quote = char;
      let value = '';
      const startCol = column;
      advance();
      while (current < input.length && input[current] !== quote) {
        if (input[current] === '\\') {
          value += input[current];
          advance();
        }
        value += input[current];
        advance();
      }
      if (current < input.length) advance(); // Consume closing quote
      tokens.push({
        type: TokenType.STRING_LITERAL,
        value: quote + value + quote,
        line,
        column: startCol,
      });
      continue;
    }

    if (/[{}[\]();,]/.test(char)) {
      tokens.push({ type: TokenType.PUNCTUATION, value: char, line, column });
      advance();
      continue;
    }

    const twoCharOp = input.substr(current, 2);
    if (['==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/='].includes(twoCharOp)) {
      tokens.push({ type: TokenType.OPERATOR, value: twoCharOp, line, column });
      advance(2);
      continue;
    }

    if (/[=+\-*/<>&|!%^~?]/.test(char)) {
      tokens.push({ type: TokenType.OPERATOR, value: char, line, column });
      advance();
      continue;
    }

    errors.push({ line, column, message: `Unexpected character: ${char}` });
    advance();
  }

  tokens.push({ type: TokenType.EOF, value: '', line, column });
  return tokens;
}
