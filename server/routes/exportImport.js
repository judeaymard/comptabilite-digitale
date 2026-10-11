/**
 * Routes API pour l'Importation et l'Exportation Excel / CSV
 * ============================================================
 * - Export fidèle en .xlsx et .csv avec les 9 colonnes du modèle
 * - Analyse et prévisualisation avant importation
 * - Détection des doublons et validation des montants
 */

import express from 'express';
import * as XLSX from 'xlsx';
import { query, run, logAudit } from '../db/database.js';
import { recalculateChain, formatPercent } from '../services/accountingEngine.js';

const router = express.Router();

function getSettings() {
  const row = query('SELECT * FROM settings WHERE id = 1')[0];
  return {
    initialCapital: row ? row.initial_capital : 30000,
    feeRate: row ? row.platform_fee_percent / 100 : 0.05,
    currency: row ? row.currency : 'FCFA',
  };
}

/**
 * Export en fichier Excel (.xlsx)
 */
router.get('/excel', (req, res) => {
  try {
    const records = query('SELECT * FROM records ORDER BY date ASC');

    const excelData = records.map((r) => {
      // Date formatée JJ/MM/AAAA
      const [year, month, day] = r.date.split('-');
      const formattedDate = `${day}/${month}/${year}`;

      return {
        'Date': formattedDate,
        'Capital Initial (FCFA)': r.capital_initial,
        'CA Journalier (FCFA)': r.ca_journalier,
        'Dépenses Pub (FCFA)': r.depenses_pub,
        'Frais Chariow 5% (FCFA)': r.frais_plateforme,
        'Bénéfice Net (FCFA)': r.benefice_net,
        'Marge %': formatPercent(r.marge_percent),
        'Capital Final (FCFA)': r.capital_final,
        'Cumul CA (FCFA)': r.cumul_ca,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Ajustement de la largeur des colonnes
    worksheet['!cols'] = [
      { wch: 14 }, // Date
      { wch: 22 }, // Capital Initial
      { wch: 22 }, // CA Journalier
      { wch: 20 }, // Dépenses Pub
      { wch: 22 }, // Frais Chariow
      { wch: 20 }, // Bénéfice Net
      { wch: 12 }, // Marge %
      { wch: 20 }, // Capital Final
      { wch: 20 }, // Cumul CA
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Comptabilité');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="Comptabilite_Produits_Digitaux.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Erreur export Excel:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Export en fichier CSV
 */
router.get('/csv', (req, res) => {
  try {
    const records = query('SELECT * FROM records ORDER BY date ASC');

    const headers = [
      'Date',
      'Capital Initial (FCFA)',
      'CA Journalier (FCFA)',
      'Dépenses Pub (FCFA)',
      'Frais Chariow 5% (FCFA)',
      'Bénéfice Net (FCFA)',
      'Marge %',
      'Capital Final (FCFA)',
      'Cumul CA (FCFA)',
    ];

    const rows = records.map((r) => [
      r.date,
      r.capital_initial,
      r.ca_journalier,
      r.depenses_pub,
      r.frais_plateforme,
      r.benefice_net,
      `${r.marge_percent}%`,
      r.capital_final,
      r.cumul_ca,
    ]);

    // UTF-8 BOM pour ouverture propre dans Excel FR
    const csvContent = '\uFEFF' + [
      headers.join(';'),
      ...rows.map((row) => row.join(';')),
    ].join('\r\n');

    res.setHeader('Content-Disposition', 'attachment; filename="Comptabilite_Produits_Digitaux.csv"');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(csvContent);
  } catch (err) {
    console.error('Erreur export CSV:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Analyse et prévisualisation avant importation
 */
router.post('/preview-import', (req, res) => {
  try {
    const { rows = [] } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Aucune donnée fournie pour l’importation.' });
    }

    const existingDates = new Set(query('SELECT date FROM records').map((r) => r.date));
    const validRows = [];
    const errors = [];
    const duplicates = [];

    rows.forEach((row, index) => {
      const lineNum = index + 1;
      const dateStr = row.date || row.Date || row['date'];
      const caVal = row.ca || row.ca_journalier || row['CA Journalier (FCFA)'] || row['CA Journalier'] || row['CA'] || 0;
      const pubVal = row.pub || row.depenses_pub || row['Dépenses Pub (FCFA)'] || row['Dépenses Pub'] || row['Pub'] || 0;

      if (!dateStr) {
        errors.push({ line: lineNum, message: 'Date absente ou non reconnue.' });
        return;
      }

      // Normalisation de la date en YYYY-MM-DD
      let normalizedDate = dateStr;
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          if (parts[2].length === 4) {
            normalizedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
      }

      const caClean = Math.round(Number(String(caVal).replace(/[^\d.-]/g, '')) || 0);
      const pubClean = Math.round(Number(String(pubVal).replace(/[^\d.-]/g, '')) || 0);

      const isDuplicate = existingDates.has(normalizedDate);
      if (isDuplicate) {
        duplicates.push(normalizedDate);
      }

      validRows.push({
        date: normalizedDate,
        ca_journalier: caClean,
        depenses_pub: pubClean,
        notes: row.notes || row.Notes || '',
        isDuplicate,
      });
    });

    res.json({
      success: true,
      preview: {
        totalReceived: rows.length,
        validCount: validRows.length,
        errors,
        duplicates,
        validRows,
      },
    });
  } catch (err) {
    console.error('Erreur preview import:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Confirmation de l'importation après validation par l'utilisateur
 */
router.post('/confirm-import', (req, res) => {
  try {
    const { validRows = [], overwriteDuplicates = false } = req.body;
    const user = req.user?.name || req.headers['x-user'] || 'Jude';

    if (!Array.isArray(validRows) || validRows.length === 0) {
      return res.status(400).json({ success: false, error: 'Aucune donnée valide à enregistrer.' });
    }

    const settings = getSettings();
    const existing = query('SELECT * FROM records');
    const existingMap = new Map(existing.map((r) => [r.date, r]));

    // Fusionner ou écraser selon le choix
    validRows.forEach((r) => {
      if (existingMap.has(r.date)) {
        if (overwriteDuplicates) {
          existingMap.set(r.date, {
            ...existingMap.get(r.date),
            ca_journalier: r.ca_journalier,
            depenses_pub: r.depenses_pub,
            notes: r.notes || existingMap.get(r.date).notes,
          });
        }
      } else {
        existingMap.set(r.date, {
          date: r.date,
          ca_journalier: r.ca_journalier,
          depenses_pub: r.depenses_pub,
          notes: r.notes || '',
          is_demo: 0,
        });
      }
    });

    const combinedList = Array.from(existingMap.values());
    const chained = recalculateChain(combinedList, settings.initialCapital, settings.feeRate);
    const now = new Date().toISOString();

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

    logAudit({
      user,
      action: 'IMPORT',
      entity: 'RECORD',
      reason: `Importation confirmée de ${validRows.length} lignes`,
      new_values: { count: validRows.length, overwriteDuplicates },
    });

    res.json({ success: true, message: `${validRows.length} journées importées et recalculées avec succès.` });
  } catch (err) {
    console.error('Erreur confirm import:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
