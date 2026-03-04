import type { AgentState } from "../contracts/state.js";

export const setUsedTurn = (state: AgentState, turn: number): void => {
  state.budgets.usedTurns = Math.max(state.budgets.usedTurns, turn);
};
