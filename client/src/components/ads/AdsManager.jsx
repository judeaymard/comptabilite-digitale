import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Trash2,
  PieChart as PieIcon,
  CheckCircle,
  ArrowRightLeft,
} from 'lucide-react';
import { api } from '../../api/client';
import { useNotify } from '../../context/NotificationContext';
import { formatFCFA, formatDateLabel } from '../../utils/formatters';

export function AdsManager({ onExpenseAdded }) {
  const { confirm, notify } = useNotify();
  const [ads, setAds] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('FCFA'); // 'FCFA' | 'USD' | 'EUR'
  const [ratesData, setRatesData] = useState(null);
  const [platform, setPlatform] = useState('Facebook Ads');
  const [campaign, setCampaign] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [resAds, resSummary, resRates] = await Promise.all([
        api.getAds(),
        api.getAdsSummary(),
        api.getCurrencyRates().catch(() => ({ success: false })),
      ]);
      if (resAds.success) setAds(resAds.ads);
      if (resSummary.success) setSummary(resSummary.summary);
      if (resRates?.success) setRatesData(resRates);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeRate = currency === 'USD'
    ? (ratesData?.rates?.USD || 610)
    : currency === 'EUR'
    ? (ratesData?.rates?.EUR || 655.957)
    : 1;

  const convertedFCFA = currency === 'FCFA'
    ? (Number(amount) || 0)
    : Math.round((Number(amount) || 0) * activeRate);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !date) return;

    try {
      setSubmitting(true);
      const fcfaAmount = currency === 'FCFA'
        ? Number(amount)
        : Math.round(Number(amount) * activeRate);

      const res = await api.createAd({
        date,
        amount: fcfaAmount,
        platform,
        campaign,
        notes,
        original_currency: currency,
        original_amount: currency !== 'FCFA' ? Number(amount) : null,
        exchange_rate: currency !== 'FCFA' ? activeRate : null,
      });

      const originalAmtLabel = currency !== 'FCFA'
        ? ` (${amount} ${currency} = ${formatFCFA(fcfaAmount)})`
        : '';

      setAmount('');
      setCampaign('');
      setNotes('');
      
      if (res.journalUpdated) {
        notify.success(`Dépense de ${formatFCFA(fcfaAmount)}${originalAmtLabel} enregistrée et synchronisée avec la journée du ${date} dans le Journal !`);
      } else {
        notify.success(`Dépense de ${formatFCFA(fcfaAmount)}${originalAmtLabel} enregistrée. Elle sera pré-remplie lors de l'ajout de la journée du ${date} !`);
      }
      await loadData();
      if (onExpenseAdded) onExpenseAdded();
    } catch (err) {
      notify.error(err.message || 'Erreur lors de l’enregistrement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Supprimer cette dépense publicitaire',
      message: 'Voulez-vous vraiment supprimer cette dépense ? Si une journée comptable correspond à cette date, son montant pub sera ajusté.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await api.deleteAd(id);
      notify.success('Dépense publicitaire supprimée avec succès.');
      await loadData();
      if (onExpenseAdded) onExpenseAdded();
    } catch (err) {
      notify.error(err.message || 'Erreur lors de la suppression.');
    }
  };

  const platforms = [
    'Facebook Ads',
    'TikTok Ads',
    'Google Ads',
    'Snapchat Ads',
    'Influenceurs',
    'Autre',
  ];

  return (
    <div className="space-y-6 min-w-0">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
            Dépenses Publicitaires
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi des budgets par régie (Facebook, TikTok, Google) et coûts d’acquisition.
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400">Total Dépensé</span>
            <div className="text-sm font-semibold text-amber-700 font-mono">
              {formatFCFA(summary?.totalSpend || 0)}
            </div>
          </div>
          <div className="h-6 w-px bg-slate-200"></div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400">Lignes</span>
            <div className="text-sm font-semibold text-slate-900 font-mono">
              {summary?.totalEntries || 0}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Grid: Form + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 min-w-0">
        {/* Left Column: Add Ad Spend Form */}
        <div className="lg:col-span-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-card space-y-3.5">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <Plus className="h-4 w-4 text-slate-700" strokeWidth={2} />
            <h3 className="text-sm font-semibold text-slate-900">Nouvelle Dépense</h3>
          </div>

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Plateforme Publicitaire
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
              >
                {platforms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Montant Dépensé
                </label>
                {/* Currency selector tabs */}
                <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-slate-100 border border-slate-200/80 text-[11px]">
                  {['FCFA', 'USD', 'EUR'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCurrency(c)}
                      className={`px-2 py-0.5 rounded-md font-medium transition ${
                        currency === c
                          ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {c === 'USD' ? '$ USD' : c === 'EUR' ? '€ EUR' : 'FCFA'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step={currency === 'FCFA' ? '1' : '0.01'}
                  placeholder={
                    currency === 'USD'
                      ? 'ex: 25 ($)'
                      : currency === 'EUR'
                      ? 'ex: 20 (€)'
                      : 'ex: 15000 (FCFA)'
                  }
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
                />
              </div>

              {/* Real-time conversion preview */}
              {currency !== 'FCFA' && Number(amount) > 0 && (
                <div className="mt-2 p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/70 text-emerald-900 text-xs flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center space-x-1.5">
                    <ArrowRightLeft className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>
                      Montant converti : <strong className="font-mono font-semibold text-emerald-800">{formatFCFA(convertedFCFA)}</strong>
                    </span>
                  </div>
                  <span className="text-[10.5px] text-emerald-700 font-mono">
                    1 {currency} = {activeRate} FCFA
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nom de la Campagne (facultatif)
              </label>
              <input
                type="text"
                placeholder="ex: Scaling Côte d’Ivoire #2"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Commentaires / Justificatif
              </label>
              <input
                type="text"
                placeholder="ex: Facture Carte #9401"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition shadow-xs disabled:opacity-50 active:scale-95"
            >
              {submitting ? 'Enregistrement...' : 'Enregistrer la Dépense'}
            </button>
          </form>
        </div>

        {/* Middle & Right Columns: Platform Share & Table */}
        <div className="lg:col-span-8 space-y-4 sm:space-y-5 min-w-0">
          {/* Breakdown cards */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-card space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center space-x-2">
              <PieIcon className="h-4 w-4 text-slate-500" />
              <span>Répartition des Budgets par Régie</span>
            </h3>

            {summary?.platformShare && summary.platformShare.length > 0 ? (
              <div className="space-y-3 pt-1">
                {summary.platformShare.map((p, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-800">{p.platform}</span>
                      <span className="text-slate-500 font-mono">
                        {formatFCFA(p.amount)} ({p.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-slate-900 rounded-full"
                        style={{ width: `${Math.min(100, p.percentage)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3">Aucune dépense enregistrée pour le moment.</p>
            )}
          </div>

          {/* Table of detailed ad expenses */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-card space-y-3 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center justify-between">
              <span>Historique des Dépenses Publicitaires</span>
              <span className="text-xs text-slate-400 font-normal">
                {ads.length} entrées
              </span>
            </h3>

            <div className="overflow-x-auto min-w-0 max-h-[460px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 text-slate-400 font-semibold bg-slate-50/70 text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Régie</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Campagne</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Montant</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {ads.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-400 font-sans">
                        Aucune dépense publicitaire détaillée.
                      </td>
                    </tr>
                  ) : (
                    ads.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 font-sans text-slate-800 whitespace-nowrap">{a.date}</td>
                        <td className="py-2.5 px-3 font-sans whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60 text-[10.5px] font-medium">
                            {a.platform}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-500 text-[11px] max-w-[160px] truncate" title={a.campaign}>
                          {a.campaign || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-amber-700 whitespace-nowrap">
                          <div>{formatFCFA(a.amount)}</div>
                          {a.original_currency && a.original_currency !== 'FCFA' && a.original_amount && (
                            <div className="text-[10px] font-sans text-slate-400 font-normal">
                              {a.original_currency === 'USD' ? '$' : '€'}{a.original_amount} @ {a.exchange_rate}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-sans whitespace-nowrap">
                          <button
                            onClick={() => handleDelete(a.id)}
                            className="p-1 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
