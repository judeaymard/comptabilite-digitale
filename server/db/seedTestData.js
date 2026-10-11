/**
 * Script d'Initialisation Contrôlée des Données de Référence
 * ============================================================
 * Charge les 15 journées de référence du 07 au 21 Mai 2026.
 * - Évite formellement les doublons (idempotent).
 * - Calcule les données avec le moteur comptable officiel.
 * - Enregistre l'opération dans le journal d'audit.
 */

import { initDatabase, run, query, logAudit } from './database.js';
import { REFERENCE_ROWS_TRANSCRIBED, STARTING_CAPITAL, PLATFORM_FEE_RATE } from '../data/referenceData.js';
import { recalculateChain } from '../services/accountingEngine.js';

export async function seedReferenceData({ isOfficial = false, overwrite = false } = {}) {
  await initDatabase();

  const existingCount = query('SELECT COUNT(*) as count FROM records')[0]?.count || 0;

  if (existingCount > 0 && !overwrite) {
    console.log(`ℹ️ La base contient déjà ${existingCount} enregistrements. Seeding ignoré (ou utiliser overwrite: true).`);
    return { success: false, message: 'Données déjà présentes. Pour remplacer, confirmez l’écrasement.', count: existingCount };
  }

  if (overwrite) {
    run('DELETE FROM records');
    console.log('🧹 Données existantes du journal nettoyées.');
  }

  // Recalcule avec le moteur pour garantir l'intégrité
  const rawInputs = REFERENCE_ROWS_TRANSCRIBED.map((r) => ({
    date: r.date,
    ca_journalier: r.ca_journalier,
    depenses_pub: r.depenses_pub,
    notes: r.visualNotes,
  }));

  const chained = recalculateChain(rawInputs, STARTING_CAPITAL, PLATFORM_FEE_RATE);
  const now = new Date().toISOString();

  let inserted = 0;
  for (const rec of chained) {
    run(
      `INSERT OR REPLACE INTO records (
        date, ca_journalier, depenses_pub, frais_plateforme, benefice_net,
        marge_percent, capital_initial, capital_final, cumul_ca, notes,
        is_demo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rec.date,
        rec.ca_journalier,
        rec.depenses_pub,
        rec.frais_plateforme,
        rec.benefice_net,
        rec.marge_percent,
        rec.capital_initial,
        rec.capital_final,
        rec.cumul_ca,
        rec.notes || '',
        isOfficial ? 0 : 1, // 0 si confirmé officiel, 1 si démo/test
        now,
        now,
      ]
    );
    inserted++;
  }

  // Mettre à jour le capital initial dans settings
  run('UPDATE settings SET initial_capital = ?, platform_fee_percent = ?, updated_at = ? WHERE id = 1', [
    STARTING_CAPITAL,
    PLATFORM_FEE_RATE * 100,
    now,
  ]);

  logAudit({
    action: 'SEED',
    entity: 'RECORD',
    reason: isOfficial
      ? 'Chargement confirmé des 15 journées de référence comme historique officiel'
      : 'Initialisation contrôlée des 15 journées de référence (mode test/démo)',
    new_values: { count: inserted, dates: '2026-05-07 -> 2026-05-21', startingCapital: STARTING_CAPITAL },
  });

  console.log(`✅ ${inserted} journées de référence chargées avec succès dans la base SQLite !`);
  return { success: true, count: inserted };
}

// Exécution directe en ligne de commande si script appelé directement
if (process.argv[1]?.includes('seedTestData.js')) {
  seedReferenceData({ isOfficial: false, overwrite: true })
    .then((res) => {
      console.log('Résultat:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
