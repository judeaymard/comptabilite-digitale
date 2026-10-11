import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  ArrowRightLeft,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Check,
  Copy,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { api } from '../../api/client';
import { useNotify } from '../../context/NotificationContext';
import { formatFCFA } from '../../utils/formatters';

export function CurrencyConverterModal({ isOpen, onClose, onApplyAmount = null }) {
  const { notify } = useNotify();

  const [amount, setAmount] = useState('100');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('FCFA');
  const [ratesData, setRatesData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Custom bank rate override state
  const [showCustomSettings, setShowCustomSettings] = useState(false);
  const [customUsdRate, setCustomUsdRate] = useState('');
  const [savingCustom, setSavingCustom] = useState(false);

  const fetchRates = async () => {
    try {
      setLoading(true);
      const res = await api.getCurrencyRates();
      if (res.success) {
        setRatesData(res);
        if (res.rates?.USD) {
          setCustomUsdRate(String(res.rates.USD));
        }
      }
    } catch (err) {
      console.error('Erreur chargement taux:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRates();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const res = await api.refreshCurrencyRates();
      if (res.success) {
        setRatesData(res);
        notify.success(res.message);
      }
    } catch (err) {
      notify.error(err.message || 'Erreur lors de l’actualisation.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveCustomRate = async () => {
    try {
      setSavingCustom(true);
      const res = await api.updateCustomCurrencyRate(
        customUsdRate ? Number(customUsdRate) : null,
        null
      );
      if (res.success) {
        setRatesData(res);
        notify.success('Taux de carte bancaire enregistré avec succès !');
        setShowCustomSettings(false);
      }
    } catch (err) {
      notify.error(err.message || 'Erreur lors de l’enregistrement.');
    } finally {
      setSavingCustom(false);
    }
  };

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  // Calcul direct instantané
  const rates = ratesData?.rates || { USD: 610, EUR: 655.957, FCFA: 1, GBP: 780, CAD: 450 };
  const numAmount = Number(amount) || 0;

  let calculatedResult = 0;
  let rateUsed = 1;

  if (fromCurrency === toCurrency) {
    calculatedResult = numAmount;
    rateUsed = 1;
  } else if (toCurrency === 'FCFA') {
    rateUsed = rates[fromCurrency] || 1;
    calculatedResult = Math.round(numAmount * rateUsed);
  } else if (fromCurrency === 'FCFA') {
    rateUsed = rates[toCurrency] || 1;
    calculatedResult = rateUsed > 0 ? Math.round((numAmount / rateUsed) * 100) / 100 : 0;
  } else {
    const rateFrom = rates[fromCurrency] || 1;
    const rateTo = rates[toCurrency] || 1;
    calculatedResult = rateTo > 0 ? Math.round(((numAmount * rateFrom) / rateTo) * 100) / 100 : 0;
    rateUsed = Math.round((rateFrom / rateTo) * 10000) / 10000;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(String(calculatedResult));
    setCopied(true);
    notify.info(`Montant copié : ${calculatedResult} ${toCurrency}`);
    setTimeout(() => setCopied(false), 2000);
  };

  const currencies = [
    { code: 'USD', name: 'Dollar US ($)', symbol: '$' },
    { code: 'EUR', name: 'Euro (€)', symbol: '€' },
    { code: 'FCFA', name: 'Franc CFA (XOF/XAF)', symbol: 'FCFA' },
    { code: 'GBP', name: 'Livre Sterling (£)', symbol: '£' },
    { code: 'CAD', name: 'Dollar Canadien ($)', symbol: 'CAD$' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white shadow-modal overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-slate-950 text-white shadow-xs">
              <ArrowRightLeft className="h-4 w-4 text-emerald-400" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                Convertisseur Multi-Devises en Direct
              </h3>
              <p className="text-xs text-slate-400">Taux officiel BCEAO & cours dynamique du jour</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 font-sans">
          {/* Taux du jour résumé */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-0.5">
                <span className="font-medium">1 USD ($)</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold">
                  {ratesData?.isCustomUsd ? 'Taux Carte' : 'En direct'}
                </span>
              </div>
              <div className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                {formatFCFA(rates.USD)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-0.5">
                <span className="font-medium">1 EUR (€)</span>
                <span className="text-[10px] text-slate-600 bg-slate-200/70 px-1.5 py-0.2 rounded font-semibold">
                  Parité Fixe
                </span>
              </div>
              <div className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                655,957 FCFA
              </div>
            </div>
          </div>

          {/* Formulaire de Conversion */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
            {/* Montant & Devise Source */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                Montant à convertir
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="ex: 100"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
                  autoFocus
                />
                <select
                  value={fromCurrency}
                  onChange={(e) => setFromCurrency(e.target.value)}
                  className="w-36 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-900"
                >
                  {currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bouton Inversion (Swap) */}
            <div className="flex items-center justify-center -my-1">
              <button
                type="button"
                onClick={handleSwapCurrencies}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition shadow-2xs active:scale-90"
                title="Inverser les devises"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Devise Cible */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                Convertir vers
              </label>
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-900"
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Résultat de la Conversion */}
            <div className="p-4 rounded-xl bg-slate-950 text-white space-y-2 mt-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Résultat de la conversion</span>
                <span className="font-mono text-emerald-400">
                  1 {fromCurrency} = {toCurrency === 'FCFA' ? formatFCFA(rateUsed) : `${rateUsed} ${toCurrency}`}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight truncate">
                  {toCurrency === 'FCFA'
                    ? formatFCFA(calculatedResult)
                    : `${calculatedResult.toLocaleString('fr-FR')} ${toCurrency}`}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-xs transition active:scale-95"
                    title="Copier le montant"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  {onApplyAmount && toCurrency === 'FCFA' && (
                    <button
                      type="button"
                      onClick={() => {
                        onApplyAmount(calculatedResult);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition active:scale-95"
                    >
                      Insérer
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section Paramètres de Taux Bancaire Personnalisé (Accordéon) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowCustomSettings(!showCustomSettings)}
              className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition font-medium"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>
                {showCustomSettings
                  ? 'Masquer le réglage du taux carte bancaire'
                  : 'Ajuster le taux selon les frais de votre carte bancaire (Visa/Mastercard)'}
              </span>
            </button>

            {showCustomSettings && (
              <div className="mt-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3 animate-in fade-in">
                <div className="text-xs text-slate-600 leading-relaxed">
                  Votre banque prélève généralement une commission de change (ex: 615 à 625 FCFA pour 1 $). Vous pouvez fixer ce taux exact pour une précision comptable absolue.
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.5"
                      placeholder="ex: 620"
                      value={customUsdRate}
                      onChange={(e) => setCustomUsdRate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-mono">
                      FCFA / USD
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveCustomRate}
                    disabled={savingCustom}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition active:scale-95 disabled:opacity-50"
                  >
                    {savingCustom ? 'Enregistrement...' : 'Valider'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50 text-xs">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-slate-900' : ''}`} />
            <span>Actualiser les cours en direct</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-100 font-medium transition shadow-2xs"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
export default CurrencyConverterModal;
