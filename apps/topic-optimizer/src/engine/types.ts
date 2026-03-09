export interface PromptSource {
  promptId: string;
  promptText: string;
  sources: string[];
}

export interface TrajectoryPoint {
  budget: number;
  coverageFrac: number;
  resilienceFrac: number;
  removedPrompt: number | null;
}

export interface EliminationTrajectory {
  strategyName: string;
  points: TrajectoryPoint[];
}

export interface ParetoPoint {
  budget: number;
  coverageFrac: number;
  resilienceFrac: number;
  strategyName: string;
}

export interface FlatnessResult {
  isFlat: boolean;
  reason: string;
  tailAvgDelta: number | null;
  maxCoverageFrac: number;
  totalUniqueUrls: number;
}

export interface CurvePoint {
  k: number;
  cK: number;
  deltaK: number;
}

export type ConstraintAxis = 'coverage-floor' | 'budget' | 'resilience-floor';

export interface Constraint {
  axis: ConstraintAxis;
  value: number;
}

export interface ManifestRow {
  topicId: string;
  topicName: string;
  promptId: string;
  promptText: string;
  status: 'KEPT' | 'CUT';
  nUrls: number;
}

export interface TopicResult {
  topicId: string;
  topicName: string;
  nPrompts: number;
  nUrls: number;
  flatness: FlatnessResult;
  greedyCurve: CurvePoint[];
  trajectories: EliminationTrajectory[];
  paretoEnvelope: Map<number, ParetoPoint[]>;
  promptSources: PromptSource[];
  selectedPoint: ParetoPoint | null;
  selectedBudget: number;
  selectedStrategy: string;
  selectedCoverage: number;
  selectedResilience: number;
  cutIndices: number[];
  manifest: ManifestRow[];
}
