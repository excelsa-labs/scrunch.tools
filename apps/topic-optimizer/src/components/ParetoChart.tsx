import Plot from 'react-plotly.js';
import { ParetoPoint } from '../engine/types';
import { strategyLabel } from '../utils/strategyLabels';

interface ParetoChartProps {
  paretoEnvelope: Map<number, ParetoPoint[]>;
  selectedPoint: ParetoPoint | null;
}

const COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#6366f1', '#0d9488'];

export function ParetoChart({ paretoEnvelope, selectedPoint }: ParetoChartProps) {
  if (paretoEnvelope.size === 0) return <div className="text-sm text-gray-500">No Pareto data</div>;

  // Group all pareto points by strategy
  const byStrategy = new Map<string, { budget: number; coverage: number; resilience: number }[]>();
  for (const [, points] of paretoEnvelope) {
    for (const p of points) {
      if (!byStrategy.has(p.strategyName)) byStrategy.set(p.strategyName, []);
      byStrategy.get(p.strategyName)!.push({
        budget: p.budget,
        coverage: p.coverageFrac * 100,
        resilience: p.resilienceFrac * 100,
      });
    }
  }

  const strategies = Array.from(byStrategy.keys());

  const traces: Plotly.Data[] = strategies.map((name, i) => {
    const pts = byStrategy.get(name)!.sort((a, b) => a.budget - b.budget);
    return {
      type: 'scatter3d' as const,
      mode: 'markers' as const,
      name: strategyLabel(name),
      x: pts.map(p => p.budget),
      y: pts.map(p => p.coverage),
      z: pts.map(p => p.resilience),
      marker: {
        size: 3,
        color: COLORS[i % COLORS.length],
        opacity: 0.6,
      },
      hovertemplate:
        `<b>${strategyLabel(name)}</b><br>` +
        'Budget: %{x} prompts<br>' +
        'Coverage: %{y:.1f}%<br>' +
        'Resilience: %{z:.1f}%<extra></extra>',
    };
  });

  // Add selected point as a highlighted marker
  if (selectedPoint) {
    traces.push({
      type: 'scatter3d' as const,
      mode: 'markers' as const,
      name: 'Selected',
      x: [selectedPoint.budget],
      y: [selectedPoint.coverageFrac * 100],
      z: [selectedPoint.resilienceFrac * 100],
      marker: {
        size: 10,
        color: '#fbbf24',
        symbol: 'diamond',
        line: { color: '#92400e', width: 2 },
      },
      hovertemplate:
        '<b>Selected Operating Point</b><br>' +
        `Strategy: ${strategyLabel(selectedPoint.strategyName)}<br>` +
        'Budget: %{x} prompts<br>' +
        'Coverage: %{y:.1f}%<br>' +
        'Resilience: %{z:.1f}%<extra></extra>',
    });
  }

  const layout: Partial<Plotly.Layout> = {
    scene: {
      xaxis: { title: { text: 'Budget (prompts)' } },
      yaxis: { title: { text: 'Coverage %' } },
      zaxis: { title: { text: 'Resilience %' } },
      camera: {
        eye: { x: 1.8, y: 1.2, z: 0.8 },
      },
    },
    margin: { l: 0, r: 0, t: 10, b: 0 },
    legend: {
      font: { size: 10 },
      itemsizing: 'constant',
    },
    height: 380,
  };

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-0.5">Pareto Frontier: Budget vs Coverage vs Resilience</h4>
      <p className="text-xs text-gray-400 mb-2">
        Each point is the best achievable coverage and resilience for a given prompt budget — no other approach does better on both.
        Rotate to explore.
      </p>
      <Plot
        data={traces}
        layout={layout}
        config={{ responsive: true, displayModeBar: true, displaylogo: false }}
        style={{ width: '100%' }}
      />
    </div>
  );
}
