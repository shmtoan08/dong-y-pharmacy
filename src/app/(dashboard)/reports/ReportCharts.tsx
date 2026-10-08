"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const fmtShort = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}tr`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
};

export function RevenueChart({ data }: { data: { date: string; revenue: number; collected: number }[] }) {
  const fmt = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
  }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={fmt} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-stone-200" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} />
        <ChartTooltip
          formatter={(v, name) => [`${Number(v ?? 0).toLocaleString("vi-VN")}đ`, name]}
          labelFormatter={(l) => `Ngày ${l}`}
        />
        <Legend />
        <Bar dataKey="revenue" name="Doanh thu" fill="#059669" radius={[4, 4, 0, 0]} />
        <Bar dataKey="collected" name="Thực thu" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VisitChart({ data }: { data: { date: string; visits: number }[] }) {
  const fmt = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={fmt} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-stone-200" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <ChartTooltip labelFormatter={(l) => `Ngày ${l}`} />
        <Legend />
        <Line type="monotone" dataKey="visits" name="Lượt khám" stroke="#059669" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
