import { Constraint, EliminationTrajectory, ParetoPoint } from './types';

export function getBaselineMetrics(
  trajectories: EliminationTrajectory[],
): { baselineResilience: number; baselineCoverage: number; fullBudget: number } {
  const pt = trajectories[0].points[0];
  return {
    baselineResilience: pt.resilienceFrac,
    baselineCoverage: pt.coverageFrac,
    fullBudget: pt.budget,
  };
}

export function findBestPointForConstraint(
  paretoEnvelope: Map<number, ParetoPoint[]>,
  constraint: Constraint,
  baselineCoverage: number,
  baselineResilience: number,
): ParetoPoint | null {
  const sortedBudgets = Array.from(paretoEnvelope.keys()).sort((a, b) => a - b);

  switch (constraint.axis) {
    case 'coverage-floor': {
      const threshold = constraint.value * baselineCoverage;
      // Scan from lowest budget upward, find first meeting threshold
      for (const budget of sortedBudgets) {
        const points = paretoEnvelope.get(budget)!;
        const qualifying = points.filter(p => p.coverageFrac >= threshold);
        if (qualifying.length > 0) {
          qualifying.sort((a, b) =>
            b.resilienceFrac - a.resilienceFrac || a.strategyName.localeCompare(b.strategyName)
          );
          return qualifying[0];
        }
      }
      return null;
    }

    case 'resilience-floor': {
      const threshold = constraint.value * baselineResilience;
      // Scan from lowest budget upward, find first meeting threshold
      for (const budget of sortedBudgets) {
        const points = paretoEnvelope.get(budget)!;
        const qualifying = points.filter(p => p.resilienceFrac >= threshold);
        if (qualifying.length > 0) {
          qualifying.sort((a, b) =>
            -a.coverageFrac + b.coverageFrac || -a.resilienceFrac + b.resilienceFrac || a.strategyName.localeCompare(b.strategyName)
          );
          return qualifying[0];
        }
      }
      return null;
    }

    case 'budget': {
      // Find best point at exactly that budget or nearest <= target
      const targetBudget = Math.round(constraint.value);
      let bestBudget: number | null = null;
      for (const b of sortedBudgets) {
        if (b <= targetBudget) bestBudget = b;
      }
      if (bestBudget === null) return null;

      const points = paretoEnvelope.get(bestBudget)!;
      const sorted = [...points].sort((a, b) =>
        b.coverageFrac - a.coverageFrac || b.resilienceFrac - a.resilienceFrac || a.strategyName.localeCompare(b.strategyName)
      );
      return sorted[0] ?? null;
    }
  }
}

export function replayTrajectoryCuts(
  trajectories: EliminationTrajectory[],
  strategyName: string,
  targetBudget: number,
): number[] {
  const traj = trajectories.find(t => t.strategyName === strategyName);
  if (!traj) return [];

  const cutIndices: number[] = [];
  for (const pt of traj.points) {
    if (pt.removedPrompt !== null && pt.budget >= targetBudget) {
      cutIndices.push(pt.removedPrompt);
    }
    if (pt.budget === targetBudget) break;
  }
  return cutIndices;
}
