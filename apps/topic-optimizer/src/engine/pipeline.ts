import { BipartiteGraph } from './graph';
import { backwardEliminate } from './backwardElimination';
import { assessFlatness } from './flatness';
import { fullParetoEnvelope } from './pareto';
import { greedyForwardCurve } from './greedyCurve';
import { DEFAULT_STRATEGIES } from './strategies';
import { getBaselineMetrics, findBestPointForConstraint, replayTrajectoryCuts } from './selection';
import { PromptSource, Constraint, TopicResult, ManifestRow } from './types';

export interface TopicGroup {
  topicId: string;
  topicName: string;
  promptSources: PromptSource[];
}

export function runPipeline(
  groups: TopicGroup[],
  constraint: Constraint,
): TopicResult[] {
  return groups.map(group => runOneGroup(group, constraint));
}

function runOneGroup(group: TopicGroup, constraint: Constraint): TopicResult {
  const { topicId, topicName, promptSources } = group;

  const graph = BipartiteGraph.fromPromptSources(promptSources);
  const greedyCurve = greedyForwardCurve(promptSources);

  const flatness = assessFlatness(greedyCurve, graph.nUrls);

  // Always run backward elimination (web app = test_mode equivalent)
  const trajectories = DEFAULT_STRATEGIES.map(strategy =>
    backwardEliminate(graph, strategy)
  );

  const paretoEnvelope = fullParetoEnvelope(trajectories);

  // Selection
  let selectedPoint = null;
  let selectedBudget = graph.nPrompts;
  let selectedStrategy = 'none';
  let selectedCoverage = 0;
  let selectedResilience = 0;
  let cutIndices: number[] = [];

  if (trajectories.length > 0) {
    const { baselineCoverage, baselineResilience } = getBaselineMetrics(trajectories);
    selectedCoverage = baselineCoverage;
    selectedResilience = baselineResilience;

    selectedPoint = findBestPointForConstraint(
      paretoEnvelope,
      constraint,
      baselineCoverage,
      baselineResilience,
    );

    if (selectedPoint) {
      selectedBudget = selectedPoint.budget;
      selectedStrategy = selectedPoint.strategyName;
      selectedCoverage = selectedPoint.coverageFrac;
      selectedResilience = selectedPoint.resilienceFrac;
      cutIndices = replayTrajectoryCuts(trajectories, selectedStrategy, selectedBudget);
    }
  }

  const cutSet = new Set(cutIndices);
  const manifest: ManifestRow[] = promptSources.map((ps, i) => ({
    topicId,
    topicName,
    promptId: ps.promptId,
    promptText: ps.promptText,
    status: cutSet.has(i) ? 'CUT' as const : 'KEPT' as const,
    nUrls: ps.sources.length,
  }));

  return {
    topicId,
    topicName,
    nPrompts: graph.nPrompts,
    nUrls: graph.nUrls,
    flatness,
    greedyCurve,
    trajectories,
    paretoEnvelope,
    promptSources,
    selectedPoint,
    selectedBudget,
    selectedStrategy,
    selectedCoverage,
    selectedResilience,
    cutIndices,
    manifest,
  };
}
