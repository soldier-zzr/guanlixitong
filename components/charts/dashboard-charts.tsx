"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { formatPercent } from "@/lib/utils";

export function RefundTrendChart(props: {
  data: Array<{ period: string; refundRate: number; refundCount: number; warningCount: number }>;
}) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={props.data}>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
          <XAxis dataKey="period" stroke="#64748B" fontSize={12} />
          <YAxis stroke="#64748B" fontSize={12} tickFormatter={(value) => `${value * 100}%`} />
          <Tooltip
            formatter={(value: number, name: string) => [
              name === "refundRate" ? formatPercent(value) : value,
              name === "refundRate" ? "退款率" : name === "refundCount" ? "退款人数" : "预警人数"
            ]}
          />
          <Line dataKey="refundRate" type="monotone" stroke="#1A54D9" strokeWidth={3} dot />
          <Line dataKey="warningCount" type="monotone" stroke="#F57B15" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RiskDistributionChart(props: { data: Array<{ name: string; value: number }> }) {
  const colors = ["#16A34A", "#D97706", "#DC2626"];

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={props.data}
            dataKey="value"
            nameKey="name"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={4}
          >
            {props.data.map((entry, index) => (
              <Cell key={entry.name} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueCompareChart(props: {
  data: Array<{ cohort: string; grossRevenue: number; netRevenue: number }>;
}) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={props.data}>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
          <XAxis dataKey="cohort" stroke="#64748B" fontSize={12} />
          <YAxis stroke="#64748B" fontSize={12} />
          <Tooltip />
          <Bar dataKey="grossRevenue" fill="#1A54D9" radius={[8, 8, 0, 0]} />
          <Bar dataKey="netRevenue" fill="#F57B15" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FunnelStageChart(props: {
  data: Array<{ stage: string; count: number }>;
}) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={props.data}>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
          <XAxis dataKey="stage" stroke="#64748B" fontSize={12} />
          <YAxis stroke="#64748B" fontSize={12} />
          <Tooltip />
          <Bar dataKey="count" fill="#1A54D9" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
