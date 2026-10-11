/**
 * Moteur de Calcul Comptable Centralisé
 * ---------------------------------------
 * Référence mathématique exacte du projet :
 *  1. Frais de plateforme = round(CA * 5%)
 *  2. Bénéfice net = CA - Dépenses Pub - Frais de plateforme
 *  3. Marge % = CA === 0 ? 0.0 : round((Bénéfice net / CA) * 100 à 1 décimale)
 *  4. Capital final = Capital initial + Bénéfice net
 *  5. Capital initial du jour N = Capital final du jour N-1
 *  6. Cumul CA = Somme cumulée du CA depuis le début
 *  7. Marge globale = (Somme des bénéfices nets / Somme du CA) * 100
 */

/**
 * Calcule les indicateurs pour une journée donnée à partir du capital initial
 * et des données saisies (CA, Dépenses Pub).
 *
 * @param {Object} params
 * @param {number} params.capitalInitial
 * @param {number} params.caJournalier
 * @param {number} params.depensesPub
 * @param {number} [params.feeRate=0.05]
 * @param {number} [params.previousCumulCA=0]
 * @returns {Object}
 */
export function calculateDay({
  capitalInitial,
  caJournalier,
  depensesPub,
  feeRate = 0.05,
  previousCumulCA = 0,
}) {
  const capInit = Math.round(Number(capitalInitial) || 0);
  const ca = Math.round(Number(caJournalier) || 0);
  const pub = Math.round(Number(depensesPub) || 0);

  // 1. Frais de plateforme (5% par défaut)
  const fraisPlateforme = Math.round(ca * feeRate);

  // 2. Bénéfice Net
  const beneficeNet = ca - pub - fraisPlateforme;

  // 3. Marge % (avec 1 décimale, gère la division par zéro si CA = 0)
  let margePercent = 0.0;
  if (ca > 0) {
    margePercent = Math.round(((beneficeNet / ca) * 100) * 10) / 10;
  }

  // 4. Capital Final
  const capitalFinal = capInit + beneficeNet;

  // 5. Cumul CA
  const cumulCA = previousCumulCA + ca;

  return {
    capitalInitial: capInit,
    caJournalier: ca,
    depensesPub: pub,
    fraisPlateforme,
    beneficeNet,
    margePercent,
    capitalFinal,
    cumulCA,
    isDeficit: beneficeNet < 0,
  };
}

/**
 * Recalcule l'intégralité d'une chaîne chronologique de journées en cascade.
 *
 * @param {Array<Object>} records - Liste ordonnée par date croissante
 * @param {number} startingCapital - Capital de départ au Jour 1
 * @param {number} [feeRate=0.05] - Taux de commission (5%)
 * @returns {Array<Object>}
 */
export function recalculateChain(records, startingCapital = 30000, feeRate = 0.05) {
  if (!records || records.length === 0) return [];

  // Tri chronologique strict par date croissante
  const sorted = [...records].sort((a, b) => (a.date > b.date ? 1 : -1));

  let currentCapital = Math.round(Number(startingCapital) || 0);
  let runningCumulCA = 0;

  return sorted.map((rec) => {
    const computed = calculateDay({
      capitalInitial: currentCapital,
      caJournalier: rec.ca_journalier ?? rec.caJournalier ?? 0,
      depensesPub: rec.depenses_pub ?? rec.depensesPub ?? 0,
      feeRate,
      previousCumulCA: runningCumulCA,
    });

    // Mise à jour des accumulateurs pour le jour suivant
    currentCapital = computed.capitalFinal;
    runningCumulCA = computed.cumulCA;

    return {
      ...rec,
      capital_initial: computed.capitalInitial,
      ca_journalier: computed.caJournalier,
      depenses_pub: computed.depensesPub,
      frais_plateforme: computed.fraisPlateforme,
      benefice_net: computed.beneficeNet,
      marge_percent: computed.margePercent,
      capital_final: computed.capitalFinal,
      cumul_ca: computed.cumulCA,
      is_deficit: computed.isDeficit ? 1 : 0,
    };
  });
}

/**
 * Calcule la marge globale pondérée sur un ensemble de journées.
 * Formule : (Somme Bénéfices Nets / Somme CA) * 100
 *
 * @param {Array<Object>} records
 * @returns {number}
 */
export function computeGlobalMargin(records) {
  if (!records || records.length === 0) return 0.0;
  const totalCA = records.reduce((sum, r) => sum + (r.ca_journalier || r.caJournalier || 0), 0);
  const totalBenefice = records.reduce((sum, r) => sum + (r.benefice_net || r.beneficeNet || 0), 0);

  if (totalCA <= 0) return 0.0;
  return Math.round(((totalBenefice / totalCA) * 100) * 10) / 10;
}

/**
 * Calcule l'ensemble des KPIs pour une période sélectionnée.
 *
 * @param {Array<Object>} records
 * @param {number} [initialCapitalStarting=30000]
 * @returns {Object}
 */
export function computePeriodKPIs(records, initialCapitalStarting = 30000) {
  if (!records || records.length === 0) {
    return {
      totalCA: 0,
      totalPub: 0,
      totalFrais: 0,
      totalBeneficeNet: 0,
      globalMarginPercent: 0.0,
      capitalInitialPeriod: initialCapitalStarting,
      capitalFinalCurrent: initialCapitalStarting,
      netGain: 0,
      roas: 0.0,
      winningDaysCount: 0,
      losingDaysCount: 0,
      neutralDaysCount: 0,
      totalDaysCount: 0,
    };
  }

  const sorted = [...records].sort((a, b) => (a.date > b.date ? 1 : -1));

  const totalCA = sorted.reduce((sum, r) => sum + (r.ca_journalier ?? r.caJournalier ?? 0), 0);
  const totalPub = sorted.reduce((sum, r) => sum + (r.depenses_pub ?? r.depensesPub ?? 0), 0);
  const totalFrais = sorted.reduce((sum, r) => sum + (r.frais_plateforme ?? r.fraisPlateforme ?? 0), 0);
  const totalBeneficeNet = sorted.reduce((sum, r) => sum + (r.benefice_net ?? r.beneficeNet ?? 0), 0);

  const capitalInitialPeriod = sorted[0].capital_initial ?? sorted[0].capitalInitial ?? initialCapitalStarting;
  const lastIndex = sorted.length - 1;
  const capitalFinalCurrent = sorted[lastIndex].capital_final ?? sorted[lastIndex].capitalFinal ?? capitalInitialPeriod;

  const globalMarginPercent = totalCA > 0
    ? Math.round(((totalBeneficeNet / totalCA) * 100) * 10) / 10
    : 0.0;

  const roas = totalPub > 0
    ? Math.round((totalCA / totalPub) * 100) / 100
    : 0.0;

  const winningDaysCount = sorted.filter((r) => (r.benefice_net ?? r.beneficeNet ?? 0) > 0).length;
  const losingDaysCount = sorted.filter((r) => (r.benefice_net ?? r.beneficeNet ?? 0) < 0).length;
  const neutralDaysCount = sorted.filter((r) => (r.benefice_net ?? r.beneficeNet ?? 0) === 0).length;

  return {
    totalCA,
    totalPub,
    totalFrais,
    totalBeneficeNet,
    globalMarginPercent,
    capitalInitialPeriod,
    capitalFinalCurrent,
    netGain: capitalFinalCurrent - capitalInitialPeriod,
    roas,
    winningDaysCount,
    losingDaysCount,
    neutralDaysCount,
    totalDaysCount: sorted.length,
  };
}

/**
 * Formate un nombre au format monétaire FCFA avec séparateur de milliers
 * @param {number} amount
 * @returns {string} ex: "33 465 FCFA" ou "33.465 FCFA"
 */
export function formatFCFA(amount, separator = ' ') {
  if (amount === null || amount === undefined || isNaN(amount)) return '0 FCFA';
  const num = Math.round(Number(amount));
  const parts = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return `${parts} FCFA`;
}

/**
 * Formate un pourcentage avec une décimale et virgule
 * @param {number} percent
 * @returns {string} ex: "39,8%"
 */
export function formatPercent(percent) {
  if (percent === null || percent === undefined || isNaN(percent)) return '0,0%';
  const fixed = Number(percent).toFixed(1).replace('.', ',');
  return `${fixed}%`;
}
