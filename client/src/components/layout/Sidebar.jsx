import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Megaphone,
  ShieldCheck,
  FileSpreadsheet,
  Sliders,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';

export function Sidebar({
  currentTab,
  setCurrentTab,
  isMobileMenuOpen,
  onCloseMobileMenu,
  isCollapsed = false,
  onToggleCollapse,
}) {
  const { user, logout } = useAuth();
  const { confirm, showToast } = useNotification();
  const { toggleTheme, isDark } = useTheme();

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Déconnexion',
      message: `Voulez-vous fermer la session de travail de ${user?.name || 'votre compte'} ?`,
      confirmText: 'Se déconnecter',
      cancelText: 'Rester connecté',
      variant: 'warning',
    });
    if (ok) {
      await logout();
      showToast('Session fermée avec succès.', 'info');
    }
  };

  const isJude = user?.name?.toLowerCase().includes('jude');

  const navItems = [
    {
      id: 'dashboard',
      label: 'Tableau de Bord',
      icon: LayoutDashboard,
      description: 'KPIs & Graphiques financiers',
    },
    {
      id: 'journal',
      label: 'Journal Financier',
      icon: BookOpen,
      description: 'Opérations quotidiennes & Recalculs',
    },
    {
      id: 'ads',
      label: 'Dépenses Publicitaires',
      icon: Megaphone,
      description: 'Facebook, TikTok & Budgets',
    },
    {
      id: 'audit',
      label: 'Journal d’Audit',
      icon: ShieldCheck,
      description: 'Traçabilité & Historique complet',
    },
    {
      id: 'export-import',
      label: 'Import / Export',
      icon: FileSpreadsheet,
      description: 'Excel (.xlsx) & CSV autonome',
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: Sliders,
      description: 'Capital initial & Règles de calcul',
    },
  ];

  const handleSelectTab = (id) => {
    setCurrentTab(id);
    if (onCloseMobileMenu) onCloseMobileMenu();
  };

  const renderNavContent = (collapsed) => (
    <div className={`flex flex-col justify-between h-full ${collapsed ? 'p-2.5' : 'p-3.5 sm:p-4'}`}>
      <div className="space-y-4">
        {/* Top Header / Collapse Control */}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between px-3'}`}>
          {!collapsed ? (
            <>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                Navigation
              </span>
              <div className="flex items-center space-x-1">
                {/* Desktop Collapse Button */}
                {onToggleCollapse && (
                  <button
                    onClick={onToggleCollapse}
                    className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition active:scale-95"
                    title="Réduire la barre latérale"
                  >
                    <ChevronsLeft className="h-4 w-4" strokeWidth={2} />
                  </button>
                )}
                {/* Mobile Drawer Close Button */}
                <button
                  onClick={onCloseMobileMenu}
                  className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex w-9 h-9 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition active:scale-95 items-center justify-center"
              title="Déployer la barre latérale"
            >
              <ChevronsRight className="h-4.5 w-4.5" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            if (collapsed) {
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  title={`${item.label} — ${item.description}`}
                  className={`w-full flex items-center justify-center p-3 rounded-xl transition group relative ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 transition ${
                      isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-900'
                    }`}
                    strokeWidth={1.75}
                  />
                  {isActive && (
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-4 bg-emerald-400 rounded-full"></span>
                  )}
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition group ${
                  isActive
                    ? 'bg-slate-900 text-white font-medium shadow-xs shadow-slate-900/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <Icon
                    className={`h-4.5 w-4.5 shrink-0 transition ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                    }`}
                    strokeWidth={1.75}
                  />
                  <div className="min-w-0">
                    <div className="text-xs sm:text-[13px] truncate leading-tight font-medium">
                      {item.label}
                    </div>
                    <div
                      className={`text-[10.5px] truncate mt-0.5 ${
                        isActive ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      {item.description}
                    </div>
                  </div>
                </div>
                <ChevronRight
                  className={`h-3.5 w-3.5 shrink-0 transition ${
                    isActive ? 'text-white translate-x-0.5' : 'text-slate-300 opacity-0 group-hover:opacity-100'
                  }`}
                />
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Area: User Profile & Logout Button + Database info */}
      <div className="space-y-2 pt-3 border-t border-slate-100">
        {!collapsed ? (
          <>
            {/* Theme Toggle in Expanded Sidebar */}
            <button
              onClick={toggleTheme}
              type="button"
              className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition active:scale-98"
            >
              <div className="flex items-center space-x-2">
                {isDark ? (
                  <Sun className="h-4 w-4 text-amber-500" />
                ) : (
                  <Moon className="h-4 w-4 text-slate-600" />
                )}
                <span className="font-medium text-[11.5px]">
                  {isDark ? 'Mode Sombre actif' : 'Mode Clair actif'}
                </span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-500">
                {isDark ? 'Nuit' : 'Jour'}
              </span>
            </button>

            {/* User Profile Card with integrated Logout */}
            {user && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-2xs ${
                      isJude ? 'bg-emerald-600' : 'bg-teal-600'
                    }`}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800 truncate leading-tight">
                      {user.name}
                    </div>
                    <div className="text-[10.5px] text-slate-400 truncate leading-none mt-0.5">
                      {user.role || (isJude ? 'Responsable' : 'Comptable')}
                    </div>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  title={`Déconnexion (${user.name})`}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition shrink-0 active:scale-95"
                  aria-label="Se déconnecter"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          /* Collapsed User & Logout & Theme */
          <div className="flex flex-col items-center space-y-2">
            <button
              onClick={toggleTheme}
              title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition active:scale-95"
              aria-label="Basculer le mode sombre ou clair"
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
            </button>

            {user && (
              <>
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-2xs ${
                    isJude ? 'bg-emerald-600' : 'bg-teal-600'
                  }`}
                  title={`${user.name} (${user.role || 'Comptable'})`}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>

                <button
                  onClick={handleLogout}
                  title={`Déconnexion (${user.name})`}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition active:scale-95"
                  aria-label="Se déconnecter"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Collapsible Sidebar */}
      <aside
        className={`hidden md:flex ${
          isCollapsed ? 'w-16 lg:w-18' : 'w-64 lg:w-72'
        } bg-white border-r border-slate-200/70 flex-col shrink-0 min-h-[calc(100vh-65px)] transition-all duration-300 ease-in-out`}
      >
        {renderNavContent(isCollapsed)}
      </aside>

      {/* 2. Mobile Drawer (Always Full Width) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobileMenu}
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-left duration-200 border-r border-slate-200">
            {renderNavContent(false)}
          </div>
        </div>
      )}
    </>
  );
}
export default Sidebar;
