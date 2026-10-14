import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import { formatDateShort, formatFCFA } from '../../utils/formatters';
import { useTheme } from '../../context/ThemeContext';

export function FinancialCharts({ records = [] }) {
  const { isDark } = useTheme();
  const [activeChart, setActiveChart] = useState('capital'); // 'capital' | 'bars' | 'margin'

  const gridColor = isDark ? '#1E293B' : '#F1F5F9';
  const axisColor = isDark ? '#64748B' : '#94A3B8';
  const capitalLineColor = isDark ? '#10B981' : '#0F172A';
  const caBarColor = isDark ? '#38BDF8' : '#0F172A';

  const chartData = records.map((r) => ({
    date: r.date,
    dateLabel: formatDateShort(r.date),
    capitalFinal: r.capital_final,
    ca: r.ca_journalier,
    pub: r.depenses_pub,
    benefice: r.benefice_net,
    marge: r.marge_percent,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-modal text-xs space-y-1.5">
          <div className="font-semibold text-slate-900 border-b border-slate-100 pb-1">
            {payload[0]?.payload?.date} ({label})
          </div>
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center justify-between space-x-4">
              <span style={{ color: entry.color }} className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                {entry.name}:
              </span>
              <span className="font-mono font-semibold text-slate-900">
                {entry.name.includes('Marge') ? `${entry.value}%` : formatFCFA(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 sm:p-5 shadow-card space-y-3">
      {/* Chart Header & Segmented Pill Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight">
            Analyses & Évolution Financière
          </h3>
          <p className="text-xs text-slate-400">
            Alimenté par les données réelles du journal ({records.length} journées)
          </p>
        </div>

        {/* Tab Switcher: Minimalist Segmented Control */}
        <div className="flex flex-wrap items-center bg-slate-100/80 p-0.5 rounded-lg text-xs font-medium">
          <button
            onClick={() => setActiveChart('capital')}
            className={`px-2.5 py-1 rounded-md transition ${
              activeChart === 'capital'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Croissance Capital
          </button>
          <button
            onClick={() => setActiveChart('bars')}
            className={`px-2.5 py-1 rounded-md transition ${
              activeChart === 'bars'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            CA vs Pub vs Profit
          </button>
          <button
            onClick={() => setActiveChart('margin')}
            className={`px-2.5 py-1 rounded-md transition ${
              activeChart === 'margin'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Marge Nette %
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-60 sm:h-72 w-full pt-1">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">
            Aucune donnée enregistrée pour afficher les courbes.
          </div>
        ) : activeChart === 'capital' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="capitalGradientObsidian" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={capitalLineColor} stopOpacity={isDark ? 0.25 : 0.12} />
                  <stop offset="95%" stopColor={capitalLineColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="dateLabel" stroke={axisColor} fontSize={11} tickLine={false} />
              <YAxis
                stroke={axisColor}
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => `${Math.round(val / 1000)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="capitalFinal"
                name="Capital Final"
                stroke={capitalLineColor}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#capitalGradientObsidian)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : activeChart === 'bars' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="dateLabel" stroke={axisColor} fontSize={11} tickLine={false} />
              <YAxis
                stroke={axisColor}
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => `${Math.round(val / 1000)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="ca" name="CA Journalier" fill={caBarColor} radius={[4, 4, 0, 0]} />
              <Bar dataKey="pub" name="Dépenses Pub" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="benefice" name="Bénéfice Net" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="dateLabel" stroke={axisColor} fontSize={11} tickLine={false} />
              <YAxis
                stroke={axisColor}
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#F43F5E" strokeDasharray="3 3" label={{ value: 'Seuil 0%', fill: '#F43F5E', fontSize: 10 }} />
              <Line
                type="monotone"
                dataKey="marge"
                name="Marge %"
                stroke={capitalLineColor}
                strokeWidth={2}
                dot={{ r: 3, fill: capitalLineColor }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
