import { CoverageState } from './graph';

export interface RemovalStrategy {
  name: string;
  score(state: CoverageState, promptIdx: number): number;
}

const minCoverageLoss: RemovalStrategy = {
  name: 'min_coverage_loss',
  score: (state, promptIdx) => state.coverageLossFor(promptIdx),
};

const minResilienceLoss: RemovalStrategy = {
  name: 'min_resilience_loss',
  score: (state, promptIdx) => state.resilienceLossFor(promptIdx),
};

function weightedLoss(coverageWeight: number, resilienceWeight: number, name?: string): RemovalStrategy {
  return {
    name: name ?? `weighted_${Math.round(coverageWeight * 100)}_${Math.round(resilienceWeight * 100)}`,
    score: (state, promptIdx) => {
      return coverageWeight * state.coverageLossFor(promptIdx) +
        resilienceWeight * state.resilienceLossFor(promptIdx);
    },
  };
}

const minDegree: RemovalStrategy = {
  name: 'min_degree',
  score: (state, promptIdx) => state.degreeOf(promptIdx),
};

const maxRedundancy: RemovalStrategy = {
  name: 'max_redundancy',
  score: (state, promptIdx) => -state.redundancySumFor(promptIdx),
};

export const DEFAULT_STRATEGIES: RemovalStrategy[] = [
  minCoverageLoss,
  minResilienceLoss,
  weightedLoss(0.7, 0.3),
  weightedLoss(0.5, 0.5),
  weightedLoss(0.3, 0.7),
  minDegree,
  maxRedundancy,
];
