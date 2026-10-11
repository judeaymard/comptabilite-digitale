import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  AlertTriangle,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Info,
  X,
  HelpCircle,
} from 'lucide-react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  // Confirm Modal state
  const [confirmDialog, setConfirmDialog] = useState(null);
  const confirmResolveRef = useRef(null);

  // Alert Modal state
  const [alertDialog, setAlertDialog] = useState(null);
  const alertResolveRef = useRef(null);

  // Toasts state
  const [toasts, setToasts] = useState([]);

  // 1. CONFIRM DIALOG (Promise-based)
  const confirm = useCallback(
    ({
      title = 'Confirmation',
      message = 'Voulez-vous continuer cette action ?',
      confirmText = 'Confirmer',
      cancelText = 'Annuler',
      variant = 'danger', // 'danger' | 'warning' | 'info'
    }) => {
      return new Promise((resolve) => {
        confirmResolveRef.current = resolve;
        setConfirmDialog({
          title,
          message,
          confirmText,
          cancelText,
          variant,
        });
      });
    },
    []
  );

  const handleConfirmAction = (result) => {
    if (confirmResolveRef.current) {
      confirmResolveRef.current(result);
      confirmResolveRef.current = null;
    }
    setConfirmDialog(null);
  };

  // 2. ALERT MODAL (Promise-based)
  const alertModal = useCallback(
    ({
      title = 'Information',
      message = '',
      buttonText = 'D’accord',
      variant = 'info', // 'info' | 'success' | 'warning' | 'danger'
    }) => {
      return new Promise((resolve) => {
        alertResolveRef.current = resolve;
        setAlertDialog({
          title,
          message,
          buttonText,
          variant,
        });
      });
    },
    []
  );

  const handleAlertDismiss = () => {
    if (alertResolveRef.current) {
      alertResolveRef.current(true);
      alertResolveRef.current = null;
    }
    setAlertDialog(null);
  };

  // 3. TOASTS
  const addToast = useCallback((type, message, title = null) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, message, title }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = {
    success: (message, title = 'Succès') => addToast('success', message, title),
    error: (message, title = 'Erreur') => addToast('error', message, title),
    warning: (message, title = 'Attention') => addToast('warning', message, title),
    info: (message, title = 'Information') => addToast('info', message, title),
  };

  const showToast = (message, type = 'info') => {
    if (notify[type]) {
      notify[type](message);
    } else {
      notify.info(message);
    }
  };

  return (
    <NotificationContext.Provider value={{ confirm, alertModal, notify, showToast }}>
      {children}

      {/* CONFIRM MODAL DIALOG */}
      {confirmDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => handleConfirmAction(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header with Status Icon */}
            <div className="flex items-start space-x-3.5">
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  confirmDialog.variant === 'danger'
                    ? 'bg-rose-50 text-rose-600 border border-rose-100'
                    : confirmDialog.variant === 'warning'
                    ? 'bg-amber-50 text-amber-600 border border-amber-100'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {confirmDialog.variant === 'danger' ? (
                  <Trash2 className="h-5 w-5" />
                ) : confirmDialog.variant === 'warning' ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <HelpCircle className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
                  {confirmDialog.title}
                </h3>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleConfirmAction(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium text-xs sm:text-sm transition active:scale-95 shadow-2xs"
              >
                {confirmDialog.cancelText}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmAction(true)}
                className={`px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm text-white shadow-xs transition active:scale-95 ${
                  confirmDialog.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : confirmDialog.variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALERT MODAL DIALOG */}
      {alertDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={handleAlertDismiss}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start space-x-3.5">
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  alertDialog.variant === 'danger'
                    ? 'bg-rose-50 text-rose-600 border border-rose-100'
                    : alertDialog.variant === 'success'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    : alertDialog.variant === 'warning'
                    ? 'bg-amber-50 text-amber-600 border border-amber-100'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {alertDialog.variant === 'danger' ? (
                  <AlertCircle className="h-5 w-5" />
                ) : alertDialog.variant === 'success' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : alertDialog.variant === 'warning' ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <Info className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
                  {alertDialog.title}
                </h3>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                  {alertDialog.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleAlertDismiss}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm shadow-xs transition active:scale-95"
              >
                {alertDialog.buttonText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOASTS NOTIFICATIONS */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto bg-white rounded-2xl border p-4 shadow-xl flex items-start space-x-3 animate-in slide-in-from-top-3 fade-in duration-200 ${
              toast.type === 'success'
                ? 'border-emerald-200/90 text-slate-900 shadow-emerald-500/5'
                : toast.type === 'error'
                ? 'border-rose-200/90 text-slate-900 shadow-rose-500/5'
                : toast.type === 'warning'
                ? 'border-amber-200/90 text-slate-900 shadow-amber-500/5'
                : 'border-slate-200/90 text-slate-900 shadow-slate-900/5'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : toast.type === 'error' ? (
                <AlertCircle className="h-5 w-5 text-rose-500" />
              ) : toast.type === 'warning' ? (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              ) : (
                <Info className="h-5 w-5 text-slate-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              {toast.title && (
                <h4 className="text-xs font-bold text-slate-900 tracking-tight leading-tight">
                  {toast.title}
                </h4>
              )}
              <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition shrink-0 -mr-1 -mt-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotify() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotify must be used within a NotificationProvider');
  }
  return context;
}

export const useNotification = useNotify;
