import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ReferenceDot,
} from 'recharts';
import { ParetoPoint } from '../engine/types';

interface ParetoChartProps {
  paretoEnvelope: Map<number, ParetoPoint[]>;
  selectedPoint: ParetoPoint | null;
}

const COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#6366f1', '#0d9488'];

export function ParetoChart({ paretoEnvelope, selectedPoint }: ParetoChartProps) {
  if (paretoEnvelope.size === 0) return <div className="text-sm text-gray-500">No Pareto data</div>;

  // Group all pareto points by strategy
  const byStrategy = new Map<string, { coverageFrac: number; resilienceFrac: number; budget: number }[]>();
  for (const [, points] of paretoEnvelope) {
    for (const p of points) {
      if (!byStrategy.has(p.strategyName)) byStrategy.set(p.strategyName, []);
      byStrategy.get(p.strategyName)!.push({
        coverageFrac: p.coverageFrac,
        resilienceFrac: p.resilienceFrac,
        budget: p.budget,
      });
    }
  }

  const strategies = Array.from(byStrategy.keys());

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-2">Pareto Frontier (Coverage vs Resilience)</h4>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            dataKey="coverageFrac"
            name="Coverage"
            domain={[0, 'auto']}
            tickFormatter={v => `${(v * 100).toFixed(0)}%`}
            tick={{ fontSize: 11 }}
            label={{ value: 'Coverage', position: 'bottom', offset: -2 }}
          />
          <YAxis
            type="number"
            dataKey="resilienceFrac"
            name="Resilience"
            domain={[0, 'auto']}
            tickFormatter={v => `${(v * 100).toFixed(0)}%`}
            tick={{ fontSize: 11 }}
            label={{ value: 'Resilience', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            formatter={(value: number) => `${(value * 100).toFixed(2)}%`}
            labelFormatter={() => ''}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {strategies.map((name, i) => (
            <Scatter
              key={name}
              name={name}
              data={byStrategy.get(name)!}
              fill={COLORS[i % COLORS.length]}
              opacity={0.5}
              r={3}
            />
          ))}
          {selectedPoint && (
            <ReferenceDot
              x={selectedPoint.coverageFrac}
              y={selectedPoint.resilienceFrac}
              r={8}
              fill="#fbbf24"
              stroke="#92400e"
              strokeWidth={2}
            />
          )}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
