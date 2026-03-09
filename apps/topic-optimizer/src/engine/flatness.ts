import { CurvePoint, FlatnessResult } from './types';

export function assessFlatness(
  greedyCurve: CurvePoint[],
  totalUniqueUrls: number,
  tailWindow: number = 2,
  threshold: number = 0.01,
  minCoverageFrac: number = 0.8,
): FlatnessResult {
  if (greedyCurve.length === 0) {
    return {
      isFlat: false,
      reason: 'empty_curve',
      tailAvgDelta: null,
      maxCoverageFrac: 0.0,
      totalUniqueUrls,
    };
  }

  if (totalUniqueUrls === 0) {
    return {
      isFlat: true,
      reason: 'no_urls',
      tailAvgDelta: 0.0,
      maxCoverageFrac: 1.0,
      totalUniqueUrls: 0,
    };
  }

  const maxCK = Math.max(...greedyCurve.map(pt => pt.cK));
  const maxCoverageFrac = maxCK / totalUniqueUrls;

  if (maxCoverageFrac < minCoverageFrac) {
    return {
      isFlat: false,
      reason: `coverage_too_low (${(maxCoverageFrac * 100).toFixed(1)}% < ${(minCoverageFrac * 100).toFixed(0)}%)`,
      tailAvgDelta: null,
      maxCoverageFrac,
      totalUniqueUrls,
    };
  }

  const tailPoints = greedyCurve.slice(-tailWindow);
  const tailDeltas = tailPoints.map(pt => pt.deltaK);
  const tailAvgDelta = tailDeltas.reduce((a, b) => a + b, 0) / tailDeltas.length;
  const absThreshold = threshold * totalUniqueUrls;

  const isFlat = tailAvgDelta < absThreshold;
  const reason = isFlat
    ? 'flat'
    : `tail_not_flat (avg_delta=${tailAvgDelta.toFixed(1)} >= threshold=${absThreshold.toFixed(1)})`;

  return { isFlat, reason, tailAvgDelta, maxCoverageFrac, totalUniqueUrls };
}
