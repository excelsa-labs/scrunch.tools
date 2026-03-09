import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine,
} from 'recharts';
import { EliminationTrajectory } from '../engine/types';
import { strategyLabel } from '../utils/strategyLabels';

interface TrajectoryChartProps {
  trajectories: EliminationTrajectory[];
  selectedBudget: number;
  selectedStrategy: string;
}

const COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#6366f1', '#0d9488'];

export function TrajectoryChart({ trajectories, selectedBudget, selectedStrategy }: TrajectoryChartProps) {
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
      }
    }
    return row;
  });

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-0.5">Coverage Retention by Strategy</h4>
      <p className="text-xs text-gray-400 mb-2">
        How URL coverage changes as prompts are removed, for each pruning approach.
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="budget" reversed tick={{ fontSize: 11 }} label={{ value: 'Budget (prompts kept)', position: 'bottom', offset: 2 }} />
          <YAxis domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value: number, name: string) => [`${(value * 100).toFixed(2)}%`, name]}
            labelFormatter={(budget: number) => `${budget} prompts kept`}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} iconType="line" verticalAlign="top" />
          {trajectories.map((t, i) => {
            const isSelected = t.strategyName === selectedStrategy;
            return (
              <Line
                key={`${t.strategyName}_cov`}
                dataKey={`${t.strategyName}_cov`}
                name={strategyLabel(t.strategyName)}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={isSelected ? 3 : 1}
                strokeOpacity={isSelected ? 1 : 0.3}
                dot={false}
              />
            );
          })}
          <ReferenceLine x={selectedBudget} stroke="#fbbf24" strokeWidth={2} strokeDasharray="4 4" label={{ value: 'Selected', position: 'insideTopRight', fill: '#92400e', fontSize: 10 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
