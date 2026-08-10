import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="rounded-xl px-3 py-2 shadow-xl border"
        style={{ backgroundColor: 'var(--color-ink-2)', borderColor: 'var(--color-ink-4)' }}
      >
        <p className="font-mono-label text-[9px] uppercase tracking-[0.15em] mb-1" style={{ color: 'var(--color-smoke)' }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="font-body text-sm font-semibold" style={{ color: 'var(--color-bone)' }}>
            {p.name}: <span style={{ color: p.color }}>{p.value?.toLocaleString()}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function TrendChart({ data, dataKey = 'value', name = 'Volume', color = '#c8f542', height = 200 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-ink-4)" />
        <XAxis
          dataKey="date"
          tick={{ fill: 'var(--color-moss)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: 'var(--color-moss)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey={dataKey}
          name={name}
          stroke={color}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 0, fill: color }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
