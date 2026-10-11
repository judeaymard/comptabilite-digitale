/**
 * Suite de Tests Automatisés du Moteur Comptable
 * ================================================
 * Vérifie rigoureusement chaque jour des 15 journées de référence,
 * les règles d'arrondi, les journées déficitaires, la marge globale pondérée
 * et le recalcul chronologique en cascade.
 */

import {
  calculateDay,
  recalculateChain,
  computeGlobalMargin,
  computePeriodKPIs,
  formatFCFA,
  formatPercent,
} from './accountingEngine.js';

import {
  STARTING_CAPITAL,
  PLATFORM_FEE_RATE,
  REFERENCE_ROWS_TRANSCRIBED,
} from '../data/referenceData.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (details) console.error(`     Détails: ${details}`);
    process.exitCode = 1;
  }
}

console.log('\n======================================================');
console.log('🧪 LANCEMENT DE LA SUITE DE TESTS DU MOTEUR COMPTABLE');
console.log('======================================================\n');

// ---------------------------------------------------------------------
// TEST 1 : Vérification individuelle des 15 journées de référence
// ---------------------------------------------------------------------
console.log('📌 TEST 1 : Vérification des 15 journées de référence retranscrites');

let previousCapital = STARTING_CAPITAL;
let previousCumulCA = 0;

REFERENCE_ROWS_TRANSCRIBED.forEach((ref, index) => {
  const dayNumber = index + 1;
  const computed = calculateDay({
    capitalInitial: previousCapital,
    caJournalier: ref.ca_journalier,
    depensesPub: ref.depenses_pub,
    feeRate: PLATFORM_FEE_RATE,
    previousCumulCA,
  });

  // 1. Capital Initial
  assert(
    computed.capitalInitial === ref.capital_initial,
    `Jour ${dayNumber} (${ref.labelDate}) - Capital Initial`,
    `Attendu: ${ref.capital_initial}, Obtenu: ${computed.capitalInitial}`
  );

  // 2. Frais Chariow (5%)
  assert(
    computed.fraisPlateforme === ref.frais_plateforme,
    `Jour ${dayNumber} (${ref.labelDate}) - Frais Plateforme 5%`,
    `Attendu: ${ref.frais_plateforme}, Obtenu: ${computed.fraisPlateforme}`
  );

  // 3. Bénéfice Net
  assert(
    computed.beneficeNet === ref.benefice_net,
    `Jour ${dayNumber} (${ref.labelDate}) - Bénéfice Net`,
    `Attendu: ${ref.benefice_net}, Obtenu: ${computed.beneficeNet}`
  );

  // 4. Marge %
  assert(
    computed.margePercent === ref.marge_percent,
    `Jour ${dayNumber} (${ref.labelDate}) - Marge %`,
    `Attendu: ${ref.marge_percent}%, Obtenu: ${computed.margePercent}%`
  );

  // 5. Capital Final
  assert(
    computed.capitalFinal === ref.capital_final,
    `Jour ${dayNumber} (${ref.labelDate}) - Capital Final`,
    `Attendu: ${ref.capital_final}, Obtenu: ${computed.capitalFinal}`
  );

  // 6. Cumul CA
  assert(
    computed.cumulCA === ref.cumul_ca,
    `Jour ${dayNumber} (${ref.labelDate}) - Cumul CA`,
    `Attendu: ${ref.cumul_ca}, Obtenu: ${computed.cumulCA}`
  );

  // 7. Statut déficitaire
  assert(
    computed.isDeficit === ref.is_deficit,
    `Jour ${dayNumber} (${ref.labelDate}) - Détection Déficit`,
    `Attendu: ${ref.is_deficit}, Obtenu: ${computed.isDeficit}`
  );

  previousCapital = computed.capitalFinal;
  previousCumulCA = computed.cumulCA;
});

// ---------------------------------------------------------------------
// TEST 2 : Recalcul en cascade complet via recalculateChain
// ---------------------------------------------------------------------
console.log('\n📌 TEST 2 : Recalcul chronologique en cascade complet');

const rawInputs = REFERENCE_ROWS_TRANSCRIBED.map((r) => ({
  date: r.date,
  ca_journalier: r.ca_journalier,
  depenses_pub: r.depenses_pub,
}));

const chainedResult = recalculateChain(rawInputs, STARTING_CAPITAL, PLATFORM_FEE_RATE);

assert(
  chainedResult.length === 15,
  'Recalcul chaîne - Nombre de journées calculées',
  `Attendu: 15, Obtenu: ${chainedResult.length}`
);

const finalDayChained = chainedResult[14];
assert(
  finalDayChained.capital_final === 215285,
  'Recalcul chaîne - Capital Final au 21 Mai 2026',
  `Attendu: 215 285 FCFA, Obtenu: ${finalDayChained.capital_final} FCFA`
);

assert(
  finalDayChained.cumul_ca === 295300,
  'Recalcul chaîne - Cumul CA au 21 Mai 2026',
  `Attendu: 295 300 FCFA, Obtenu: ${finalDayChained.cumul_ca} FCFA`
);

// ---------------------------------------------------------------------
// TEST 3 : Validation de la Marge Globale Pondérée
// ---------------------------------------------------------------------
console.log('\n📌 TEST 3 : Calcul de la Marge Globale Pondérée');

const totalCA = REFERENCE_ROWS_TRANSCRIBED.reduce((sum, r) => sum + r.ca_journalier, 0);
const totalBenef = REFERENCE_ROWS_TRANSCRIBED.reduce((sum, r) => sum + r.benefice_net, 0);
const calculatedGlobalMargin = computeGlobalMargin(REFERENCE_ROWS_TRANSCRIBED);

assert(
  totalCA === 295300,
  'Total CA sur les 15 journées',
  `Attendu: 295 300 FCFA, Obtenu: ${totalCA} FCFA`
);

assert(
  totalBenef === 185285,
  'Total Bénéfice Net sur les 15 journées',
  `Attendu: 185 285 FCFA, Obtenu: ${totalBenef} FCFA`
);

// Formule : (185 285 / 295 300) * 100 = 62,7446...% -> 62.7%
assert(
  calculatedGlobalMargin === 62.7,
  'Marge Globale Pondérée exacte = 62,7%',
  `Attendu: 62.7%, Obtenu: ${calculatedGlobalMargin}%`
);

// ---------------------------------------------------------------------
// TEST 4 : Gestion des cas limites (CA = 0 et montants négatifs)
// ---------------------------------------------------------------------
console.log('\n📌 TEST 4 : Cas limites (Journée sans vente, CA = 0)');

const zeroCADay = calculateDay({
  capitalInitial: 50000,
  caJournalier: 0,
  depensesPub: 4000,
  feeRate: 0.05,
  previousCumulCA: 10000,
});

assert(zeroCADay.fraisPlateforme === 0, 'CA = 0 : Frais = 0');
assert(zeroCADay.beneficeNet === -4000, 'CA = 0 : Bénéfice = -4.000 FCFA');
assert(zeroCADay.margePercent === 0.0, 'CA = 0 : Marge = 0,0% (évite division par zéro)');
assert(zeroCADay.capitalFinal === 46000, 'CA = 0 : Capital final = 46.000 FCFA');
assert(zeroCADay.cumulCA === 10000, 'CA = 0 : Cumul inchangé');
assert(zeroCADay.isDeficit === true, 'CA = 0 : Journée déficitaire détectée');

// ---------------------------------------------------------------------
// TEST 5 : Test de simulation de modification historique (effet domino)
// ---------------------------------------------------------------------
console.log('\n📌 TEST 5 : Recalcul en cascade suite à une modification passée');

// Modifions le CA du Jour 4 (10 Mai) : +10.000 FCFA (de 8.700 à 18.700)
// Frais : 18.700 * 5% = 935 (+500 FCFA de frais)
// Bénéfice : 18.700 - 5.300 - 935 = 12.465 (+9.500 FCFA de bénéfice net)
// Ce +9.500 FCFA doit se propager sur TOUTES les dates suivantes (Jour 5 à 15) !
const modifiedInputs = rawInputs.map((r) => {
  if (r.date === '2026-05-10') {
    return { ...r, ca_journalier: 18700 };
  }
  return r;
});

const cascadeModified = recalculateChain(modifiedInputs, STARTING_CAPITAL, PLATFORM_FEE_RATE);

assert(
  cascadeModified[3].capital_final === 43685 + 9500,
  'Jour 4 modifié - Capital Final ajusté de +9.500 FCFA',
  `Attendu: ${43685 + 9500}, Obtenu: ${cascadeModified[3].capital_final}`
);

assert(
  cascadeModified[4].capital_initial === 43685 + 9500,
  'Jour 5 (suivant) - Capital Initial propagé en cascade',
  `Attendu: ${43685 + 9500}, Obtenu: ${cascadeModified[4].capital_initial}`
);

assert(
  cascadeModified[14].capital_final === 215285 + 9500,
  'Jour 15 (dernier) - Capital Final finalisé avec +9.500 FCFA',
  `Attendu: ${215285 + 9500}, Obtenu: ${cascadeModified[14].capital_final}`
);

assert(
  cascadeModified[14].cumul_ca === 295300 + 10000,
  'Jour 15 (dernier) - Cumul CA finalisé avec +10.000 FCFA',
  `Attendu: ${295300 + 10000}, Obtenu: ${cascadeModified[14].cumul_ca}`
);

// ---------------------------------------------------------------------
// TEST 6 : Test des KPIs de période globale
// ---------------------------------------------------------------------
console.log('\n📌 TEST 6 : Calcul des KPIs de période');

const kpis = computePeriodKPIs(REFERENCE_ROWS_TRANSCRIBED, STARTING_CAPITAL);

assert(kpis.winningDaysCount === 13, 'Nombre de jours bénéficiaires = 13', `Obtenu: ${kpis.winningDaysCount}`);
assert(kpis.losingDaysCount === 2, 'Nombre de jours déficitaires = 2', `Obtenu: ${kpis.losingDaysCount}`);
assert(kpis.roas === 3.1, 'ROAS global (295.300 / 95.250 = 3,10)', `Attendu: 3.1, Obtenu: ${kpis.roas}`);
assert(kpis.netGain === 185285, 'Gain net de capital (215.285 - 30.000 = 185.285)', `Obtenu: ${kpis.netGain}`);

// ---------------------------------------------------------------------
// TEST 7 : Formateurs monétaires et pourcentages
// ---------------------------------------------------------------------
console.log('\n📌 TEST 7 : Formateurs monétaires et d’affichage');

assert(formatFCFA(33465) === '33 465 FCFA', 'formatFCFA(33465)');
assert(formatFCFA(33465, '.') === '33.465 FCFA', 'formatFCFA(33465, ".")');
assert(formatPercent(39.8) === '39,8%', 'formatPercent(39.8)');
assert(formatPercent(-53.3) === '-53,3%', 'formatPercent(-53.3)');
assert(formatPercent(0) === '0,0%', 'formatPercent(0)');

// ---------------------------------------------------------------------
// BILAN DES TESTS
// ---------------------------------------------------------------------
console.log('\n======================================================');
console.log(`📊 RÉSULTAT DU CONTRÔLE TECHNIQUE : ${passedTests} / ${totalTests} TESTS RÉUSSIS`);
console.log('======================================================\n');

if (passedTests === totalTests) {
  console.log('🎉 TOUS LES TESTS SONT AU VERT ! LE MOTEUR EST CONFORME AUX RÈGLES DU TABLEAU.\n');
  process.exit(0);
} else {
  console.error('❌ ÉCHEC DE CERTAINS TESTS.\n');
  process.exit(1);
}
