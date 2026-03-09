import { BipartiteGraph, CoverageState } from './graph';
import { RemovalStrategy } from './strategies';
import { EliminationTrajectory, TrajectoryPoint } from './types';

export function backwardEliminate(
  graph: BipartiteGraph,
  strategy: RemovalStrategy,
  minBudget: number = 3,
): EliminationTrajectory {
  const state = CoverageState.fromGraph(graph);
  const points: TrajectoryPoint[] = [];

  // Record initial state (full budget)
  points.push({
    budget: graph.nPrompts,
    coverageFrac: state.coverageFrac,
    resilienceFrac: state.resilienceFrac,
    removedPrompt: null,
  });

  let currentBudget = graph.nPrompts;
  while (currentBudget > minBudget) {
    // Score all active prompts, find lowest score
    let bestPrompt = -1;
    let bestScore = Infinity;

    // Sorted for deterministic tie-breaking (matches Python sorted(state.active))
    const sortedActive = Array.from(state.active).sort((a, b) => a - b);
    for (const p of sortedActive) {
      const s = strategy.score(state, p);
      if (s < bestScore) {
        bestScore = s;
        bestPrompt = p;
      }
    }

    if (bestPrompt === -1) break;

    state.removePrompt(bestPrompt);
    currentBudget--;

    points.push({
      budget: currentBudget,
      coverageFrac: state.coverageFrac,
      resilienceFrac: state.resilienceFrac,
      removedPrompt: bestPrompt,
    });
  }

  return { strategyName: strategy.name, points };
}
