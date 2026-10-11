/**
 * Routes API pour le Convertisseur Multi-Devises
 * ===============================================
 * Gère la consultation des taux en direct, le calcul de conversions
 * et la configuration des taux bancaires personnalisés.
 */

import express from 'express';
import {
  getEffectiveRates,
  convertCurrency,
  fetchLiveExchangeRates,
} from '../services/currencyService.js';
import { run, query, logAudit } from '../db/database.js';

const router = express.Router();

/**
 * Récupère les taux de change applicables actuels
 */
router.get('/rates', (req, res) => {
  try {
    const data = getEffectiveRates();
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('Erreur GET /currency/rates:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Actualise manuellement les taux de change depuis l'API financière en direct
 */
router.post('/refresh', async (req, res) => {
  try {
    const result = await fetchLiveExchangeRates();
    const effective = getEffectiveRates();
    res.json({
      success: true,
      message: result.isLive
        ? 'Taux de change du jour actualisés en direct avec succès.'
        : 'Impossible d’accéder à l’API en direct, taux de repli officiels conservés.',
      ...effective,
    });
  } catch (err) {
    console.error('Erreur POST /currency/refresh:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Convertit un montant spécifique
 */
router.post('/convert', (req, res) => {
  try {
    const { amount, from = 'USD', to = 'FCFA', rate = null } = req.body;
    if (amount === undefined || isNaN(Number(amount))) {
      return res.status(400).json({ success: false, error: 'Montant valide requis.' });
    }

    const conversion = convertCurrency(amount, from, to, rate);
    res.json({ success: true, ...conversion });
  } catch (err) {
    console.error('Erreur POST /currency/convert:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Enregistre ou réinitialise un taux bancaire personnalisé (carte bancaire)
 */
router.put('/custom-rate', (req, res) => {
  try {
    const rawUsd = req.body.customUsdRate !== undefined ? req.body.customUsdRate : req.body.usdRate;
    const rawEur = req.body.customEurRate !== undefined ? req.body.customEurRate : req.body.eurRate;

    const usdVal = (rawUsd !== undefined && rawUsd !== null && rawUsd !== '') ? Number(rawUsd) : null;
    const eurVal = (rawEur !== undefined && rawEur !== null && rawEur !== '') ? Number(rawEur) : null;
    const user = req.user?.name || req.headers['x-user'] || 'Jude';

    const oldRow = query('SELECT * FROM settings WHERE id = 1')[0];

    run(
      'UPDATE settings SET custom_usd_rate = ?, custom_eur_rate = ?, updated_at = ? WHERE id = 1',
      [usdVal, eurVal, new Date().toISOString()]
    );

    logAudit({
      user,
      action: 'UPDATE',
      entity: 'CURRENCY_RATE',
      entity_id: '1',
      old_values: { custom_usd_rate: oldRow?.custom_usd_rate, custom_eur_rate: oldRow?.custom_eur_rate },
      new_values: { custom_usd_rate: usdVal, custom_eur_rate: eurVal },
      reason: 'Ajustement du taux bancaire personnalisé pour conversion publicitaire',
    });

    const effective = getEffectiveRates();
    res.json({
      success: true,
      message: 'Taux bancaire personnalisé enregistré avec succès.',
      ...effective,
    });
  } catch (err) {
    console.error('Erreur PUT /currency/custom-rate:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
