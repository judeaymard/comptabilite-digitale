/**
 * Routes API pour la Gestion Détaillée des Dépenses Publicitaires
 * ===============================================================
 * Permet de ventiler les dépenses par régie (Facebook, TikTok, Google...),
 * campagne et date, avec calculs de totaux, répartition et interconnexion
 * automatique avec le Journal Financier quotidien.
 */

import express from 'express';
import { query, run, logAudit } from '../db/database.js';
import { recalculateChain } from '../services/accountingEngine.js';

const router = express.Router();

function getSettings() {
  const row = query('SELECT * FROM settings WHERE id = 1')[0] || {};
  return {
    initialCapital: row.initial_capital ?? 30000,
    feeRate: (row.platform_fee_percent ?? 5.0) / 100,
  };
}

/**
 * Synchronise les dépenses publicitaires avec la journée correspondante dans le journal (si elle existe)
 */
function syncAdSpendToJournal(date, user = 'Jude') {
  const existingRecord = query('SELECT * FROM records WHERE date = ?', [date])[0];
  if (!existingRecord) return false;

  const totalSpend = query('SELECT SUM(amount) as total FROM ad_expenses WHERE date = ?', [date])[0]?.total || 0;
  
  const allRecords = query('SELECT * FROM records ORDER BY date ASC');
  const updatedRecords = allRecords.map(r => {
    if (r.date === date) {
      return { ...r, depenses_pub: totalSpend };
    }
    return r;
  });

  const settings = getSettings();
  const chained = recalculateChain(updatedRecords, settings.initialCapital, settings.feeRate);
  const now = new Date().toISOString();

  run('DELETE FROM records');
  for (const r of chained) {
    run(
      `INSERT INTO records (
        id, date, ca_journalier, depenses_pub, frais_plateforme, benefice_net,
        marge_percent, capital_initial, capital_final, cumul_ca, notes,
        is_demo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id,
        r.date,
        r.ca_journalier,
        r.depenses_pub,
        r.frais_plateforme,
        r.benefice_net,
        r.marge_percent,
        r.capital_initial,
        r.capital_final,
        r.cumul_ca,
        r.notes || '',
        r.is_demo || 0,
        r.created_at || now,
        now,
      ]
    );
  }

  logAudit({
    user,
    action: 'UPDATE',
    entity: 'RECORD',
    entity_id: existingRecord.id,
    old_values: existingRecord,
    new_values: query('SELECT * FROM records WHERE date = ?', [date])[0],
    reason: `Recalcul automatique suite à la synchronisation des dépenses pub (${totalSpend} FCFA)`,
  });

  return true;
}

/**
 * Liste des dépenses publicitaires avec filtres
 */
router.get('/', (req, res) => {
  try {
    const { startDate, endDate, platform } = req.query;
    let sql = 'SELECT * FROM ad_expenses WHERE 1=1';
    const params = [];

    if (startDate) {
      sql += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND date <= ?';
      params.push(endDate);
    }
    if (platform) {
      sql += ' AND platform = ?';
      params.push(platform);
    }

    sql += ' ORDER BY date DESC, id DESC';
    const ads = query(sql, params);
    res.json({ success: true, ads });
  } catch (err) {
    console.error('Erreur GET /ads:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Récupère le total et le détail des dépenses publicitaires pour une date précise
 */
router.get('/by-date/:date', (req, res) => {
  try {
    const { date } = req.params;
    const ads = query('SELECT * FROM ad_expenses WHERE date = ? ORDER BY id ASC', [date]);
    const totalAmount = ads.reduce((sum, a) => sum + (a.amount || 0), 0);
    const existingDay = query('SELECT id, ca_journalier, depenses_pub FROM records WHERE date = ?', [date])[0] || null;

    res.json({
      success: true,
      date,
      totalAmount,
      count: ads.length,
      entries: ads,
      existingDay,
    });
  } catch (err) {
    console.error('Erreur GET /ads/by-date/:date:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Synthèse analytique des dépenses publicitaires
 */
router.get('/summary', (req, res) => {
  try {
    const allAds = query('SELECT * FROM ad_expenses ORDER BY date ASC');
    const totalSpend = allAds.reduce((sum, a) => sum + (a.amount || 0), 0);

    const platformBreakdown = {};
    for (const a of allAds) {
      const plat = a.platform || 'Autre';
      platformBreakdown[plat] = (platformBreakdown[plat] || 0) + a.amount;
    }

    const platformShare = Object.entries(platformBreakdown).map(([platform, amount]) => ({
      platform,
      amount,
      percentage: totalSpend > 0 ? Math.round(((amount / totalSpend) * 100) * 10) / 10 : 0,
    }));

    const dailyTotals = {};
    for (const a of allAds) {
      dailyTotals[a.date] = (dailyTotals[a.date] || 0) + a.amount;
    }

    res.json({
      success: true,
      summary: {
        totalSpend,
        totalEntries: allAds.length,
        platformShare,
        dailyTotals,
      },
    });
  } catch (err) {
    console.error('Erreur GET /ads/summary:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Enregistrer une nouvelle dépense publicitaire détaillée
 * (Met à jour automatiquement la journée du journal si elle existe déjà)
 */
router.post('/', (req, res) => {
  try {
    const {
      date,
      amount,
      platform = 'Facebook Ads',
      campaign = '',
      notes = '',
      original_currency = 'FCFA',
      original_amount = null,
      exchange_rate = 1.0,
    } = req.body;
    const user = req.user?.name || req.headers['x-user'] || 'Jude';

    if (!date || amount === undefined) {
      return res.status(400).json({ success: false, error: 'Date et montant sont requis.' });
    }

    const amt = Math.round(Number(amount) || 0);
    const origAmt = original_amount ? Number(original_amount) : null;
    const rate = exchange_rate ? Number(exchange_rate) : 1.0;
    const now = new Date().toISOString();

    run(
      `INSERT INTO ad_expenses (date, amount, platform, campaign, notes, original_currency, original_amount, exchange_rate, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [date, amt, platform, campaign, notes, original_currency || 'FCFA', origAmt, rate, now]
    );

    const inserted = query('SELECT * FROM ad_expenses WHERE date = ? ORDER BY id DESC LIMIT 1', [date])[0];

    // Synchronisation automatique vers le journal comptable si la date existe déjà
    const journalUpdated = syncAdSpendToJournal(date, user);

    logAudit({
      user,
      action: 'CREATE',
      entity: 'AD_EXPENSE',
      entity_id: inserted?.id,
      new_values: inserted,
      reason: `Ajout dépense pub ${platform} : ${amt} FCFA${journalUpdated ? ' (synchronisé avec le Journal)' : ''}`,
    });

    res.status(201).json({
      success: true,
      ad: inserted,
      journalUpdated,
      message: journalUpdated
        ? 'Dépense enregistrée et répercutée automatiquement sur la journée du journal !'
        : 'Dépense enregistrée.',
    });
  } catch (err) {
    console.error('Erreur POST /ads:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Supprimer une dépense publicitaire détaillée
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user?.name || req.headers['x-user'] || 'Jude';
    const existing = query('SELECT * FROM ad_expenses WHERE id = ?', [id])[0];
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Dépense publicitaire non trouvée.' });
    }

    run('DELETE FROM ad_expenses WHERE id = ?', [id]);

    // Resynchroniser avec le journal si la journée existait
    const journalUpdated = syncAdSpendToJournal(existing.date, user);

    logAudit({
      user,
      action: 'DELETE',
      entity: 'AD_EXPENSE',
      entity_id: id,
      old_values: existing,
      reason: `Suppression dépense publicitaire${journalUpdated ? ' (recalcul journal appliqué)' : ''}`,
    });

    res.json({
      success: true,
      message: 'Dépense supprimée.',
      journalUpdated,
    });
  } catch (err) {
    console.error('Erreur DELETE /ads/:id:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
