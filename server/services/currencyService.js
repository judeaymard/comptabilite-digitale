/**
 * Service de Conversion Multi-Devises en Direct
 * ===============================================
 * - Parité fixe officielle EUR -> FCFA (1 EUR = 655.957 FCFA - zone UEMOA/CEMAC)
 * - Taux dynamique en direct USD -> FCFA via API financière
 * - Taux de repli autonome garanti en cas de coupure réseau
 * - Prise en compte des taux bancaires personnalisés (frais de carte)
 */

import { query, run, logAudit } from '../db/database.js';

// Taux de référence et parités officielles de repli
export const DEFAULT_RATES = {
  EUR_TO_FCFA: 655.957,
  USD_TO_FCFA: 610.0,
  GBP_TO_FCFA: 780.0,
  CAD_TO_FCFA: 445.0,
};

let cachedRates = {
  USD: DEFAULT_RATES.USD_TO_FCFA,
  EUR: DEFAULT_RATES.EUR_TO_FCFA,
  GBP: DEFAULT_RATES.GBP_TO_FCFA,
  CAD: DEFAULT_RATES.CAD_TO_FCFA,
  FCFA: 1.0,
};

let lastFetchedAt = null;
let isLive = false;

/**
 * Récupère les taux de change en direct depuis une API financière publique fiable
 */
export async function fetchLiveExchangeRates() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4s max timeout

    // open.er-api.com : API publique gratuite, sans clé API, rapide et fiable
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Erreur API taux de change HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data && data.rates && (data.rates.XOF || data.rates.XAF)) {
      const usdToFcfa = data.rates.XOF || data.rates.XAF || DEFAULT_RATES.USD_TO_FCFA;
      const eurRate = data.rates.EUR || 0.92;
      const gbpRate = data.rates.GBP || 0.78;
      const cadRate = data.rates.CAD || 1.36;

      cachedRates = {
        USD: Math.round(usdToFcfa * 100) / 100,
        // L'Euro est officiellement lié au Franc CFA par parité fixe
        EUR: DEFAULT_RATES.EUR_TO_FCFA,
        GBP: Math.round((usdToFcfa / gbpRate) * 100) / 100,
        CAD: Math.round((usdToFcfa / cadRate) * 100) / 100,
        FCFA: 1.0,
      };

      lastFetchedAt = new Date().toISOString();
      isLive = true;
      console.log(`💱 Taux de change en direct actualisés : 1 USD = ${cachedRates.USD} FCFA | 1 EUR = ${cachedRates.EUR} FCFA`);
      return { success: true, rates: cachedRates, isLive: true, lastFetchedAt };
    }
  } catch (err) {
    console.warn('⚠️ Impossible de contacter l’API de change en direct, utilisation des taux de repli fixes :', err.message);
  }

  isLive = false;
  return { success: false, rates: cachedRates, isLive: false, lastFetchedAt };
}

/**
 * Récupère les paramètres de taux personnalisés enregistrés dans la base
 */
export function getCustomRates() {
  try {
    const row = query('SELECT * FROM settings WHERE id = 1')[0];
    return {
      customUsdRate: row?.custom_usd_rate || null,
      customEurRate: row?.custom_eur_rate || null,
    };
  } catch (e) {
    return { customUsdRate: null, customEurRate: null };
  }
}

/**
 * Retourne les taux effectifs applicables (en tenant compte d'un éventuel taux bancaire personnalisé)
 */
export function getEffectiveRates() {
  const custom = getCustomRates();

  return {
    rates: {
      USD: custom.customUsdRate ? Number(custom.customUsdRate) : cachedRates.USD,
      EUR: custom.customEurRate ? Number(custom.customEurRate) : cachedRates.EUR,
      GBP: cachedRates.GBP,
      CAD: cachedRates.CAD,
      FCFA: 1.0,
    },
    isCustomUsd: Boolean(custom.customUsdRate),
    isCustomEur: Boolean(custom.customEurRate),
    customRates: {
      USD: custom.customUsdRate,
      EUR: custom.customEurRate,
    },
    liveMarketRates: cachedRates,
    isLive,
    lastFetchedAt: lastFetchedAt || new Date().toISOString(),
  };
}

/**
 * Convertit un montant d'une devise source vers une devise cible
 * @param {number} amount
 * @param {string} fromCurrency - 'USD' | 'EUR' | 'FCFA' | 'GBP' | 'CAD'
 * @param {string} toCurrency - 'FCFA' | 'USD' | 'EUR' | ...
 * @param {number|null} [explicitRate] - Taux manuel optionnel pour une transaction ponctuelle
 */
export function convertCurrency(amount, fromCurrency = 'USD', toCurrency = 'FCFA', explicitRate = null) {
  const num = Number(amount) || 0;
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (from === to) {
    return {
      amount: num,
      from,
      to,
      result: num,
      rateUsed: 1.0,
    };
  }

  const effective = getEffectiveRates().rates;

  // Si conversion vers FCFA
  if (to === 'FCFA') {
    const rate = explicitRate ? Number(explicitRate) : (effective[from] || DEFAULT_RATES.USD_TO_FCFA);
    const result = Math.round(num * rate);
    return {
      amount: num,
      from,
      to,
      result,
      rateUsed: rate,
    };
  }

  // Si conversion depuis FCFA vers devise étrangère
  if (from === 'FCFA') {
    const rate = explicitRate ? Number(explicitRate) : (effective[to] || DEFAULT_RATES.USD_TO_FCFA);
    const result = rate > 0 ? Math.round((num / rate) * 100) / 100 : 0;
    return {
      amount: num,
      from,
      to,
      result,
      rateUsed: rate,
    };
  }

  // Conversion entre deux devises étrangères (via FCFA comme pivot)
  const rateFrom = effective[from] || 1;
  const rateTo = effective[to] || 1;
  const inFcfa = num * rateFrom;
  const result = rateTo > 0 ? Math.round((inFcfa / rateTo) * 100) / 100 : 0;

  return {
    amount: num,
    from,
    to,
    result,
    rateUsed: Math.round((rateFrom / rateTo) * 10000) / 10000,
  };
}

// Initialisation au chargement du module
fetchLiveExchangeRates().catch(() => {});
