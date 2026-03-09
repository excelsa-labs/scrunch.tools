import { BipartiteGraph } from './graph';
import { backwardEliminate } from './backwardElimination';
import { assessFlatness } from './flatness';
import { fullParetoEnvelope } from './pareto';
import { greedyForwardCurve } from './greedyCurve';
import { DEFAULT_STRATEGIES } from './strategies';
import { getBaselineMetrics, findBestPointForConstraint, replayTrajectoryCuts } from './selection';
import { PromptSource, Constraint, TopicResult, ManifestRow, CoveringPrompt } from './types';

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
  const keptIndices = promptSources.map((_, i) => i).filter(i => !cutSet.has(i));

  // For each CUT prompt, greedily find KEPT prompts that cover its URLs
  const keptUrlSets = keptIndices.map(ki => ({
    idx: ki,
    urls: new Set(promptSources[ki].sources),
  }));

  const coverageMap = new Map<number, { covering: CoveringPrompt[]; uncovered: number }>();
  for (const ci of cutIndices) {
    const remaining = new Set(promptSources[ci].sources);
    const covering: CoveringPrompt[] = [];

    while (remaining.size > 0) {
      // Find KEPT prompt covering the most remaining URLs
      let bestIdx = -1;
      let bestShared = 0;
      for (const { idx: ki, urls: keptUrls } of keptUrlSets) {
        let shared = 0;
        for (const url of remaining) {
          if (keptUrls.has(url)) shared++;
        }
        if (shared > bestShared) {
          bestShared = shared;
          bestIdx = ki;
        }
      }

      if (bestIdx < 0 || bestShared === 0) break;

      // Remove covered URLs and record
      const keptUrls = keptUrlSets.find(k => k.idx === bestIdx)!.urls;
      for (const url of Array.from(remaining)) {
        if (keptUrls.has(url)) remaining.delete(url);
      }
      covering.push({
        promptId: promptSources[bestIdx].promptId,
        promptText: promptSources[bestIdx].promptText,
        sharedUrls: bestShared,
      });
    }

    coverageMap.set(ci, { covering, uncovered: remaining.size });
  }

  const manifest: ManifestRow[] = promptSources.map((ps, i) => {
    const coverage = coverageMap.get(i);
    return {
      topicId,
      topicName,
      promptId: ps.promptId,
      promptText: ps.promptText,
      status: cutSet.has(i) ? 'CUT' as const : 'KEPT' as const,
      nUrls: ps.sources.length,
      coveringPrompts: coverage?.covering ?? [],
      uncoveredUrls: coverage?.uncovered ?? 0,
    };
  });

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
