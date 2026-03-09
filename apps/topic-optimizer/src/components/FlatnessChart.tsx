import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { CurvePoint } from '../engine/types';

interface FlatnessChartProps {
  curve: CurvePoint[];
  totalUrls: number;
}

export function FlatnessChart({ curve, totalUrls }: FlatnessChartProps) {
  if (curve.length === 0) return <div className="text-sm text-gray-500">No curve data</div>;

  const data = curve.map(pt => ({
    k: pt.k,
    coverage: totalUrls > 0 ? pt.cK / totalUrls : 0,
    newUrls: pt.deltaK,
  }));

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-0.5">Greedy Coverage Curve</h4>
      <p className="text-xs text-gray-400 mb-2">
        Prompts added one at a time in order of maximum new URL contribution.
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="k" tick={{ fontSize: 11 }} label={{ value: 'Prompts (greedy order)', position: 'bottom', offset: 2 }} />
          <YAxis yAxisId="left" domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value: number, name: string) => [
              name === 'Total Coverage' ? `${(value * 100).toFixed(1)}%` : `${value} URLs`,
              name,
            ]}
            labelFormatter={(k: number) => `Prompt #${k}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} verticalAlign="top" />
          <Bar yAxisId="right" dataKey="newUrls" fill="#c4b5fd" opacity={0.6} name="New URLs Added" />
          <Line yAxisId="left" type="monotone" dataKey="coverage" stroke="#7c3aed" strokeWidth={2} dot={false} name="Total Coverage" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
