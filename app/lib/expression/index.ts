import { evalReversePolishNotation } from "./rpn";
import { shuntingYard } from "./shunting-yard";
import { tokenize } from "./tokenize";

export function calculate(expression: string) {
  const tokens = tokenize(expression);
  const rpn = shuntingYard(tokens);
  return evalReversePolishNotation(rpn);
}
