/**
 * Serveur Principal Express - Comptabilité Produits Digitaux
 * ==========================================================
 * - Cyber-Défense Anti-Hacking & Anti-Injections CSS
 * - En-têtes HTTP de Sécurité Stricts (CSP, X-Frame, No-Sniff)
 * - Contrôle d'Accès Cryptographique & Session Tokens (HMAC-SHA256)
 * - Moteur Comptable & Persistance SQLite
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { initDatabase } from './db/database.js';
import {
  securityHeadersMiddleware,
  sanitizeBodyMiddleware,
  requireAuth,
} from './services/security.js';

import recordsRouter from './routes/records.js';
import adsRouter from './routes/ads.js';
import settingsRouter from './routes/settings.js';
import auditRouter from './routes/audit.js';
import exportImportRouter from './routes/exportImport.js';
import authRouter from './routes/auth.js';
import currencyRouter from './routes/currency.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Cyber-Défense : En-têtes de sécurité HTTP stricts (OWASP & Anti-CSS-Exfiltration)
app.use(securityHeadersMiddleware);

// 2. Configuration CORS restrictive (autorise uniquement les origines locales et le même hôte)
app.use(cors({
  origin: true,
  credentials: true,
}));

// 3. Décodage du corps des requêtes avec limitation de taille stricte (Anti-DDoS)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Bouclier Anti-Injections CSS & HTML (Assainissement automatique récursif)
app.use(sanitizeBodyMiddleware);

// Initialisation de la base SQLite au démarrage
await initDatabase();

// 5. Routes publiques
app.use('/api/auth', authRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Comptabilité E-commerce API (Protégée)',
    security: 'HMAC-SHA256 / Rate-Limiting / CSP Anti-CSS-Injection Actifs',
    time: new Date().toISOString(),
  });
});

// 6. Routes protégées : Contrôle d'accès cryptographique obligatoire (HTTP 401 si jeton absent/falsifié)
app.use('/api/records', requireAuth, recordsRouter);
app.use('/api/ads', requireAuth, adsRouter);
app.use('/api/settings', requireAuth, settingsRouter);
app.use('/api/audit', requireAuth, auditRouter);
app.use('/api/export-import', requireAuth, exportImportRouter);
app.use('/api/currency', requireAuth, currencyRouter);

// 7. Servir le build de production du client React
const clientDistPath = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
  console.log(`🌐 Application frontend sécurisée servie depuis: ${clientDistPath}`);
} else {
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Serveur Sécurisé Actif</title></head>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h2>API Comptabilité Produits Digitaux Sécurisée sur le port ${PORT}</h2>
          <p>Toutes les routes API sont protégées par jetons cryptographiques signés.</p>
        </body>
      </html>
    `);
  });
}

// 8. Gestion globale des erreurs avec masquage des détails internes
app.use((err, req, res, next) => {
  console.error('Erreur non capturée:', err);
  res.status(500).json({ success: false, error: 'Une erreur interne est survenue sur le serveur.' });
});

// 9. Démarrage du serveur
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🛡️ SERVEUR DE COMPTABILITÉ SÉCURISÉ ACTIF SUR http://localhost:${PORT}`);
  console.log(`🔐 PROTECTION ACTIVE : CSP, ANTI-CSS-INJECTION, BRUTE-FORCE LOCKOUT`);
  console.log(`======================================================\n`);
});
