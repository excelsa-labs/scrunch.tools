import { PromptSource, CurvePoint } from './types';

export function greedyForwardCurve(promptSources: PromptSource[]): CurvePoint[] {
  const n = promptSources.length;
  if (n === 0) return [];

  const covered = new Set<string>();
  const selected = new Set<number>();
  const result: CurvePoint[] = [];

  for (let step = 1; step <= n; step++) {
    // Find prompt with max marginal gain
    let bestIdx = -1;
    let bestGain = -1;

    for (let i = 0; i < n; i++) {
      if (selected.has(i)) continue;
      let gain = 0;
      for (const url of promptSources[i].sources) {
        if (!covered.has(url)) gain++;
      }
      if (gain > bestGain) {
        bestGain = gain;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;

    selected.add(bestIdx);
    for (const url of promptSources[bestIdx].sources) {
      covered.add(url);
    }

    result.push({
      k: step,
      cK: covered.size,
      deltaK: bestGain,
    });
  }

  return result;
}
