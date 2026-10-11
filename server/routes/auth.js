/**
 * Routes API d'Authentification Sécurisée - Jude & Benoit
 * ========================================================
 * - Protection Anti-Force Brute (Lockout 15 min au 5e échec)
 * - Jetons de session signés HMAC-SHA256
 * - Hachage fort salé avec migration transparente
 * - Protection contre l'énumération des utilisateurs
 * - Traçabilité de sécurité intégrale dans audit_logs
 */

import express from 'express';
import { query, run, logAudit } from '../db/database.js';
import {
  generateAuthToken,
  verifyPassword,
  loginRateLimiter,
  requireAuth,
} from '../services/security.js';

const router = express.Router();

/**
 * Délai artificiel pour neutraliser les attaques par analyse temporelle (Timing Attacks)
 */
function timingSafeDelay(ms = 250) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST /api/auth/login
 * Vérifie l'adresse e-mail et le mot de passe avec bouclier anti-force brute
 */
router.post('/login', async (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';

  try {
    const { email, password, rememberMe } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Veuillez saisir votre adresse e-mail et votre mot de passe.',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    // 1. VÉRIFICATION DU BOUCLIER ANTI-FORCE BRUTE
    const lockStatus = loginRateLimiter.isLocked(clientIp, cleanEmail);
    if (lockStatus.locked) {
      logAudit({
        user: cleanEmail,
        action: 'SECURITY_BLOCKED',
        entity: 'AUTH',
        reason: `Tentative de connexion bloquée par le bouclier anti-force brute (IP: ${clientIp}). Verrouillage actif pour ${lockStatus.remainingMinutes} min.`,
      });

      return res.status(429).json({
        success: false,
        error: `Accès temporairement suspendu suite à des échecs répétés. Veuillez patienter ${lockStatus.remainingMinutes} minute(s) avant de réessayer.`,
      });
    }

    // 2. RECHERCHE DE L'UTILISATEUR
    const users = query('SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);

    if (!users || users.length === 0) {
      // Échec : utilisateur inconnu
      await timingSafeDelay();
      const failStatus = loginRateLimiter.recordFailure(clientIp, cleanEmail);

      logAudit({
        user: cleanEmail || 'Inconnu',
        action: failStatus.locked ? 'SECURITY_BLOCKED' : 'LOGIN_FAILED',
        entity: 'AUTH',
        reason: failStatus.locked
          ? `Compte/IP verrouillé suite à ${failStatus.failures} échecs consécutifs (IP: ${clientIp})`
          : `Tentative de connexion échouée (compte inconnu) depuis l'IP ${clientIp}`,
      });

      if (failStatus.locked) {
        return res.status(429).json({
          success: false,
          error: `Accès temporairement suspendu suite à des échecs répétés. Veuillez patienter ${failStatus.remainingMinutes} minute(s) avant de réessayer.`,
        });
      }

      // Message opaque unifié (Protection anti-énumération OWASP)
      return res.status(401).json({
        success: false,
        error: 'Identifiants invalides. Veuillez vérifier votre adresse e-mail et votre mot de passe.',
      });
    }

    const user = users[0];

    // 3. VÉRIFICATION SÉCURISÉE DU MOT DE PASSE (Salé / Anti-Timing)
    const { valid, needsUpgrade, newHash } = verifyPassword(cleanPassword, user.password_hash);

    if (!valid) {
      // Échec : mot de passe erroné
      await timingSafeDelay();
      const failStatus = loginRateLimiter.recordFailure(clientIp, cleanEmail);

      logAudit({
        user: user.name,
        action: failStatus.locked ? 'SECURITY_BLOCKED' : 'LOGIN_FAILED',
        entity: 'AUTH',
        entity_id: String(user.id),
        reason: failStatus.locked
          ? `Compte/IP verrouillé suite à ${failStatus.failures} échecs consécutifs (IP: ${clientIp})`
          : `Tentative de connexion échouée (mot de passe incorrect) depuis l'IP ${clientIp}`,
      });

      if (failStatus.locked) {
        return res.status(429).json({
          success: false,
          error: `Accès temporairement suspendu suite à des échecs répétés. Veuillez patienter ${failStatus.remainingMinutes} minute(s) avant de réessayer.`,
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Identifiants invalides. Veuillez vérifier votre adresse e-mail et votre mot de passe.',
      });
    }

    // 4. SUCCÈS : RÉINITIALISATION DU BOUCLIER BRUTE-FORCE
    loginRateLimiter.recordSuccess(clientIp, cleanEmail);

    // 5. MIGRATION AUTOMATIQUE VERS HASH SALÉ FORT SI NÉCESSAIRE
    if (needsUpgrade && newHash) {
      try {
        run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, user.id]);
        console.log(`[SÉCURITÉ] Mot de passe de ${user.name} migré avec succès vers le hachage salé v2.`);
      } catch (e) {
        console.error('Erreur migration hash salé:', e);
      }
    }

    // 6. ÉMISSION DU JETON DE SESSION SÉCURISÉ (HMAC-SHA256)
    // 30 jours si "Se souvenir de moi", sinon 24 heures
    const tokenDuration = rememberMe ? 30 * 24 * 3600 * 1000 : 24 * 3600 * 1000;
    const token = generateAuthToken(user, tokenDuration);

    const now = new Date().toISOString();
    run('UPDATE users SET last_login = ? WHERE id = ?', [now, user.id]);

    // 7. ENREGISTREMENT AU JOURNAL D'AUDIT
    logAudit({
      user: user.name,
      action: 'LOGIN',
      entity: 'AUTH',
      entity_id: String(user.id),
      new_values: { email: user.email, name: user.name, rememberMe: Boolean(rememberMe), ip: clientIp },
      reason: `Connexion sécurisée validée pour ${user.name} (IP: ${clientIp})`,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        last_login: now,
      },
      message: `Bienvenue ${user.name} ! Session active et sécurisée.`,
    });
  } catch (err) {
    console.error('Erreur POST /auth/login:', err);
    res.status(500).json({ success: false, error: 'Une erreur interne de sécurité est survenue.' });
  }
});

/**
 * GET /api/auth/me
 * Vérifie le jeton de session et retourne le profil courant
 */
router.get('/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

/**
 * POST /api/auth/logout
 * Enregistre la déconnexion dans l'audit
 */
router.post('/logout', (req, res) => {
  try {
    const user = req.user?.name || req.headers['x-user'] || req.body?.user || 'Jude';
    logAudit({
      user,
      action: 'LOGOUT',
      entity: 'AUTH',
      reason: `Déconnexion volontaire de ${user}`,
    });
    res.json({ success: true, message: 'Déconnexion réussie.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/auth/users
 * Retourne la liste des comptes configurés (protégé par authentification)
 */
router.get('/users', requireAuth, (req, res) => {
  try {
    const users = query('SELECT id, name, email, role, last_login FROM users ORDER BY id ASC');
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
