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
    marginalGain: pt.deltaK,
  }));

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-2">Greedy Coverage Curve</h4>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="k" label={{ value: 'Prompts (greedy order)', position: 'bottom', offset: -2 }} tick={{ fontSize: 11 }} />
          <YAxis yAxisId="left" domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value: number, name: string) => [
              name === 'coverage' ? `${(value * 100).toFixed(1)}%` : value,
              name === 'coverage' ? 'Coverage' : 'Marginal Gain',
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar yAxisId="right" dataKey="marginalGain" fill="#c4b5fd" opacity={0.6} name="Marginal Gain" />
          <Line yAxisId="left" type="monotone" dataKey="coverage" stroke="#7c3aed" strokeWidth={2} dot={false} name="Coverage %" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
