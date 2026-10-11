import React from 'react';
import { Plus, RefreshCw, Wallet, Menu, X, ArrowRightLeft } from 'lucide-react';
import { formatFCFA } from '../../utils/formatters';

export function Navbar({
  settings,
  kpis,
  onOpenAddModal,
  onOpenCurrencyConverter,
  onRefresh,
  loading,
  isMobileMenuOpen,
  onToggleMobileMenu,
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-2.5 sm:px-6 lg:px-8 py-2 sm:py-2.5">
      <div className="w-full flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Left: Mobile hamburger + Brand */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 min-w-0 flex-1 mr-1">
          {/* Mobile hamburger button */}
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition shrink-0"
            aria-label="Ouvrir le menu mobile"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Clean Logo Mark */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-950 flex items-center justify-center text-white shadow-xs shrink-0 ring-1 ring-slate-900/10">
            <Wallet className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-400" strokeWidth={1.8} />
          </div>

          {/* Business Title & Subtitle */}
          <div className="min-w-0 flex-1">
            <h1 className="text-xs sm:text-base font-bold text-slate-900 tracking-tight truncate leading-tight">
              {settings?.business_name || 'E-commerce Digital'}
            </h1>
            <div className="text-[10px] sm:text-[11px] text-slate-500 flex items-center gap-1 sm:gap-1.5 mt-0.5 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="font-medium truncate">Trésorerie & Audit</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Capital + Currency Converter + Refresh + Primary CTA */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          {/* Quick Capital Display */}
          <div className="hidden xl:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">Capital :</span>
            <span className="font-mono font-semibold text-emerald-700">
              {formatFCFA(kpis?.capitalFinalCurrent ?? settings?.initial_capital ?? 30000)}
            </span>
          </div>

          {/* Currency Converter Quick Button */}
          <button
            onClick={onOpenCurrencyConverter}
            type="button"
            title="Convertisseur de devises en direct (USD / EUR / FCFA)"
            className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-2xs active:scale-95 shrink-0"
          >
            <ArrowRightLeft className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden sm:inline text-xs font-medium">Devises</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            title="Rafraîchir les données"
            className="p-1.5 sm:p-2 rounded-xl bg-white border border-slate-200/80 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition shadow-2xs active:scale-95 shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${loading ? 'animate-spin text-slate-900' : ''}`} />
          </button>

          {/* Primary CTA (Obsidian) */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center space-x-1 sm:space-x-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm shadow-xs transition active:scale-95 shrink-0"
          >
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" strokeWidth={2.5} />
            <span className="hidden sm:inline">Ajouter une Journée</span>
            <span className="sm:hidden text-xs">Ajouter</span>
          </button>
        </div>
      </div>
    </header>
  );
}
export default Navbar;
