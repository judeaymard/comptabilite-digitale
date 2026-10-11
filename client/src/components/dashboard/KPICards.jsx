import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Wallet,
  Megaphone,
  CreditCard,
  AlertTriangle,
  Award,
  Sparkles,
} from 'lucide-react';
import { formatFCFA, formatPercent } from '../../utils/formatters';

export function KPICards({ kpis, todayRecord }) {
  const cards = [
    {
      title: 'Capital Final',
      value: formatFCFA(kpis?.capitalFinalCurrent),
      subtitle: `Initial : ${formatFCFA(kpis?.capitalInitialPeriod)}`,
      badge: kpis?.netGain >= 0 ? `+${formatFCFA(kpis?.netGain)}` : `${formatFCFA(kpis?.netGain)}`,
      badgeLabel: 'Gain net',
      badgePositive: kpis?.netGain >= 0,
      icon: Wallet,
    },
    {
      title: 'CA Cumulé',
      value: formatFCFA(kpis?.totalCA),
      subtitle: todayRecord ? `Dernier jour : ${formatFCFA(todayRecord.ca_journalier)}` : 'Volume total',
      badge: `${kpis?.totalDaysCount || 0}j`,
      badgeLabel: 'Activité',
      badgePositive: true,
      icon: DollarSign,
    },
    {
      title: 'Dépenses Pub',
      value: formatFCFA(kpis?.totalPub),
      subtitle: todayRecord ? `Dernier jour : ${formatFCFA(todayRecord.depenses_pub)}` : 'Budget pub total',
      badge: `${kpis?.roas || 0}x`,
      badgeLabel: 'ROAS',
      badgePositive: (kpis?.roas || 0) >= 2.0,
      icon: Megaphone,
    },
    {
      title: 'Frais Plateforme',
      value: formatFCFA(kpis?.totalFrais),
      subtitle: 'Commissions 5%',
      badge: '5,0%',
      badgeLabel: 'Fixe',
      badgePositive: null,
      icon: CreditCard,
    },
    {
      title: 'Bénéfice Net',
      value: formatFCFA(kpis?.totalBeneficeNet),
      subtitle: todayRecord ? `Dernier jour : ${formatFCFA(todayRecord.benefice_net)}` : 'Profit net encaissé',
      badge: kpis?.totalBeneficeNet >= 0 ? 'Rentable' : 'Déficit',
      badgeLabel: 'Statut',
      badgePositive: kpis?.totalBeneficeNet >= 0,
      icon: kpis?.totalBeneficeNet >= 0 ? TrendingUp : TrendingDown,
    },
    {
      title: 'Marge Globale',
      value: formatPercent(kpis?.globalMarginPercent),
      subtitle: 'Pondérée (Net / CA)',
      badge: (kpis?.globalMarginPercent || 0) >= 50 ? 'Excellente' : 'Standard',
      badgeLabel: 'Marge',
      badgePositive: (kpis?.globalMarginPercent || 0) >= 40,
      icon: Percent,
    },
  ];

  return (
    <div className="space-y-3.5 min-w-0">
      {/* 1. Panoramic High-Density Grid (2 col on mobile, 3 on md, 6 on xl) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3.5">
        {cards.map((c, idx) => {
          const Icon = c.icon;
          const isNegativeVal = c.title.includes('Bénéfice') && kpis?.totalBeneficeNet < 0;

          return (
            <div
              key={idx}
              className="bg-white border border-slate-200/80 rounded-xl p-2.5 sm:p-4 shadow-card hover:border-slate-300 transition-all flex flex-col justify-between min-w-0"
            >
              <div className="flex items-center justify-between mb-1 sm:mb-2 min-w-0 gap-1">
                <span className="text-[9.5px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-tight sm:tracking-wider truncate">
                  {c.title}
                </span>
                <div className="p-1 sm:p-1.5 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-600 shrink-0">
                  <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={1.8} />
                </div>
              </div>

              <div className="min-w-0">
                <div
                  className={`text-sm sm:text-lg xl:text-[20px] 2xl:text-[22px] font-semibold tracking-tight font-mono truncate ${
                    isNegativeVal ? 'text-rose-600' : 'text-slate-900'
                  }`}
                  title={c.value}
                >
                  {c.value}
                </div>
                <div className="mt-0.5 text-[10px] sm:text-[11px] text-slate-400 truncate" title={c.subtitle}>
                  {c.subtitle}
                </div>
              </div>

              {c.badge && (
                <div className="mt-2 sm:mt-2.5 pt-1.5 sm:pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] min-w-0">
                  <span className="text-slate-400 hidden sm:inline truncate">{c.badgeLabel}</span>
                  <span
                    className={`font-medium px-1.5 py-0.2 sm:py-0.5 rounded text-[9.5px] sm:text-[10px] truncate max-w-full ml-auto ${
                      c.badgePositive === true
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                        : c.badgePositive === false
                        ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                        : 'bg-slate-50 text-slate-600 border border-slate-200/60'
                    }`}
                  >
                    {c.badge}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 2. Operational Health Summary: Dense & Compact */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 sm:p-4 shadow-card grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
        {/* Rentables */}
        <div className="flex items-center space-x-3 p-1 sm:p-1.5">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
            <Award className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400">Journées Rentables</div>
            <div className="text-sm sm:text-base font-semibold text-slate-900 font-mono">
              {kpis?.winningDaysCount || 0} jours{' '}
              <span className="text-xs text-emerald-600 font-normal font-sans">
                ({kpis?.totalDaysCount ? Math.round((kpis.winningDaysCount / kpis.totalDaysCount) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>

        {/* Déficitaires */}
        <div className="flex items-center space-x-3 p-1 sm:p-1.5 sm:border-l sm:border-slate-100">
          <div className="p-2 rounded-xl bg-rose-50 text-rose-600 shrink-0">
            <AlertTriangle className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400">Journées Déficitaires</div>
            <div className="text-sm sm:text-base font-semibold text-slate-900 font-mono">
              {kpis?.losingDaysCount || 0} jours{' '}
              <span className="text-xs text-rose-600 font-normal font-sans">
                ({kpis?.totalDaysCount ? Math.round((kpis.losingDaysCount / kpis.totalDaysCount) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>

        {/* ROAS */}
        <div className="flex items-center space-x-3 p-1 sm:p-1.5 sm:border-l sm:border-slate-100">
          <div className="p-2 rounded-xl bg-slate-100 text-slate-700 shrink-0">
            <Sparkles className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400">Rendement Pub (ROAS)</div>
            <div className="text-sm sm:text-base font-semibold text-slate-900 font-mono">
              {kpis?.roas || 0}x{' '}
              <span className="text-xs text-slate-400 font-normal font-sans">
                (1 F investi → {kpis?.roas || 0} F)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default KPICards;
