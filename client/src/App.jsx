import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { KPICards } from './components/dashboard/KPICards';
import { FinancialCharts } from './components/dashboard/FinancialCharts';
import { JournalTable } from './components/journal/JournalTable';
import { DayCardsView } from './components/journal/DayCardsView';
import { DayEntryModal } from './components/journal/DayEntryModal';
import { DayEditModal } from './components/journal/DayEditModal';
import { AdsManager } from './components/ads/AdsManager';
import { AuditLogViewer } from './components/audit/AuditLogViewer';
import { ExportImportModal } from './components/export/ExportImportModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { CurrencyConverterModal } from './components/common/CurrencyConverterModal';
import LoginPortal from './components/auth/LoginPortal';
import { api } from './api/client';
import { useNotify } from './context/NotificationContext';
import { useAuth } from './context/AuthContext';
import { LayoutGrid, Table, Calendar, ArrowRight, Clock, TrendingUp } from 'lucide-react';
import { formatFCFA, formatDateLabel } from './utils/formatters';

export function App() {
  const { user, isAuthenticated } = useAuth();
  const { confirm, notify } = useNotify();

  const [currentTab, setCurrentTab] = useState('dashboard'); // 'dashboard' | 'journal' | 'ads' | 'audit' | 'export-import' | 'settings'
  const [journalViewMode, setJournalViewMode] = useState('table'); // 'table' | 'cards'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('compta_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('compta_sidebar_collapsed', String(next));
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  // Data states
  const [records, setRecords] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);

  // Fetch all core data
  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const [resRecords, resKpis, resSettings] = await Promise.all([
        api.getRecords(),
        api.getKPIs(),
        api.getSettings(),
      ]);

      if (resRecords.success) setRecords(resRecords.records || []);
      if (resKpis.success) setKpis(resKpis.kpis || null);
      if (resSettings.success) setSettings(resSettings.settings || null);
    } catch (err) {
      console.error('Erreur chargement données:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  // Si non authentifié, afficher le portail de connexion
  if (!isAuthenticated) {
    return <LoginPortal />;
  }

  // Handlers
  const handleSaveNewDay = async (payload) => {
    try {
      const res = await api.createRecord(payload);
      if (res.success) {
        notify.success(`Journée du ${payload.date} enregistrée avec succès !`);
        await fetchData();
      } else {
        notify.error(res.message || 'Erreur lors de l’enregistrement.');
      }
    } catch (err) {
      notify.error(err.message || 'Erreur lors de l’enregistrement.');
    }
  };

  const handleSaveEditDay = async (id, payload) => {
    try {
      const res = await api.updateRecord(id, payload);
      if (res.success) {
        notify.success(`Journée du ${payload.date} mise à jour. Recalculs effectués !`);
        await fetchData();
      } else {
        notify.error(res.message || 'Erreur lors de la modification.');
      }
    } catch (err) {
      notify.error(err.message || 'Erreur lors de la modification.');
    }
  };

  const handleDeleteDay = async (record) => {
    const ok = await confirm({
      title: 'Supprimer cette journée',
      message: `Êtes-vous sûr de vouloir supprimer la journée du ${record.date} ? Cette action recalculera automatiquement toutes les journées suivantes.`,
      confirmText: 'Supprimer la journée',
      cancelText: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const res = await api.deleteRecord(record.id, `Suppression journée du ${record.date}`);
      if (res.success) {
        notify.success(`Journée du ${record.date} supprimée avec succès.`);
        await fetchData();
      } else {
        notify.error(res.message || 'Erreur lors de la suppression.');
      }
    } catch (err) {
      notify.error(err.message || 'Erreur lors de la suppression.');
    }
  };

  const lastRecord = records.length > 0 ? records[records.length - 1] : null;

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0F172A] flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        settings={settings}
        kpis={kpis}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenCurrencyConverter={() => setIsCurrencyModalOpen(true)}
        onRefresh={fetchData}
        loading={loading}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col md:flex-row min-w-0">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          isMobileMenuOpen={isMobileMenuOpen}
          onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />

        {/* Content View: High-density panoramic container */}
        <main className="flex-1 px-3 sm:px-6 lg:px-8 py-3 sm:py-5 w-full min-w-0 space-y-4 sm:space-y-5">
          {/* TAB 1: DASHBOARD */}
          {currentTab === 'dashboard' && (
            <div className="space-y-4 sm:space-y-5 animate-in fade-in">
              {/* Refined Épuré White Welcome Banner */}
              <div className="relative overflow-hidden rounded-2xl bg-white p-4 sm:p-6 text-slate-900 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 border border-slate-200/80">
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                
                <div className="relative z-10 space-y-1.5 max-w-2xl">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-[11px] font-medium text-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    <span>Système actif &bull; Recalcul en cascade</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl text-slate-900 font-bold tracking-tight">
                    Bienvenue, <span className="text-emerald-700">{user?.name || 'Jude'}</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 font-sans leading-relaxed">
                    Plateforme financière prête. Saisies et modifications certifiées dans le journal d'audit.
                  </p>
                </div>

                <div className="relative z-10 shrink-0 self-start md:self-auto">
                  <div className="bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/80 text-xs text-slate-600 flex items-center gap-2.5 shadow-2xs">
                    <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-400">Activité</div>
                      <div className="font-mono font-semibold text-slate-900 text-xs">
                        {records.length} {records.length > 1 ? 'journées' : 'journée'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* KPI Cards Grid */}
              <KPICards kpis={kpis} todayRecord={lastRecord} />

              {/* Panoramic Analytics & Recent Activity Split Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5 min-w-0">
                {/* Left (8 cols on xl): Financial Interactive Charts */}
                <div className="xl:col-span-8 min-w-0">
                  <FinancialCharts records={records} />
                </div>

                {/* Right (4 cols on xl): Recent Journal Entries Widget */}
                <div className="xl:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-card flex flex-col justify-between space-y-3 min-w-0">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <h3 className="text-sm font-semibold text-slate-900">Dernières Écritures</h3>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {records.length} journées
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 mt-1">
                      {records.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          Aucune journée clôturée pour l'instant.
                        </div>
                      ) : (
                        records.slice(-5).reverse().map((r) => {
                          const isDeficit = r.benefice_net < 0;
                          return (
                            <div
                              key={r.id || r.date}
                              onClick={() => setEditingRecord(r)}
                              className="py-2.5 px-2.5 -mx-1.5 rounded-xl hover:bg-slate-50 transition cursor-pointer flex items-center justify-between group"
                              title="Cliquer pour modifier ou inspecter cette journée"
                            >
                              <div className="min-w-0 pr-2">
                                <div className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700 transition">
                                  {formatDateLabel(r.date)}
                                </div>
                                <div className="text-[10.5px] text-slate-400 font-mono mt-0.5">
                                  CA: +{formatFCFA(r.ca_journalier)} • Pub: -{formatFCFA(r.depenses_pub)}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className={`text-xs font-bold font-mono ${isDeficit ? 'text-rose-600' : 'text-slate-900'}`}>
                                  {formatFCFA(r.benefice_net)}
                                </div>
                                <span className={`inline-block text-[9.5px] font-medium px-1.5 py-0.2 rounded mt-0.5 ${
                                  isDeficit
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                }`}>
                                  {r.marge_percent}% net
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <button
                      onClick={() => setCurrentTab('journal')}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition shadow-xs active:scale-95"
                    >
                      <span>Accéder au Journal Complet</span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: JOURNAL */}
          {currentTab === 'journal' && (
            <div className="space-y-4 animate-in fade-in min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/60">
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                    Journal Financier Quotidien
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Toute modification d'une date passée propage instantanément le recalcul en cascade.
                  </p>
                </div>

                {/* View Mode Toggle (Table vs Cards) */}
                <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-slate-200/80 text-xs self-start sm:self-auto shadow-2xs">
                  <button
                    onClick={() => setJournalViewMode('table')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                      journalViewMode === 'table'
                        ? 'bg-slate-900 text-white shadow-xs font-semibold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Table className="h-3.5 w-3.5" />
                    <span>Vue Tableau</span>
                  </button>
                  <button
                    onClick={() => setJournalViewMode('cards')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                      journalViewMode === 'cards'
                        ? 'bg-slate-900 text-white shadow-xs font-semibold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>Vue Fiches</span>
                  </button>
                </div>
              </div>

              {journalViewMode === 'table' ? (
                <JournalTable
                  records={records}
                  onEdit={(r) => setEditingRecord(r)}
                  onDelete={handleDeleteDay}
                />
              ) : (
                <DayCardsView
                  records={records}
                  onEdit={(r) => setEditingRecord(r)}
                  onDelete={handleDeleteDay}
                />
              )}
            </div>
          )}

          {/* TAB 3: ADS MANAGER */}
          {currentTab === 'ads' && (
            <div className="animate-in fade-in min-w-0">
              <AdsManager onExpenseAdded={fetchData} />
            </div>
          )}

          {/* TAB 4: AUDIT LOG */}
          {currentTab === 'audit' && (
            <div className="animate-in fade-in min-w-0">
              <AuditLogViewer />
            </div>
          )}

          {/* TAB 5: EXPORT / IMPORT */}
          {currentTab === 'export-import' && (
            <div className="animate-in fade-in min-w-0">
              <ExportImportModal onImportSuccess={fetchData} />
            </div>
          )}

          {/* TAB 6: SETTINGS */}
          {currentTab === 'settings' && (
            <div className="animate-in fade-in min-w-0">
              <SettingsModal
                onSettingsUpdated={fetchData}
                onDataReset={fetchData}
              />
            </div>
          )}
        </main>
      </div>

      {/* Global Modals */}
      <DayEntryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveNewDay}
        lastRecord={lastRecord}
        initialCapital={settings?.initial_capital || 30000}
        feeRate={(settings?.platform_fee_percent || 5.0) / 100}
      />

      <DayEditModal
        isOpen={Boolean(editingRecord)}
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
        onSave={handleSaveEditDay}
      />

      <CurrencyConverterModal
        isOpen={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
      />
    </div>
  );
}
export default App;
