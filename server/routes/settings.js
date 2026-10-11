/**
 * Routes API pour les Paramètres Généraux
 * ========================================
 * Gère le capital initial, le taux de commission de plateforme,
 * et propage le recalcul si ces paramètres changent.
 */

import express from 'express';
import { query, run, logAudit } from '../db/database.js';
import { recalculateChain } from '../services/accountingEngine.js';

const router = express.Router();

/**
 * Récupère les paramètres actuels
 */
router.get('/', (req, res) => {
  try {
    const settings = query('SELECT * FROM settings WHERE id = 1')[0] || {
      initial_capital: 30000,
      platform_fee_percent: 5.0,
      currency: 'FCFA',
      business_name: 'E-commerce Digital',
    };
    res.json({ success: true, settings });
  } catch (err) {
    console.error('Erreur GET /settings:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Met à jour les paramètres et recalcule la chaîne comptable si nécessaire
 */
router.put('/', (req, res) => {
  try {
    const { initial_capital, platform_fee_percent, business_name, currency = 'FCFA', reason = 'Mise à jour des paramètres' } = req.body;
    const user = req.user?.name || req.headers['x-user'] || 'Jude';

    const oldSettings = query('SELECT * FROM settings WHERE id = 1')[0];

    const newCap = initial_capital !== undefined ? Math.round(Number(initial_capital)) : oldSettings.initial_capital;
    const newFee = platform_fee_percent !== undefined ? Number(platform_fee_percent) : oldSettings.platform_fee_percent;
    const newName = business_name !== undefined ? business_name : oldSettings.business_name;
    const now = new Date().toISOString();

    run(
      `UPDATE settings
       SET initial_capital = ?, platform_fee_percent = ?, business_name = ?, currency = ?, updated_at = ?
       WHERE id = 1`,
      [newCap, newFee, newName, currency, now]
    );

    const updatedSettings = query('SELECT * FROM settings WHERE id = 1')[0];

    // Si le capital initial ou le taux de commission a changé, recalculer en cascade toutes les journées existantes !
    const capChanged = oldSettings && oldSettings.initial_capital !== newCap;
    const feeChanged = oldSettings && oldSettings.platform_fee_percent !== newFee;

    if (capChanged || feeChanged) {
      const records = query('SELECT * FROM records ORDER BY date ASC');
      if (records.length > 0) {
        const chained = recalculateChain(records, newCap, newFee / 100);
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
      }
    }

    logAudit({
      user,
      action: 'UPDATE',
      entity: 'SETTING',
      entity_id: '1',
      old_values: oldSettings,
      new_values: updatedSettings,
      reason,
    });

    res.json({
      success: true,
      settings: updatedSettings,
      recalculated: capChanged || feeChanged,
      message: 'Paramètres mis à jour.',
    });
  } catch (err) {
    console.error('Erreur PUT /settings:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
