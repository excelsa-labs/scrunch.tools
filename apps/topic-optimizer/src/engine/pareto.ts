import { EliminationTrajectory, ParetoPoint } from './types';

function paretoFrontierAtBudget(
  trajectories: EliminationTrajectory[],
  budget: number,
): ParetoPoint[] {
  const candidates: ParetoPoint[] = [];
  for (const traj of trajectories) {
    for (const pt of traj.points) {
      if (pt.budget === budget) {
        candidates.push({
          budget,
          coverageFrac: pt.coverageFrac,
          resilienceFrac: pt.resilienceFrac,
          strategyName: traj.strategyName,
        });
        break;
      }
    }
  }

  if (candidates.length === 0) return [];

  const frontier: ParetoPoint[] = [];
  for (const c of candidates) {
    let dominated = false;
    for (const other of candidates) {
      if (other === c) continue;
      if (
        other.coverageFrac >= c.coverageFrac &&
        other.resilienceFrac >= c.resilienceFrac &&
        (other.coverageFrac > c.coverageFrac || other.resilienceFrac > c.resilienceFrac)
      ) {
        dominated = true;
        break;
      }
    }
    if (!dominated) frontier.push(c);
  }

  return frontier;
}

export function fullParetoEnvelope(
  trajectories: EliminationTrajectory[],
): Map<number, ParetoPoint[]> {
  if (trajectories.length === 0) return new Map();

  const budgets = new Set<number>();
  for (const traj of trajectories) {
    for (const pt of traj.points) {
      budgets.add(pt.budget);
    }
  }

  const result = new Map<number, ParetoPoint[]>();
  for (const b of Array.from(budgets).sort((a, c) => c - a)) {
    const frontier = paretoFrontierAtBudget(trajectories, b);
    if (frontier.length > 0) {
      result.set(b, frontier);
    }
  }

  return result;
}
