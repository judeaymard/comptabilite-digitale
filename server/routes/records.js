/**
 * Routes API du Journal des Opérations
 * =====================================
 * Gère le CRUD des opérations quotidiennes, le recalcul chronologique en cascade
 * et la journalisation d'audit systématique.
 */

import express from 'express';
import { query, run, logAudit } from '../db/database.js';
import { recalculateChain, computePeriodKPIs } from '../services/accountingEngine.js';

const router = express.Router();

/**
 * Récupère les paramètres actuels
 */
function getSettings() {
  const row = query('SELECT * FROM settings WHERE id = 1')[0];
  return {
    initialCapital: row ? row.initial_capital : 30000,
    feeRate: row ? row.platform_fee_percent / 100 : 0.05,
    currency: row ? row.currency : 'FCFA',
  };
}

/**
 * Récupère tous les enregistrements du journal avec filtres optionnels
 */
router.get('/', (req, res) => {
  try {
    const { startDate, endDate, isDemo } = req.query;
    let sql = 'SELECT * FROM records WHERE 1=1';
    const params = [];

    if (startDate) {
      sql += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND date <= ?';
      params.push(endDate);
    }
    if (isDemo !== undefined) {
      sql += ' AND is_demo = ?';
      params.push(Number(isDemo));
    }

    sql += ' ORDER BY date ASC';
    const records = query(sql, params);
    res.json({ success: true, records });
  } catch (err) {
    console.error('Erreur GET /records:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Calcule et retourne les indicateurs clés (KPIs) pour une période
 */
router.get('/kpis', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let sql = 'SELECT * FROM records WHERE 1=1';
    const params = [];

    if (startDate) {
      sql += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND date <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY date ASC';
    const records = query(sql, params);
    const settings = getSettings();
    const kpis = computePeriodKPIs(records, settings.initialCapital);

    res.json({ success: true, kpis, count: records.length });
  } catch (err) {
    console.error('Erreur GET /records/kpis:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Ajoute une nouvelle journée et recalcule toute la chaîne en cascade
 */
router.post('/', (req, res) => {
  try {
    const { date, ca_journalier = 0, depenses_pub = 0, notes = '', reason = 'Ajout nouvelle journée' } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, error: 'La date est requise (format YYYY-MM-DD).' });
    }

    // Vérifier si la date existe déjà
    const existing = query('SELECT * FROM records WHERE date = ?', [date])[0];
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Une journée existe déjà pour le ${date}. Veuillez la modifier plutôt que d'en créer une nouvelle.`,
      });
    }

    const settings = getSettings();

    // Récupérer toutes les journées existantes + nouvelle journée
    let finalPub = Number(depenses_pub) || 0;
    if (finalPub === 0) {
      const recordedAdsSpend = query('SELECT SUM(amount) as total FROM ad_expenses WHERE date = ?', [date])[0]?.total;
      if (recordedAdsSpend && Number(recordedAdsSpend) > 0) {
        finalPub = Number(recordedAdsSpend);
      }
    }

    let finalNotes = notes || '';
    if (!finalNotes) {
      const adCampaigns = query('SELECT campaign, platform FROM ad_expenses WHERE date = ?', [date]);
      const campaignsList = adCampaigns.map(a => a.campaign || a.platform).filter(Boolean);
      if (campaignsList.length > 0) {
        finalNotes = `Campagnes : ${[...new Set(campaignsList)].join(', ')}`;
      }
    }

    const allRecords = query('SELECT * FROM records');
    const combined = [
      ...allRecords,
      {
        date,
        ca_journalier: Number(ca_journalier) || 0,
        depenses_pub: finalPub,
        notes: finalNotes,
        is_demo: 0,
      },
    ];

    // Recalcul en cascade chronologique
    const chained = recalculateChain(combined, settings.initialCapital, settings.feeRate);
    const now = new Date().toISOString();

    // Remplacement transactionnel
    run('DELETE FROM records');
    for (const r of chained) {
      run(
        `INSERT INTO records (
          date, ca_journalier, depenses_pub, frais_plateforme, benefice_net,
          marge_percent, capital_initial, capital_final, cumul_ca, notes,
          is_demo, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
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

    const createdRecord = query('SELECT * FROM records WHERE date = ?', [date])[0];
    const user = req.user?.name || req.headers['x-user'] || 'Jude';

    logAudit({
      user,
      action: 'CREATE',
      entity: 'RECORD',
      entity_id: createdRecord?.id,
      new_values: createdRecord,
      reason,
    });

    res.status(201).json({ success: true, record: createdRecord, message: 'Journée enregistrée et recalculée.' });
  } catch (err) {
    console.error('Erreur POST /records:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Modifie une journée existante et recalcule automatiquement les journées suivantes
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { ca_journalier, depenses_pub, notes, reason = 'Correction de journée' } = req.body;

    const existing = query('SELECT * FROM records WHERE id = ?', [id])[0];
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Enregistrement non trouvé.' });
    }

    const settings = getSettings();
    const allRecords = query('SELECT * FROM records');

    const updatedList = allRecords.map((r) => {
      if (r.id === Number(id)) {
        return {
          ...r,
          ca_journalier: ca_journalier !== undefined ? Number(ca_journalier) : r.ca_journalier,
          depenses_pub: depenses_pub !== undefined ? Number(depenses_pub) : r.depenses_pub,
          notes: notes !== undefined ? notes : r.notes,
        };
      }
      return r;
    });

    const chained = recalculateChain(updatedList, settings.initialCapital, settings.feeRate);
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

    const newRecord = query('SELECT * FROM records WHERE id = ?', [id])[0];
    const user = req.user?.name || req.headers['x-user'] || 'Jude';

    logAudit({
      user,
      action: 'UPDATE',
      entity: 'RECORD',
      entity_id: id,
      old_values: existing,
      new_values: newRecord,
      reason,
    });

    res.json({ success: true, record: newRecord, message: 'Journée modifiée et cascade recalculée avec succès.' });
  } catch (err) {
    console.error('Erreur PUT /records/:id:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Supprime une journée et propage le recalcul en cascade
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Suppression de journée' } = req.body || {};
    const user = req.user?.name || req.headers['x-user'] || 'Jude';

    const existing = query('SELECT * FROM records WHERE id = ?', [id])[0];
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Enregistrement non trouvé.' });
    }

    const settings = getSettings();
    const remaining = query('SELECT * FROM records WHERE id != ?', [id]);

    const chained = recalculateChain(remaining, settings.initialCapital, settings.feeRate);
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
      action: 'DELETE',
      entity: 'RECORD',
      entity_id: id,
      old_values: existing,
      reason,
    });

    res.json({ success: true, message: 'Journée supprimée et historique recalculé.' });
  } catch (err) {
    console.error('Erreur DELETE /records/:id:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


/**
 * Nettoyage complet du journal comptable
 */
router.post('/clear', (req, res) => {
  try {
    const { reason = 'Réinitialisation manuelle du journal comptable' } = req.body;
    const user = req.user?.name || req.headers['x-user'] || 'Jude';
    const count = query('SELECT COUNT(*) as count FROM records')[0]?.count || 0;
    run('DELETE FROM records');

    logAudit({
      user,
      action: 'CLEAR',
      entity: 'RECORD',
      reason,
      old_values: { deletedCount: count },
    });

    res.json({ success: true, message: `${count} journées supprimées.` });
  } catch (err) {
    console.error('Erreur /records/clear:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
