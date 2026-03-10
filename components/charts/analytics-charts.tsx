"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export function HorizontalBarList(props: {
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
  color?: string;
}) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={props.data} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
          <XAxis type="number" stroke="#64748B" fontSize={12} />
          <YAxis dataKey={props.yKey} type="category" stroke="#64748B" fontSize={12} width={110} />
          <Tooltip />
          <Bar dataKey={props.xKey} fill={props.color ?? "#1A54D9"} radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
