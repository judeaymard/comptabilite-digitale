import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, ChevronDown, ChevronUp, RefreshCw, UserCheck, Filter } from 'lucide-react';
import { api } from '../../api/client';

export function AuditLogViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [userFilter, setUserFilter] = useState('ALL'); // 'ALL' | 'Jude' | 'Benoit'
  const [actionFilter, setActionFilter] = useState('ALL');

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = { limit: 150 };
      if (userFilter !== 'ALL') params.user = userFilter;
      if (actionFilter !== 'ALL') params.action = actionFilter;

      const res = await api.getAuditLogs(params);
      if (res.success) setLogs(res.logs);
    } catch (err) {
      console.error('Erreur chargement logs audit:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [userFilter, actionFilter]);

  const getActionBadge = (action) => {
    switch (action) {
      case 'CREATE':
        return <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10.5px] font-medium">CRÉATION</span>;
      case 'UPDATE':
        return <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 text-[10.5px] font-medium">MODIFICATION</span>;
      case 'DELETE':
        return <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/60 text-[10.5px] font-medium">SUPPRESSION</span>;
      case 'SEED':
        return <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60 text-[10.5px] font-medium">INITIALISATION</span>;
      case 'IMPORT':
        return <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200/60 text-[10.5px] font-medium">IMPORTATION</span>;
      case 'CLEAR':
        return <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/60 text-[10.5px] font-medium">NETTOYAGE</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10.5px] font-medium">{action}</span>;
    }
  };

  const getUserBadge = (author) => {
    const name = author || 'Jude';
    const isJude = name.toLowerCase().includes('jude');
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
          isJude
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200/70'
            : 'bg-teal-50 text-teal-800 border-teal-200/70'
        }`}
      >
        <span
          className={`w-3.5 h-3.5 rounded-full text-[9px] font-bold text-white flex items-center justify-center ${
            isJude ? 'bg-emerald-600' : 'bg-teal-600'
          }`}
        >
          {name.charAt(0).toUpperCase()}
        </span>
        <span>{name}</span>
      </span>
    );
  };

  return (
    <div className="space-y-4 min-w-0">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/60">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
            Journal d’Audit & Traçabilité Multi-Comptable
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Historique certifié : chaque saisie et recalcul en cascade est signé par son auteur (Jude ou Benoit).
          </p>
        </div>

        <button
          onClick={loadLogs}
          disabled={loading}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 text-xs font-medium text-slate-700 hover:bg-slate-50 transition self-start sm:self-auto shrink-0 shadow-2xs active:scale-95"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-slate-900' : 'text-slate-500'}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Filter Toolbar (Author + Actions) */}
      <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-card flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5" />
            Auteur :
          </span>

          <button
            onClick={() => setUserFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              userFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Tous les auteurs
          </button>
          <button
            onClick={() => setUserFilter('Jude')}
            className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
              userFilter === 'Jude'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Jude
          </button>
          <button
            onClick={() => setUserFilter('Benoit')}
            className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
              userFilter === 'Benoit'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-teal-800 hover:bg-teal-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-teal-400" />
            Benoit
          </button>
        </div>

        {/* Action filter */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Action :
          </span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="ALL">Toutes les actions</option>
            <option value="CREATE">Créations</option>
            <option value="UPDATE">Modifications</option>
            <option value="DELETE">Suppressions</option>
            <option value="IMPORT">Imports</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-card overflow-hidden min-w-0">
        <div className="overflow-x-auto min-w-0">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-semibold text-[10.5px] uppercase tracking-wider border-b border-slate-200/80">
                <th className="py-2.5 px-3 whitespace-nowrap">Horodatage</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Auteur</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Action</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Entité</th>
                <th className="py-2.5 px-3">Description & Motif</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Détails (Diff)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-400">
                    Aucun événement d'audit ne correspond aux filtres sélectionnés.
                  </td>
                </tr>
              ) : (
                logs.map((l) => {
                  const isExpanded = expandedLogId === l.id;
                  const dateStr = new Date(l.timestamp).toLocaleString('fr-FR');
                  return (
                    <React.Fragment key={l.id}>
                      <tr className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap flex items-center space-x-1.5">
                          <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{dateStr}</span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {getUserBadge(l.user)}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">{getActionBadge(l.action)}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-800 whitespace-nowrap">
                          {l.entity} {l.entity_id ? `#${l.entity_id}` : ''}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {l.reason || 'Opération système'}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {(l.old_values || l.new_values) ? (
                            <button
                              onClick={() => setExpandedLogId(isExpanded ? null : l.id)}
                              className="px-2 py-0.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition flex items-center gap-1 mx-auto text-[11px] font-medium"
                            >
                              <span>{isExpanded ? 'Masquer' : 'Voir'}</span>
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Diff Block */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70">
                          <td colSpan="6" className="p-3.5 border-b border-slate-200/80">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 font-mono text-[11px]">
                              {l.old_values && (
                                <div className="p-3 rounded-xl bg-white border border-rose-200/70 shadow-2xs">
                                  <div className="font-semibold text-rose-700 mb-1 font-sans">
                                    Valeurs Précédentes (Avant) :
                                  </div>
                                  <pre className="text-rose-900 overflow-x-auto whitespace-pre-wrap text-[10.5px]">
                                    {JSON.stringify(l.old_values, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {l.new_values && (
                                <div className="p-3 rounded-xl bg-white border border-emerald-200/70 shadow-2xs">
                                  <div className="font-semibold text-emerald-700 mb-1 font-sans">
                                    Nouvelles Valeurs (Après) :
                                  </div>
                                  <pre className="text-emerald-900 overflow-x-auto whitespace-pre-wrap text-[10.5px]">
                                    {JSON.stringify(l.new_values, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
export default AuditLogViewer;
