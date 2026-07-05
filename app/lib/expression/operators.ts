// biome-ignore-start lint/style/noNonNullAssertion: external code

// Source - https://stackoverflow.com/a/75355272
// Posted by tanguy_k
// Retrieved 2026-02-22, License - CC BY-SA 4.0

// WTF!
// parseFloat('-0') => -0 vs parseFloat(-0) => 0
// -0 === 0 => true vs Object.is(-0, 0) => false
const minus0Hack = (value: number) => (Object.is(value, -0) ? "-0" : value);

export const operators: {
  [operator: string]:
    | {
        func: (...args: string[]) => string;
        precedence: number;
        associativity: "left" | "right";
        arity: number; // Needed by evalReversePolishNotation()
      }
    | undefined;
} = {
  "+": {
    func: (x, y) => `${minus0Hack(Number(x) + Number(y))}`,
    precedence: 1,
    associativity: "left",
    arity: 2,
  },
  "-": {
    func: (x, y) => `${minus0Hack(Number(x) - Number(y))}`,
    precedence: 1,
    associativity: "left",
    arity: 2,
  },
  "*": {
    func: (x, y) => `${minus0Hack(Number(x) * Number(y))}`,
    precedence: 2,
    associativity: "left",
    arity: 2,
  },
  "/": {
    func: (x, y) => `${minus0Hack(Number(x) / Number(y))}`,
    precedence: 2,
    associativity: "left",
    arity: 2,
  },
  "%": {
    func: (x, y) => `${minus0Hack(Number(x) % Number(y))}`,
    precedence: 2,
    associativity: "left",
    arity: 2,
  },
  "^": {
    // Why Math.pow() instead of **?
    // -2 ** 2 => "SyntaxError: Unary operator used immediately before exponentiation expression..."
    // Math.pow(-2, 2) => -4
    // eslint-disable-next-line prefer-exponentiation-operator, no-restricted-properties
    func: (x, y) => `${minus0Hack(Number(x) ** Number(y))}`,
    precedence: 3,
    associativity: "right",
    arity: 2,
  },
};
export const operatorsKeys = Object.keys(operators);

export const functions: {
  [operator: string]:
    | {
        func: (...args: string[]) => string;
        // Needed by evalReversePolishNotation()
        arity: number;
      }
    | undefined;
} = {
  min: {
    func: (x, y) => `${minus0Hack(Math.min(Number(x), Number(y)))}`,
    arity: 2,
  },
  max: {
    func: (x, y) => `${minus0Hack(Math.max(Number(x), Number(y)))}`,
    arity: 2,
  },
  sin: { func: (x) => `${minus0Hack(Math.sin(Number(x)))}`, arity: 1 },
  cos: { func: (x) => `${minus0Hack(Math.cos(Number(x)))}`, arity: 1 },
  tan: { func: (x) => `${minus0Hack(Math.tan(Number(x)))}`, arity: 1 },
  log: { func: (x) => `${Math.log(Number(x))}`, arity: 1 }, // No need for -0 hack
  sqrt: { func: (x) => `${Math.sqrt(Number(x))}`, arity: 1 }, // No need for -0 hack
};
export const functionsKeys = Object.keys(functions);

export const top = (stack: string[]): string | undefined =>
  stack[stack.length - 1];

// biome-ignore-end lint/style/noNonNullAssertion: external code
