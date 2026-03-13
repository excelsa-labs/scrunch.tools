import { BipartiteGraph } from './graph';
import { backwardEliminate } from './backwardElimination';
import { assessFlatness } from './flatness';
import { fullParetoEnvelope } from './pareto';
import { greedyForwardCurve } from './greedyCurve';
import { DEFAULT_STRATEGIES } from './strategies';
import { getBaselineMetrics, findPointForStrategy, replayTrajectoryCuts } from './selection';
import { PromptSource, Constraint, TopicAnalysis, TopicResult, ManifestRow, CoveringPrompt } from './types';

export interface TopicGroup {
  topicId: string;
  topicName: string;
  promptSources: PromptSource[];
}

/**
 * Heavy compute: run backward elimination for all 7 strategies.
 * Call once per CSV upload. Returns analyses without selection.
 */
export function runAnalysis(groups: TopicGroup[]): TopicAnalysis[] {
  return groups.map(analyzeOneGroup);
}

function analyzeOneGroup(group: TopicGroup): TopicAnalysis {
  const { topicId, topicName, promptSources } = group;

  const graph = BipartiteGraph.fromPromptSources(promptSources);
  const greedyCurve = greedyForwardCurve(promptSources);
  const flatness = assessFlatness(greedyCurve, graph.nUrls);

  const trajectories = DEFAULT_STRATEGIES.map(strategy =>
    backwardEliminate(graph, strategy)
  );

  const paretoEnvelope = fullParetoEnvelope(trajectories);

  let baselineCoverage = 0;
  let baselineResilience = 0;
  if (trajectories.length > 0) {
    const metrics = getBaselineMetrics(trajectories);
    baselineCoverage = metrics.baselineCoverage;
    baselineResilience = metrics.baselineResilience;
  }

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
    baselineCoverage,
    baselineResilience,
  };
}

/**
 * Light selection: given pre-computed analyses, apply constraint + optional strategy override.
 * Fast enough to call on every strategy change in the UI.
 */
export function applySelection(
  analyses: TopicAnalysis[],
  constraint: Constraint,
  strategy: string,
  forceOverrides?: Set<string>,
): TopicResult[] {
  return analyses.map(a => selectForAnalysis(a, constraint, strategy, forceOverrides));
}

function selectForAnalysis(
  analysis: TopicAnalysis,
  constraint: Constraint,
  strategy: string,
  forceOverrides?: Set<string>,
): TopicResult {
  const { trajectories, baselineCoverage, baselineResilience } = analysis;
  const isForced = forceOverrides?.has(analysis.topicId) ?? false;

  // Non-flat and not overridden: keep everything
  if (!analysis.flatness.isFlat && !isForced) {
    const manifest = buildManifest(analysis, []);
    return {
      ...analysis,
      selectedPoint: null,
      selectedBudget: analysis.nPrompts,
      selectedStrategy: 'none',
      selectedCoverage: baselineCoverage,
      selectedResilience: baselineResilience,
      cutIndices: [],
      manifest,
    };
  }

  let selectedPoint = null;
  let selectedBudget = analysis.nPrompts;
  let selectedStrategy = 'none';
  let selectedCoverage = baselineCoverage;
  let selectedResilience = baselineResilience;
  let cutIndices: number[] = [];

  if (trajectories.length > 0) {
    selectedPoint = findPointForStrategy(
      trajectories, strategy, constraint, baselineCoverage, baselineResilience,
    );

    if (selectedPoint) {
      selectedBudget = selectedPoint.budget;
      selectedStrategy = selectedPoint.strategyName;
      selectedCoverage = selectedPoint.coverageFrac;
      selectedResilience = selectedPoint.resilienceFrac;
      cutIndices = replayTrajectoryCuts(trajectories, selectedStrategy, selectedBudget);
    }
  }

  const manifest = buildManifest(analysis, cutIndices);

  return {
    ...analysis,
    selectedPoint,
    selectedBudget,
    selectedStrategy,
    selectedCoverage,
    selectedResilience,
    cutIndices,
    manifest,
  };
}

function buildManifest(analysis: TopicAnalysis, cutIndices: number[]): ManifestRow[] {
  const { topicId, topicName, promptSources } = analysis;
  const cutSet = new Set(cutIndices);
  const keptIndices = promptSources.map((_, i) => i).filter(i => !cutSet.has(i));

  const keptUrlSets = keptIndices.map(ki => ({
    idx: ki,
    urls: new Set(promptSources[ki].sources),
  }));

  const coverageMap = new Map<number, { covering: CoveringPrompt[]; uncovered: number }>();
  for (const ci of cutIndices) {
    const remaining = new Set(promptSources[ci].sources);
    const covering: CoveringPrompt[] = [];

    while (remaining.size > 0) {
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

  return promptSources.map((ps, i) => {
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
}
