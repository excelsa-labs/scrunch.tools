import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine,
} from 'recharts';
import { EliminationTrajectory } from '../engine/types';

interface TrajectoryChartProps {
  trajectories: EliminationTrajectory[];
  selectedBudget: number;
}

const COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#6366f1', '#0d9488'];

export function TrajectoryChart({ trajectories, selectedBudget }: TrajectoryChartProps) {
  if (trajectories.length === 0) return <div className="text-sm text-gray-500">No trajectory data</div>;

  // Build unified data keyed by budget
  const budgets = new Set<number>();
  for (const t of trajectories) {
    for (const p of t.points) budgets.add(p.budget);
  }
  const sortedBudgets = Array.from(budgets).sort((a, b) => b - a);

  const data = sortedBudgets.map(budget => {
    const row: Record<string, number> = { budget };
    for (const t of trajectories) {
      const pt = t.points.find(p => p.budget === budget);
      if (pt) {
        row[`${t.strategyName}_cov`] = pt.coverageFrac;
        row[`${t.strategyName}_res`] = pt.resilienceFrac;
      }
    }
    return row;
  });

  // Only show top 3 strategies to avoid clutter
  const strats = trajectories.slice(0, 3);

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-2">Elimination Trajectories (Coverage & Resilience vs Budget)</h4>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="budget" reversed tick={{ fontSize: 11 }} label={{ value: 'Budget (prompts)', position: 'bottom', offset: -2 }} />
          <YAxis domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value: number) => `${(value * 100).toFixed(2)}%`} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {strats.map((t, i) => (
            <Line
              key={`${t.strategyName}_cov`}
              dataKey={`${t.strategyName}_cov`}
              name={`${t.strategyName} (cov)`}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
          {strats.map((t, i) => (
            <Line
              key={`${t.strategyName}_res`}
              dataKey={`${t.strategyName}_res`}
              name={`${t.strategyName} (res)`}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
            />
          ))}
          <ReferenceLine x={selectedBudget} stroke="#fbbf24" strokeWidth={2} strokeDasharray="4 4" label={{ value: 'Selected', position: 'top', fill: '#92400e', fontSize: 10 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
