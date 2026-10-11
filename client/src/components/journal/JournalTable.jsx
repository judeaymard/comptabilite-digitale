import React, { useState } from 'react';
import {
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ArrowUpDown,
  Calendar,
} from 'lucide-react';
import { formatFCFA, formatPercent, formatDateLabel } from '../../utils/formatters';

export function JournalTable({ records = [], onEdit, onDelete }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'WIN' | 'LOSS'
  const [sortOrder, setSortOrder] = useState('DESC'); // 'ASC' | 'DESC'

  const filtered = records
    .filter((r) => {
      const matchSearch =
        r.date.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatDateLabel(r.date).toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;
      if (statusFilter === 'WIN') return r.benefice_net > 0;
      if (statusFilter === 'LOSS') return r.benefice_net < 0;
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === 'ASC') return a.date > b.date ? 1 : -1;
      return a.date < b.date ? 1 : -1;
    });

  return (
    <div className="space-y-3 min-w-0">
      {/* 1. Sleek Controls Bar */}
      <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-2.5 min-w-0">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Search box */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher une date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Tous ({records.length})
            </button>
            <button
              onClick={() => setStatusFilter('WIN')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                statusFilter === 'WIN'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-semibold'
                  : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-50'
              }`}
            >
              Rentables
            </button>
            <button
              onClick={() => setStatusFilter('LOSS')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                statusFilter === 'LOSS'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200/80 font-semibold'
                  : 'text-slate-500 hover:text-rose-700 hover:bg-slate-50'
              }`}
            >
              Déficitaires
            </button>
          </div>
        </div>

        {/* Sort order toggle */}
        <button
          onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 text-xs font-medium text-slate-700 hover:bg-slate-50 transition self-start md:self-auto shrink-0 shadow-2xs"
        >
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
          <span>{sortOrder === 'DESC' ? 'Récents d’abord' : 'Anciens d’abord'}</span>
        </button>
      </div>

      {/* 2. Isolated Table Container with Clean Minimalist Header */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-card overflow-hidden min-w-0">
        <div className="overflow-x-auto min-w-0">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[10.5px] border-b border-slate-200/80">
                <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap font-medium">Capital Initial</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap font-medium text-slate-900">CA Journalier</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap font-medium text-amber-700">Dépenses Pub</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap font-medium text-slate-500">Frais (5%)</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap font-medium">Bénéfice Net</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap font-medium">Marge %</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap font-medium">Capital Final</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap font-medium">Cumul CA</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-400 font-sans">
                    Aucune journée enregistrée correspondant aux critères.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const isDeficit = r.benefice_net < 0;
                  return (
                    <tr
                      key={r.id || r.date}
                      className={`transition-colors ${
                        isDeficit
                          ? 'bg-rose-50/25 border-l-2 border-l-rose-500 hover:bg-rose-50/40'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Date */}
                      <td className="py-2 px-3 font-sans font-medium text-slate-900 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {isDeficit ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" title="Journée déficitaire" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" title="Journée rentable" />
                          )}
                          <div>
                            <div className="font-semibold text-slate-900 leading-tight">{formatDateLabel(r.date)}</div>
                            <div className="text-[10px] text-slate-400 font-mono leading-none">{r.date}</div>
                          </div>
                        </div>
                      </td>

                      {/* Capital Initial */}
                      <td className="py-2 px-3 text-right text-slate-500 whitespace-nowrap">
                        {formatFCFA(r.capital_initial)}
                      </td>

                      {/* CA Journalier */}
                      <td className="py-2 px-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                        {formatFCFA(r.ca_journalier)}
                      </td>

                      {/* Dépenses Pub */}
                      <td className="py-2 px-3 text-right font-medium text-amber-700 whitespace-nowrap">
                        {formatFCFA(r.depenses_pub)}
                      </td>

                      {/* Frais */}
                      <td className="py-2 px-3 text-right text-slate-400 whitespace-nowrap">
                        {formatFCFA(r.frais_plateforme)}
                      </td>

                      {/* Bénéfice Net */}
                      <td className="py-2 px-3 text-right font-semibold whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] ${
                            isDeficit
                              ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          }`}
                        >
                          {formatFCFA(r.benefice_net)}
                        </span>
                      </td>

                      {/* Marge % */}
                      <td className="py-2 px-3 text-right font-semibold whitespace-nowrap">
                        <span className={isDeficit ? 'text-rose-600' : 'text-emerald-600'}>
                          {formatPercent(r.marge_percent)}
                        </span>
                      </td>

                      {/* Capital Final */}
                      <td className="py-2 px-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                        {formatFCFA(r.capital_final)}
                      </td>

                      {/* Cumul CA */}
                      <td className="py-2 px-3 text-right text-slate-600 whitespace-nowrap">
                        {formatFCFA(r.cumul_ca)}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-center font-sans whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => onEdit(r)}
                            title="Modifier cette journée"
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => onDelete(r)}
                            title="Supprimer cette journée"
                            className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
