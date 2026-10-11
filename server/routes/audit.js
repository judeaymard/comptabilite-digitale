/**
 * Routes API pour le Journal d'Audit
 * ===================================
 * Permet de consulter l'historique complet des actions,
 * créations, modifications (avec anciennes/nouvelles valeurs),
 * motifs et suppressions.
 */

import express from 'express';
import { query } from '../db/database.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const { user, action } = req.query;

    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (user && user !== 'ALL') {
      sql += ' AND user = ?';
      params.push(user);
    }
    if (action && action !== 'ALL') {
      sql += ' AND action = ?';
      params.push(action);
    }

    sql += ' ORDER BY id DESC LIMIT ?';
    params.push(limit);

    const logs = query(sql, params);

    // Parser les champs JSON
    const parsedLogs = logs.map((l) => ({
      ...l,
      old_values: l.old_values ? JSON.parse(l.old_values) : null,
      new_values: l.new_values ? JSON.parse(l.new_values) : null,
    }));

    res.json({ success: true, logs: parsedLogs });
  } catch (err) {
    console.error('Erreur GET /audit:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
