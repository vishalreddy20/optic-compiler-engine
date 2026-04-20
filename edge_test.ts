import { analyzeCode } from './src/engine/optimizer';

function runTest(name, code) {
  console.log(`\n--- Running Test: ${name} ---`);
  try {
    const start = performance.now();
    const result = analyzeCode(code);
    const time = performance.now() - start;
    console.log(`Time: ${time.toFixed(2)}ms`);
    console.log(`Tokens: ${result.metrics.tokensCount}`);
    console.log(`AST Nodes: ${result.metrics.astNodesCount}`);
    console.log(`CFG Nodes: ${result.metrics.cfgNodesCount}`);
    console.log(`Errors: ${result.errors.length}`);
    if (result.errors.length > 0) {
      console.log(`First Error:`, result.errors[0]);
    }
    console.log(`Suggestions: ${result.suggestions.length}`);
  } catch (e) {
    console.error(`FATAL CRASH:`, e.message);
  }
}

// 1. Extreme recursion / Deep AST
const deepAST = "int x = " + "1 + ".repeat(1000) + "1;";
runTest("Deep AST (1000 additions)", deepAST);

// 2. Unclosed string literal (Lexer stress)
const unclosedString = `char* str = "this string never ends... \n int y = 5;`;
runTest("Unclosed String Literal", unclosedString);

// 3. Complete garbage syntax
const garbage = `int main() { if ( } + * / % ! === )`;
runTest("Garbage Syntax", garbage);

// 4. Missing semicolons & dangling blocks
const dangling = `int main() { int x = 5 \n int y = 10 \n if (x > 5) { y = 2 } `;
runTest("Missing Semicolons & Dangling Block", dangling);

// 5. Deeply nested CFG (loops in if in loops)
let nestedCFG = `int main() {\n`;
for(let i=0; i<50; i++) {
  nestedCFG += `  if (x > ${i}) {\n    while (y < ${i}) {\n`;
}
nestedCFG += `      x++;\n`;
for(let i=0; i<50; i++) {
  nestedCFG += `    }\n  }\n`;
}
nestedCFG += `}\n`;
runTest("Deeply Nested CFG (50 levels)", nestedCFG);

// 6. Huge file (10,000 lines of variable declarations)
const hugeFile = Array(10000).fill("int x = 5;").join("\n");
runTest("Huge File (10,000 lines)", hugeFile);
