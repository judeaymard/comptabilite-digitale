import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Megaphone, AlertTriangle, FileText, Sparkles, ArrowRightLeft } from 'lucide-react';
import { api } from '../../api/client';
import { CurrencyConverterModal } from '../common/CurrencyConverterModal';
import { formatFCFA, formatDateLabel } from '../../utils/formatters';

export function DayEditModal({ isOpen, onClose, record, onSave }) {
  if (!isOpen || !record) return null;

  const [ca, setCa] = useState(record.ca_journalier);
  const [pub, setPub] = useState(record.depenses_pub);
  const [notes, setNotes] = useState(record.notes || '');
  const [reason, setReason] = useState('Correction manuelle de montant');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [adInfo, setAdInfo] = useState(null);
  const [isCurrencyConverterOpen, setIsCurrencyConverterOpen] = useState(false);

  useEffect(() => {
    if (!record?.date) return;
    api.getAdsByDate(record.date)
      .then((res) => {
        if (res.success && res.totalAmount > 0) {
          setAdInfo(res);
        } else {
          setAdInfo(null);
        }
      })
      .catch((err) => console.error(err));
  }, [record?.date]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await onSave(record.id, {
        ca_journalier: Number(ca),
        depenses_pub: Number(pub),
        notes,
        reason,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Erreur lors de la modification.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white shadow-modal overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-slate-900">
              Modifier la Journée du {formatDateLabel(record.date)}
            </h3>
            <p className="text-xs text-slate-400">Date : {record.date}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Warning Callout for Cascade Recalculate */}
        <div className="p-3.5 bg-amber-50/70 border-b border-amber-200/60 text-xs text-amber-800 flex items-start space-x-2.5 shrink-0">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
          <p className="leading-relaxed">
            <strong>Recalcul automatique en cascade :</strong> Toute modification recalcule automatiquement le capital final et l'ensemble des journées ultérieures dans l'historique comptable.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs">
              {error}
            </div>
          )}

          {/* CA */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Chiffre d’Affaires Journalier (FCFA)
            </label>
            <div className="relative">
              <DollarSign className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                min="0"
                step="1"
                value={ca}
                onChange={(e) => setCa(e.target.value)}
                required
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 font-mono focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
              />
            </div>
          </div>

          {/* Pub */}
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
                value={pub}
                onChange={(e) => setPub(e.target.value)}
                required
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 font-mono focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
              />
            </div>

            {/* Smart Detection Banner from Ad Hub */}
            {adInfo && adInfo.totalAmount > 0 && (
              <div className="mt-2 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start justify-between gap-2 text-xs animate-in fade-in">
                <div className="text-amber-900 text-[11px] leading-snug">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Dépenses pub enregistrées pour ce jour ({formatFCFA(adInfo.totalAmount)})</span>
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

          {/* Reason for change */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Motif de la modification (Journal d'audit)
            </label>
            <div className="relative">
              <FileText className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ex: Rectification facture publicitaire Facebook"
                required
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
            />
          </div>

          {/* Buttons */}
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
              {saving ? 'Mise à jour...' : 'Appliquer et Recalculer'}
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
