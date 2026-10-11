import React, { useState, useMemo, useEffect } from 'react';
import { X, Calendar, DollarSign, Megaphone, Sparkles, AlertCircle, Plus, Check, ArrowRightLeft } from 'lucide-react';
import { api } from '../../api/client';
import { CurrencyConverterModal } from '../common/CurrencyConverterModal';
import { formatFCFA, formatPercent, formatDateLabel } from '../../utils/formatters';

export function DayEntryModal({ isOpen, onClose, onSave, lastRecord, initialCapital = 30000, feeRate = 0.05 }) {
  if (!isOpen) return null;

  const defaultDate = useMemo(() => {
    if (lastRecord?.date) {
      const d = new Date(lastRecord.date);
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  }, [lastRecord]);

  const [date, setDate] = useState(defaultDate);
  const [ca, setCa] = useState('');
  const [pub, setPub] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isCurrencyConverterOpen, setIsCurrencyConverterOpen] = useState(false);

  // Ad detection state
  const [adInfo, setAdInfo] = useState(null);

  // Auto-detect ad expenses recorded for this date
  useEffect(() => {
    if (!date) return;
    let isMounted = true;

    api.getAdsByDate(date)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.totalAmount > 0) {
          setAdInfo(res);
          // Auto pre-fill pub if it's currently empty or 0
          setPub((currentPub) => {
            if (currentPub === '' || currentPub === '0' || Number(currentPub) === 0) {
              return String(res.totalAmount);
            }
            return currentPub;
          });
          // Suggest campaign note if notes is empty
          setNotes((currentNotes) => {
            if (!currentNotes) {
              const campaigns = res.entries.map((e) => e.campaign).filter(Boolean).join(', ');
              if (campaigns) return `Campagnes : ${campaigns}`;
            }
            return currentNotes;
          });
        } else {
          setAdInfo(null);
        }
      })
      .catch((err) => console.error('Erreur détection pub:', err));

    return () => {
      isMounted = false;
    };
  }, [date]);

  const preview = useMemo(() => {
    const numCA = Math.max(0, Math.round(Number(ca) || 0));
    const numPub = Math.max(0, Math.round(Number(pub) || 0));
    const capInit = lastRecord ? lastRecord.capital_final : initialCapital;

    const frais = Math.round(numCA * feeRate);
    const benefice = numCA - numPub - frais;
    const marge = numCA > 0 ? Math.round(((benefice / numCA) * 100) * 10) / 10 : 0.0;
    const capFinal = capInit + benefice;

    return {
      capInit,
      frais,
      benefice,
      marge,
      capFinal,
      isDeficit: benefice < 0,
    };
  }, [ca, pub, lastRecord, initialCapital, feeRate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date) {
      setError('Veuillez renseigner la date.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await onSave({
        date,
        ca_journalier: Number(ca) || 0,
        depenses_pub: Number(pub) || 0,
        notes,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Une erreur est survenue lors de l’enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white shadow-modal overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Plus className="h-4 w-4" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-slate-900">Nouvelle Journée</h3>
              <p className="text-xs text-slate-400">Saisie express & calculs automatiques</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Date de l'opération
            </label>
            <div className="relative">
              <Calendar className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 font-mono focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
              />
            </div>
          </div>

          {/* CA Journalier */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5 flex justify-between">
              <span>Chiffre d’Affaires du Jour (FCFA)</span>
              <span className="text-[11px] text-slate-400 font-normal">Ventes brutes encaissées</span>
            </label>
            <div className="relative">
              <DollarSign className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                min="0"
                step="1"
                placeholder="ex: 25000"
                value={ca}
                onChange={(e) => setCa(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
              />
            </div>
          </div>

          {/* Dépenses Publicitaires avec détection automatique */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-700">
                Dépenses Publicitaires (FCFA)
              </label>
              <button
                type="button"
                onClick={() => setIsCurrencyConverterOpen(true)}
                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1 hover:underline active:scale-95 transition"
                title="Convertir une dépense payée en USD ou EUR en FCFA"
              >
                <ArrowRightLeft className="h-3 w-3" />
                <span>Convertir USD / EUR</span>
              </button>
            </div>

            <div className="relative">
              <Megaphone className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                min="0"
                step="1"
                placeholder="ex: 5000"
                value={pub}
                onChange={(e) => setPub(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
              />
            </div>

            {/* Smart Detection Banner from Ad Hub */}
            {adInfo && adInfo.totalAmount > 0 && (
              <div className="mt-2 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start justify-between gap-2 text-xs animate-in fade-in">
                <div className="text-amber-900 text-[11px] leading-snug">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Dépense pub détectée pour cette date ({formatFCFA(adInfo.totalAmount)})</span>
                  </div>
                  <div className="text-amber-700 mt-0.5">
                    {adInfo.entries.map((e, idx) => (
                      <span key={idx}>
                        {e.platform} ({formatFCFA(e.amount)}){e.campaign ? ` • ${e.campaign}` : ''}
                        {idx < adInfo.entries.length - 1 ? ' | ' : ''}
                      </span>
                    ))}
                  </div>
                </div>

                {Number(pub) !== adInfo.totalAmount && (
                  <button
                    type="button"
                    onClick={() => setPub(String(adInfo.totalAmount))}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10.5px] font-medium transition active:scale-95 shadow-2xs"
                  >
                    Utiliser {formatFCFA(adInfo.totalAmount)}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Notes optionnelles */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Commentaires ou campagnes (facultatif)
            </label>
            <input
              type="text"
              placeholder="ex: Scaling Campagne Ebook #1"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
            />
          </div>

          {/* Live Preview Box */}
          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2 text-xs">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-slate-700" />
              <span>Calcul prévisionnel en direct :</span>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/60">
                <span className="text-[10px] text-slate-400 block font-sans">Frais Chariow (5%)</span>
                <span className="font-semibold text-slate-700">-{formatFCFA(preview.frais)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/60">
                <span className="text-[10px] text-slate-400 block font-sans">Marge estimée</span>
                <span className={`font-semibold ${preview.isDeficit ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {formatPercent(preview.marge)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/60">
                <span className="text-[10px] text-slate-400 block font-sans">Bénéfice Net</span>
                <span className={`font-semibold ${preview.isDeficit ? 'text-rose-600' : 'text-slate-900'}`}>
                  {formatFCFA(preview.benefice)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/60">
                <span className="text-[10px] text-slate-400 block font-sans">Capital Final Estimé</span>
                <span className="font-semibold text-slate-900">{formatFCFA(preview.capFinal)}</span>
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition active:scale-95 disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer la Journée'}
            </button>
          </div>
        </form>
      </div>

      {isCurrencyConverterOpen && (
        <CurrencyConverterModal
          isOpen={isCurrencyConverterOpen}
          onClose={() => setIsCurrencyConverterOpen(false)}
          onApplyAmount={(fcfaAmount) => {
            setPub(String(fcfaAmount));
            setIsCurrencyConverterOpen(false);
          }}
        />
      )}
    </div>
  );
}
