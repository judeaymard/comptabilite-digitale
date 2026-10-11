import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Wallet,
  Percent,
  Building,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Trash2,
  ShieldCheck,
  Database,
  ArrowRightLeft,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../api/client';
import { useNotify } from '../../context/NotificationContext';
import { formatFCFA } from '../../utils/formatters';

export function SettingsModal({ onSettingsUpdated, onDataReset }) {
  const { confirm, notify } = useNotify();
  const [initialCapital, setInitialCapital] = useState(30000);
  const [feePercent, setFeePercent] = useState(5.0);
  const [businessName, setBusinessName] = useState('E-commerce Digital');
  const [currency, setCurrency] = useState('FCFA');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Multi-currency state
  const [ratesData, setRatesData] = useState(null);
  const [customUsdRate, setCustomUsdRate] = useState('');
  const [refreshingRates, setRefreshingRates] = useState(false);
  const [savingCustomRate, setSavingCustomRate] = useState(false);

  useEffect(() => {
    api.getSettings().then((res) => {
      if (res.success && res.settings) {
        setInitialCapital(res.settings.initial_capital);
        setFeePercent(res.settings.platform_fee_percent);
        setBusinessName(res.settings.business_name);
        setCurrency(res.settings.currency);
      }
    });

    api.getCurrencyRates().then((res) => {
      if (res.success) {
        setRatesData(res);
        if (res.customRates?.USD) {
          setCustomUsdRate(String(res.customRates.USD));
        }
      }
    }).catch(err => console.error(err));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');

    try {
      const res = await api.updateSettings({
        initial_capital: Number(initialCapital),
        platform_fee_percent: Number(feePercent),
        business_name: businessName,
        currency,
        reason: 'Modification des paramètres généraux',
      });

      if (res.success) {
        notify.success('Paramètres enregistrés et chaîne chronologique recalculée avec succès.');
        if (onSettingsUpdated) onSettingsUpdated();
      } else {
        notify.error(res.message || 'Erreur lors de l’enregistrement.');
      }
    } catch (err) {
      notify.error(`Erreur : ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = async () => {
    const ok = await confirm({
      title: 'Remettre la comptabilité à neuf',
      message: 'Voulez-vous réinitialiser le journal comptable ? Toutes les journées existantes seront effacées pour repartir d’une base 100% vierge.',
      confirmText: 'Oui, remettre à neuf',
      cancelText: 'Annuler',
      variant: 'danger',
    });

    if (!ok) return;

    try {
      const res = await api.clearRecords('Remise à neuf manuelle de la comptabilité');
      if (res.success) {
        notify.success('Base de données remise à neuf. Prête pour vos opérations réelles !');
        if (onDataReset) onDataReset();
      } else {
        notify.error(res.message || 'Erreur lors de l’effacement.');
      }
    } catch (err) {
      notify.error(`Erreur : ${err.message}`);
    }
  };

  const handleRefreshRates = async () => {
    setRefreshingRates(true);
    try {
      const res = await api.refreshCurrencyRates();
      if (res.success) {
        setRatesData(res);
        notify.success('Taux de change actualisés en direct depuis le marché.');
      }
    } catch (e) {
      notify.error(e.message || 'Erreur lors de l’actualisation des devises.');
    } finally {
      setRefreshingRates(false);
    }
  };

  const handleSaveCustomRate = async () => {
    setSavingCustomRate(true);
    try {
      const res = await api.updateCustomCurrencyRate(
        customUsdRate ? Number(customUsdRate) : null,
        null
      );
      if (res.success) {
        setRatesData(res);
        notify.success('Taux bancaire personnalisé enregistré avec succès !');
      }
    } catch (e) {
      notify.error(e.message || 'Erreur lors de l’enregistrement du taux.');
    } finally {
      setSavingCustomRate(false);
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-5 min-w-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200/60">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
            Paramètres & Données
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Règles comptables fondamentales, capital de départ et gestion de la base de données.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          <span>Moteur actif • Prêt pour la production</span>
        </div>
      </div>

      {msg && (
        <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/70 text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in duration-150">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 min-w-0">
        {/* Left Column: General financial settings form (7 cols) */}
        <div className="lg:col-span-7 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-card space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <Sliders className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Règles Financières de Base</h3>
              <p className="text-[11px] text-slate-400">Paramètres appliqués aux calculs quotidiens.</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4.5">
            {/* Capital Initial */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Capital Initial de Départ (Jour 1)
                </label>
                <span className="text-xs font-mono font-semibold text-slate-900">
                  {formatFCFA(initialCapital)}
                </span>
              </div>
              <div className="relative">
                <Wallet className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(e.target.value)}
                  required
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 font-mono focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Point de départ de votre trésorerie. Tout changement recalcule l'historique en cascade.
              </p>
            </div>

            {/* Taux de Commission */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Commission de Passerelle (Chariow / Plateforme)
                </label>
                <span className="text-xs font-mono font-semibold text-slate-900">
                  {feePercent}%
                </span>
              </div>
              <div className="relative">
                <Percent className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={feePercent}
                  onChange={(e) => setFeePercent(e.target.value)}
                  required
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 font-mono focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Taux de prélèvement plateforme calculé automatiquement sur le CA journalier.
              </p>
            </div>

            {/* Nom de l'Activité */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Nom de l'Activité / Boutique
              </label>
              <div className="relative">
                <Building className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition"
                />
              </div>
            </div>

            {/* Bouton de sauvegarde Obsidian */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition shadow-xs disabled:opacity-50 active:scale-[0.99] flex items-center justify-center space-x-2"
              >
                <span>{saving ? 'Enregistrement en cours...' : 'Enregistrer les Paramètres'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Base de Données Réelle & Remise à Neuf (5 cols) */}
        <div className="lg:col-span-5 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-card flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                <Database className="h-4 w-4" strokeWidth={1.8} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Base de Données Vierge</h3>
                <p className="text-[11px] text-slate-400">Environnement de travail réel.</p>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Prêt pour l'exploitation réelle</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Aucune donnée exemple ou fictive n'est chargée. Le journal est vierge et prêt à recevoir vos véritables chiffres d'affaires et dépenses publicitaires.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-500 space-y-1">
              <div className="font-medium text-slate-700">Recalcul en Cascade Immuable</div>
              <div className="text-[11px] leading-relaxed text-slate-500">
                Chaque journée ajoutée sera enregistrée avec le capital initial automatiquement reporté de la veille.
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClearAll}
                className="w-full flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl border border-rose-200/80 text-rose-600 hover:bg-rose-50/70 text-xs font-medium transition active:scale-[0.99]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remettre le Journal à Neuf (Vierge)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Multi-Currency Live Converter & Card Rates */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <ArrowRightLeft className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Taux de Change Multi-Devises en Direct (USD / EUR / FCFA)
              </h3>
              <p className="text-[11px] text-slate-400">
                Idéal si vous achetez vos publicités en USD ($) ou EUR (€) et vendez en FCFA.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefreshRates}
            disabled={refreshingRates}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-700 text-xs font-medium transition active:scale-95 disabled:opacity-50 self-start sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshingRates ? 'animate-spin text-emerald-600' : 'text-slate-400'}`} />
            <span>{refreshingRates ? 'Actualisation...' : 'Actualiser les taux'}</span>
          </button>
        </div>

        {/* Live Rates Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Dollar Américain (USD)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100/70 text-emerald-800 font-medium">
                {ratesData?.customRates?.USD ? 'Taux Carte' : 'Taux Marché'}
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-slate-900">
              1 $ = {ratesData?.rates?.USD || 610} FCFA
            </div>
            <p className="text-[10.5px] text-slate-400 mt-1">
              Taux dynamique du jour ou carte personnalisée.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Euro (€ EUR)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100/70 text-blue-800 font-medium">
                Parité Fixe
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-slate-900">
              1 € = 655.957 FCFA
            </div>
            <p className="text-[10.5px] text-slate-400 mt-1">
              Parité officielle UEMOA / CEMAC garantie.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Livre Sterling (GBP)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
                Marché
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-slate-900">
              1 £ = {ratesData?.rates?.GBP || 780} FCFA
            </div>
            <p className="text-[10.5px] text-slate-400 mt-1">
              Taux de référence pour régies UK.
            </p>
          </div>
        </div>

        {/* Custom Card Fee Override Form */}
        <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-900">
                Ajustement Taux Carte Bancaire (Frais de débit Visa / Mastercard)
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Certaines banques ou cartes virtuelles (Wave, UBA, Pyypl, Djamo) débitent un taux majoré (ex: 615 ou 625 FCFA / $). Saisissez votre taux réel si vous le souhaitez.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                step="0.1"
                placeholder="Taux réel USD (ex: 615) - Laissez vide pour taux marché"
                value={customUsdRate}
                onChange={(e) => setCustomUsdRate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900 transition"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveCustomRate}
              disabled={savingCustomRate}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition active:scale-95 disabled:opacity-50 shrink-0"
            >
              {savingCustomRate ? 'Enregistrement...' : 'Enregistrer le Taux Carte'}
            </button>
            {ratesData?.customRates?.USD && (
              <button
                type="button"
                onClick={() => {
                  setCustomUsdRate('');
                  api.updateCustomCurrencyRate(null, null).then((res) => {
                    if (res.success) {
                      setRatesData(res);
                      notify.success('Taux réinitialisé au cours officiel du marché.');
                    }
                  });
                }}
                className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-medium transition active:scale-95 shrink-0"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
