/**
 * Module de Cyber-Défense, Cryptographie & Sécurité
 * ==================================================
 * - Jetons de session signés HMAC-SHA256 (Anti-Usurpation)
 * - Bouclier Anti-Force Brute & Lockout IP (5 tentatives max / 15 min)
 * - Hachage renforcé avec sel cryptographique (PBKDF2 / SHA-256 salé)
 * - Bouclier Anti-Injections CSS & Exfiltration de Données (CSP + Sanitizer)
 * - En-têtes de Sécurité HTTP Stricts (OWASP Top 10)
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SECRET_FILE = path.resolve(__dirname, '../data/.auth_secret');

/**
 * Récupère ou génère une clé secrète serveur cryptographiquement forte de 512 bits
 */
function getOrGenerateSecret() {
  try {
    if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32) {
      return process.env.AUTH_SECRET;
    }
    if (fs.existsSync(SECRET_FILE)) {
      const stored = fs.readFileSync(SECRET_FILE, 'utf-8').trim();
      if (stored.length >= 64) return stored;
    }
    const newSecret = crypto.randomBytes(64).toString('hex');
    fs.writeFileSync(SECRET_FILE, newSecret, { mode: 0o600 });
    return newSecret;
  } catch (err) {
    // Fallback mémoire sécurisé si problème d'accès disque
    return 'compta_prod_secure_secret_' + crypto.randomBytes(32).toString('hex');
  }
}

const SERVER_SECRET = getOrGenerateSecret();

// =========================================================================
// 1. JETONS DE SESSION SIGNÉS (HMAC-SHA256)
// =========================================================================

/**
 * Génère un jeton d'accès sécurisé signé avec horodatage et identité
 * @param {Object} user 
 * @param {number} expiresInMs Durée de validité (défaut : 24 heures)
 */
export function generateAuthToken(user, expiresInMs = 24 * 60 * 60 * 1000) {
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    iat: Date.now(),
    exp: Date.now() + expiresInMs,
    jti: crypto.randomBytes(16).toString('hex'), // Identifiant unique anti-rejeu
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SERVER_SECRET)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Vérifie et décode un jeton d'accès signé
 * Rejette immédiatement les jetons falsifiés, altérés ou expirés
 */
export function verifyAuthToken(token) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;

  // Recalcul de la signature attendue
  const expectedSig = crypto
    .createHmac('sha256', SERVER_SECRET)
    .update(payloadB64)
    .digest('base64url');

  // Comparaison en temps constant pour neutraliser les attaques par analyse temporelle
  try {
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));

    // Vérification de l'expiration
    if (!payload.exp || Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch (e) {
    return null;
  }
}

// =========================================================================
// 2. HACHAGE DE MOT DE PASSE AVEC SEL CRYPTOGRAPHIQUE
// =========================================================================

/**
 * Hache un mot de passe avec un sel cryptographique aléatoire de 128 bits
 * Format de sortie : "v2:salt:hash"
 */
export function hashPasswordSalted(password, customSalt = null) {
  const salt = customSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(String(password), salt, 100000, 32, 'sha256')
    .toString('hex');
  return `v2:${salt}:${hash}`;
}

/**
 * Hachage legacy simple SHA-256 (pour vérification et migration automatique)
 */
export function hashPasswordLegacy(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

/**
 * Vérifie un mot de passe contre son hash stocké (supporte v2 salé et migration v1 legacy)
 * @returns {{ valid: boolean, needsUpgrade: boolean, newHash?: string }}
 */
export function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return { valid: false, needsUpgrade: false };

  // Format v2 avec sel
  if (storedHash.startsWith('v2:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return { valid: false, needsUpgrade: false };
    const salt = parts[1];
    const candidate = hashPasswordSalted(password, salt);
    
    const candidateBuf = Buffer.from(candidate);
    const storedBuf = Buffer.from(storedHash);
    const valid = candidateBuf.length === storedBuf.length && crypto.timingSafeEqual(candidateBuf, storedBuf);
    return { valid, needsUpgrade: false };
  }

  // Format legacy (SHA-256 non salé)
  const legacyHash = hashPasswordLegacy(password);
  const candidateBuf = Buffer.from(legacyHash);
  const storedBuf = Buffer.from(storedHash);
  const valid = candidateBuf.length === storedBuf.length && crypto.timingSafeEqual(candidateBuf, storedBuf);

  if (valid) {
    // Le mot de passe est bon, mais doit être migré vers le hash salé fort v2
    return { valid: true, needsUpgrade: true, newHash: hashPasswordSalted(password) };
  }

  return { valid: false, needsUpgrade: false };
}

// =========================================================================
// 3. BOUCLIER ANTI-FORCE BRUTE & VERROUILLAGE (RATE LIMITER / LOCKOUT)
// =========================================================================

/**
 * Registre en mémoire des tentatives de connexion
 * Structure : { [key]: { failures: number, lockedUntil: number, firstAttempt: number } }
 */
const loginAttempts = new Map();

const MAX_FAILURES = 5; // Nombre maximum d'échecs avant blocage
const LOCKOUT_TIME_MS = 15 * 60 * 1000; // 15 minutes de bannissement temporaire
const WINDOW_TIME_MS = 15 * 60 * 1000; // Fenêtre d'analyse de 15 minutes

export const loginRateLimiter = {
  /**
   * Vérifie si une IP ou un e-mail est actuellement verrouillé
   */
  isLocked(ip, email) {
    const now = Date.now();
    const keys = [ip, `email:${email?.toLowerCase()}`].filter(Boolean);

    for (const key of keys) {
      const record = loginAttempts.get(key);
      if (record && record.lockedUntil && now < record.lockedUntil) {
        const remainingMinutes = Math.ceil((record.lockedUntil - now) / 60000);
        return { locked: true, remainingMinutes };
      }
    }
    return { locked: false, remainingMinutes: 0 };
  },

  /**
   * Enregistre un échec de connexion
   */
  recordFailure(ip, email) {
    const now = Date.now();
    const keys = [ip, `email:${email?.toLowerCase()}`].filter(Boolean);
    let isNowLocked = false;
    let maxFailures = 0;

    for (const key of keys) {
      let record = loginAttempts.get(key);
      if (!record || now - record.firstAttempt > WINDOW_TIME_MS) {
        record = { failures: 1, lockedUntil: 0, firstAttempt: now };
      } else {
        record.failures += 1;
      }

      if (record.failures >= MAX_FAILURES) {
        record.lockedUntil = now + LOCKOUT_TIME_MS;
        isNowLocked = true;
      }

      maxFailures = Math.max(maxFailures, record.failures);
      loginAttempts.set(key, record);
    }

    return {
      locked: isNowLocked,
      remainingMinutes: isNowLocked ? Math.ceil(LOCKOUT_TIME_MS / 60000) : 0,
      failures: maxFailures,
    };
  },

  /**
   * Réinitialise les compteurs lors d'une connexion réussie
   */
  recordSuccess(ip, email) {
    const keys = [ip, `email:${email?.toLowerCase()}`].filter(Boolean);
    for (const key of keys) {
      loginAttempts.delete(key);
    }
  },
};

// Nettoyage régulier des anciens enregistrements pour éviter les fuites mémoire
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of loginAttempts.entries()) {
    if (record.lockedUntil && now > record.lockedUntil) {
      loginAttempts.delete(key);
    } else if (now - record.firstAttempt > WINDOW_TIME_MS) {
      loginAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000);

// =========================================================================
// 4. PROTECTION ANTI-INJECTIONS CSS & ASSAINISSEMENT DES ENTRÉES
// =========================================================================

/**
 * Motifs malveillants d'injection CSS et d'exfiltration de données
 */
const CSS_INJECTION_PATTERNS = [
  /url\s*\(/i,                     // url(...) servant à l'exfiltration vers un serveur tiers
  /@import\s+/i,                   // @import pour charger du CSS externe
  /expression\s*\(/i,              // expression(...) pour exécution de script dans d'anciennes règles
  /behavior\s*:/i,                 // behavior pour scripts HTC
  /-moz-binding\s*:/i,             // liaisons XBL
  /<\s*style[^>]*>/i,              // balise <style>
  /<\s*\/\s*style\s*>/i,           // balise </style>
  /style\s*=\s*["'][^"']*url/i,    // attribut style avec chargement d'URL
  /javascript\s*:/i,               // pseudo-protocole javascript:
  /data\s*:\s*text\/html/i,        // data URL HTML
];

/**
 * Détecte si une chaîne contient une tentative d'injection CSS
 */
export function detectCssInjection(str) {
  if (typeof str !== 'string') return false;
  return CSS_INJECTION_PATTERNS.some((pattern) => pattern.test(str));
}

/**
 * Assainit une chaîne en supprimant les balises HTML/CSS et les vecteurs d'attaque
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;

  let sanitized = input;
  // Neutraliser les balises scripts et styles
  sanitized = sanitized.replace(/<\s*style[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi, '');
  sanitized = sanitized.replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '');
  sanitized = sanitized.replace(/<[^>]+>/g, ''); // Supprime toutes les balises HTML

  // Neutraliser les directives CSS d'exfiltration
  sanitized = sanitized.replace(/url\s*\([^)]*\)/gi, '[blocked-url]');
  sanitized = sanitized.replace(/@import\s+[^;]+;?/gi, '[blocked-import]');
  sanitized = sanitized.replace(/expression\s*\([^)]*\)/gi, '[blocked-expr]');
  sanitized = sanitized.replace(/javascript\s*:/gi, '[blocked-js]:');

  return sanitized.trim();
}

/**
 * Middleware qui assainit récursivement toutes les entrées textuelles de req.body
 */
export function sanitizeBodyMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    let detectedAttack = false;

    const sanitizeObject = (obj) => {
      for (const [key, val] of Object.entries(obj)) {
        if (typeof val === 'string') {
          if (detectCssInjection(val)) {
            detectedAttack = true;
          }
          obj[key] = sanitizeInput(val);
        } else if (val && typeof val === 'object' && !Array.isArray(val)) {
          sanitizeObject(val);
        }
      }
    };

    sanitizeObject(req.body);

    if (detectedAttack) {
      console.warn(`[CYBER-DÉFENSE] Tentative d'injection CSS neutralisée depuis l'IP ${req.ip}`);
    }
  }
  next();
}

// =========================================================================
// 5. EN-TÊTES DE SÉCURITÉ HTTP STRICTS (OWASP & ANTI-EXFILTRATION CSS)
// =========================================================================

/**
 * Middleware injectant les en-têtes HTTP de sécurité renforcés
 */
export function securityHeadersMiddleware(req, res, next) {
  // Masquage de l'empreinte technologique du serveur
  res.removeHeader('X-Powered-By');

  // 1. Content Security Policy (CSP) : Bloque strictement les connexions externes et les CSS tiers
  const cspPolicy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'", // Autorise Tailwind / React interne, mais interdit les styles distants
    "img-src 'self' data: blob:",        // Empêche CSS background: url('https://evil.com/...')
    "connect-src 'self'",                // Interdit toute exfiltration de données vers des API tierces
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join('; ');

  res.setHeader('Content-Security-Policy', cspPolicy);

  // 2. Protection contre le reniflage de type MIME
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 3. Protection anti-Clickjacking (interdit l'encapsulation dans un iframe externe)
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // 4. Protection XSS pour navigateurs compatibles
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // 5. Protection contre les fuites de référant
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 6. Restriction des accès matériels
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  next();
}

// =========================================================================
// 6. MIDDLEWARE D'AUTHENTIFICATION STRICT (REQUIRE AUTH)
// =========================================================================

/**
 * Vérifie la présence et la validité du jeton Bearer sur les routes protégées
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-auth-token']) {
    token = req.headers['x-auth-token'];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Accès refusé. Jeton d’authentification manquant.',
    });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return res.status(401).json({
      success: false,
      error: 'Session invalide ou expirée. Veuillez vous reconnecter.',
    });
  }

  // Injecter l'utilisateur authentifié dans la requête
  req.user = payload;
  next();
}
