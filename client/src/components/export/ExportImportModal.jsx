import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  FileText,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../../api/client';
import { useNotify } from '../../context/NotificationContext';
import { formatFCFA } from '../../utils/formatters';

export function ExportImportModal({ onImportSuccess }) {
  const { notify } = useNotify();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [overwriteDuplicates, setOverwriteDuplicates] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleDownloadExcel = () => {
    window.location.href = '/api/export-import/excel';
  };

  const handleDownloadCsv = () => {
    window.location.href = '/api/export-import/csv';
  };

  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setStatusMsg('');

    try {
      setLoading(true);
      const data = await selected.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(firstSheet);

      const res = await api.previewImport(rawRows);
      if (res.success) {
        setPreview(res.preview);
        notify.info(`${res.preview.totalRows} lignes détectées dans le fichier.`);
      }
    } catch (err) {
      notify.error(`Erreur de lecture du fichier : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!preview || preview.validRows.length === 0) return;

    try {
      setLoading(true);
      const res = await api.confirmImport({
        validRows: preview.validRows,
        overwriteDuplicates,
      });

      if (res.success) {
        notify.success(res.message);
        setStatusMsg(res.message);
        setPreview(null);
        setFile(null);
        if (onImportSuccess) onImportSuccess();
      } else {
        notify.error(res.message || 'Erreur lors de l’importation.');
      }
    } catch (err) {
      notify.error(`Erreur lors de l’importation : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-5 min-w-0">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200/60">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
            Importation & Exportation
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Exportez votre journal complet ou intégrez vos fichiers historiques avec contrôle d'intégrité.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 min-w-0">
        {/* Export Box */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-card space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
              <Download className="h-4 w-4 text-slate-700" strokeWidth={2} />
              <h3 className="text-sm font-semibold text-slate-900">Exporter les Données</h3>
            </div>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Générez un classeur officiel reprenant l'intégralité des 9 colonnes du journal calculées par le moteur.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={handleDownloadExcel}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition shadow-xs active:scale-95"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Télécharger Excel (.xlsx)</span>
            </button>

            <button
              onClick={handleDownloadCsv}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition border border-slate-200/80 shadow-2xs active:scale-95"
            >
              <FileText className="h-4 w-4 text-slate-500" />
              <span>Télécharger CSV (.csv)</span>
            </button>
          </div>
        </div>

        {/* Import Box */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-card space-y-4">
          <div>
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
              <Upload className="h-4 w-4 text-slate-700" strokeWidth={2} />
              <h3 className="text-sm font-semibold text-slate-900">Importer un Fichier</h3>
            </div>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Déposez votre fichier pour vérifier les colonnes et détecter les doublons avant injection.
            </p>
          </div>

          <div className="pt-1">
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl p-4 sm:p-5 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition">
              <Upload className="h-6 w-6 text-slate-400 mb-2" strokeWidth={1.75} />
              <span className="text-xs font-medium text-slate-800">
                {file ? file.name : 'Choisir un fichier (.xlsx ou .csv)'}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 text-center">
                Glisser-déposer ou cliquer pour parcourir
              </span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {statusMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Preview Container if File Loaded */}
      {preview && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-card space-y-4 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-slate-700" />
              <span>Aperçu de l’Analyse du Fichier</span>
            </h4>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-400">Total : {preview.totalReceived}</span>
              <span className="text-emerald-700 font-medium">Valides : {preview.validCount}</span>
              {preview.duplicates.length > 0 && (
                <span className="text-amber-700 font-medium">Doublons : {preview.duplicates.length}</span>
              )}
            </div>
          </div>

          {preview.duplicates.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-800 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Dates déjà existantes dans la base :</strong>{' '}
                {preview.duplicates.join(', ')}
                <div className="mt-2">
                  <label className="flex items-center space-x-2 cursor-pointer font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={overwriteDuplicates}
                      onChange={(e) => setOverwriteDuplicates(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <span>Écraser et remplacer les montants des dates existantes</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {preview.errors.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/70 text-xs text-rose-700 space-y-1">
              <strong>Erreurs détectées :</strong>
              {preview.errors.map((err, i) => (
                <div key={i}>Ligne {err.line} : {err.message}</div>
              ))}
            </div>
          )}

          {/* Table preview */}
          <div className="overflow-x-auto min-w-0 max-h-48 border border-slate-200/80 rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50/70 text-slate-500 font-sans border-b border-slate-200/80 text-[11px]">
                <tr>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5 text-right">CA Saisi</th>
                  <th className="p-2.5 text-right">Pub Saisie</th>
                  <th className="p-2.5">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.validRows.slice(0, 10).map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="p-2.5 font-sans text-slate-800">{r.date}</td>
                    <td className="p-2.5 text-right font-semibold text-slate-900">{formatFCFA(r.ca_journalier)}</td>
                    <td className="p-2.5 text-right font-medium text-amber-700">{formatFCFA(r.depenses_pub)}</td>
                    <td className="p-2.5 font-sans">
                      {r.isDuplicate ? (
                        <span className="text-amber-700 font-medium">Existant</span>
                      ) : (
                        <span className="text-emerald-700 font-medium">Nouveau</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end space-x-2.5 pt-2">
            <button
              onClick={() => setPreview(null)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition disabled:opacity-50 active:scale-95"
            >
              {loading ? 'Importation...' : 'Confirmer et Importer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
