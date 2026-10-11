import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Wallet,
  ArrowRightLeft,
} from 'lucide-react';

export default function LoginPortal() {
  const { login, loading } = useAuth();
  const { showToast } = useNotification();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('Veuillez renseigner votre email et mot de passe.');
      return;
    }

    try {
      const res = await login(email.trim(), password, rememberMe);
      if (res.success) {
        showToast(`Bienvenue ${res.user.name} ! Accès autorisé.`, 'success');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Identifiants incorrects.');
      showToast(err.message || 'Identifiants incorrects.', 'error');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] flex flex-col lg:flex-row text-slate-900 font-sans selection:bg-emerald-500/20 selection:text-emerald-900 relative overflow-hidden">
      {/* Halos lumineux d'arrière-plan très doux et discrets */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-slate-200/30 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />

      {/* PANNEAU GAUCHE : IDENTITÉ ÉPURÉE & MODERNE BLANCHE */}
      <div className="relative w-full lg:w-1/2 p-6 sm:p-10 lg:p-16 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200/80 bg-white">
        {/* Header / Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-slate-950 flex items-center justify-center text-white shadow-xs ring-1 ring-slate-900/10 shrink-0">
              <Wallet className="w-5 h-5 text-emerald-400" strokeWidth={1.8} />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-slate-900">
                COMPTA DIGITALE
              </div>
              <p className="text-[11px] text-slate-500">Trésorerie & Audit Financier</p>
            </div>
          </div>
        </div>

        {/* Slogan Central Épuré */}
        <div className="relative z-10 my-8 lg:my-auto space-y-6 max-w-xl">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
            Pilotez votre rentabilité avec une clarté absolue.
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
            Plateforme financière dédiée aux produits digitaux. Suivi en temps réel de votre trésorerie,
            traçabilité des dépenses publicitaires multi-devises (USD / EUR / FCFA) et recalculs en cascade.
          </p>

          {/* Cartes de garanties blanches épurées */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-start gap-3 hover:border-emerald-300 transition">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">Traçabilité Intégrale</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Chaque opération est enregistrée au journal d'audit certifié.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-start gap-3 hover:border-emerald-300 transition">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">Cascade Automatique</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Recalcul instantané du capital final et des marges nettes.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-start gap-3 hover:border-emerald-300 transition sm:col-span-2">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">Multi-Devises en Direct</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Achetez vos publicités en USD ($) ou EUR (€) et vendez en FCFA avec taux dynamiques.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Panneau Gauche */}
        <div className="relative z-10 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>&copy; {new Date().getFullYear()} E-commerce Digital &bull; Zone FCFA</span>
        </div>
      </div>

      {/* PANNEAU DROIT : FORMULAIRE D'ACCÈS ÉPURÉ BLANC */}
      <div className="w-full lg:w-1/2 p-6 sm:p-12 lg:p-16 flex flex-col justify-center items-center bg-[#FAFAFA]">
        <div className="w-full max-w-md bg-white p-7 sm:p-10 rounded-3xl border border-slate-200/80 shadow-lg shadow-slate-200/50 space-y-6">
          {/* Titre Formulaire */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Connexion Comptable
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Identifiez-vous pour ouvrir votre session de travail.
            </p>
          </div>

          {/* Message d'erreur */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-shake">
              <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Adresse e-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@compta.local"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition shadow-2xs"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Mot de passe
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Options additionnelles */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
                />
                <span className="text-xs text-slate-500">Se souvenir de moi</span>
              </label>
            </div>

            {/* Bouton de Soumission */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-medium text-xs sm:text-sm text-white bg-slate-950 hover:bg-slate-800 active:scale-[0.99] transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Vérification des accès...</span>
                </>
              ) : (
                <>
                  <span>Accéder à l’espace comptable</span>
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
