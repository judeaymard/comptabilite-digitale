import React from 'react';
import {
  Calendar,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { formatFCFA, formatPercent, formatDateLabel } from '../../utils/formatters';

export function DayCardsView({ records = [], onEdit, onDelete }) {
  if (records.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
        Aucune opération enregistrée.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-4">
      {records.map((r) => {
        const isDeficit = r.benefice_net < 0;
        return (
          <div
            key={r.id || r.date}
            className={`p-4 sm:p-4.5 rounded-2xl border shadow-card transition-all flex flex-col justify-between ${
              isDeficit
                ? 'border-rose-200/80 bg-rose-50/20 hover:border-rose-300'
                : 'border-slate-200/80 bg-white hover:border-slate-300'
            }`}
          >
            {/* Top row: Date + Status Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-slate-500" strokeWidth={1.8} />
                <span className="font-semibold text-xs sm:text-sm text-slate-900">
                  {formatDateLabel(r.date)}
                </span>
              </div>
              <span
                className={`text-[10.5px] font-medium px-2 py-0.5 rounded-md ${
                  isDeficit
                    ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                }`}
              >
                {isDeficit ? 'Déficitaire' : 'Rentable'}
              </span>
            </div>

            {/* Profit & Margin */}
            <div className="py-4 flex items-baseline justify-between">
              <div>
                <span className="text-[11px] text-slate-400 font-medium">Bénéfice Net</span>
                <div
                  className={`text-2xl font-semibold font-mono tracking-tight ${
                    isDeficit ? 'text-rose-600' : 'text-slate-900'
                  }`}
                >
                  {formatFCFA(r.benefice_net)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 font-medium">Marge %</span>
                <div
                  className={`text-base font-semibold font-mono ${
                    isDeficit ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {formatPercent(r.marge_percent)}
                </div>
              </div>
            </div>

            {/* Financial Breakdown Table */}
            <div className="bg-slate-50/70 rounded-xl p-3 text-xs space-y-2 border border-slate-200/60 font-mono">
              <div className="flex justify-between text-slate-400">
                <span className="font-sans">Capital Initial :</span>
                <span className="text-slate-700">{formatFCFA(r.capital_initial)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-medium">
                <span className="font-sans text-slate-600">CA Journalier :</span>
                <span>+{formatFCFA(r.ca_journalier)}</span>
              </div>
              <div className="flex justify-between text-amber-700 font-medium">
                <span className="font-sans text-slate-600">Dépenses Pub :</span>
                <span>-{formatFCFA(r.depenses_pub)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span className="font-sans">Frais Plateforme (5%) :</span>
                <span>-{formatFCFA(r.frais_plateforme)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200/80 flex justify-between font-semibold text-slate-900">
                <span className="font-sans text-slate-700">Capital Final :</span>
                <span className="text-emerald-700">{formatFCFA(r.capital_final)}</span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-[11px]">Cumul CA : {formatFCFA(r.cumul_ca)}</span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => onEdit(r)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition"
                  title="Modifier"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDelete(r)}
                  className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                  title="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
