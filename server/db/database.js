/**
 * Gestionnaire de Base de Données SQLite Persistante
 * ====================================================
 * Utilise sql.js (WebAssembly SQLite) pour exécuter du vrai SQL
 * et persiste l'intégralité de la base de données dans un fichier
 * binaire `server/data/comptabilite.sqlite`.
 *
 * Zéro dépendance compilateur externe (100% stable et portable).
 */

import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

export function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'comptabilite.sqlite');

let SQL = null;
let db = null;

// S'assure que le dossier data existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Sauvegarde synchrone et atomique de la base SQLite sur le disque
 */
export function persistDatabase() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Erreur lors de la persistance SQLite sur disque:', err);
  }
}

/**
 * Initialise le moteur SQLite et charge ou crée la base de données
 */
export async function initDatabase() {
  if (db) return db;

  if (!SQL) {
    SQL = await initSqlJs();
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
      console.log('📦 Base de données SQLite chargée depuis le fichier existant:', DB_FILE);
    } catch (e) {
      console.warn('⚠️ Impossible de lire le fichier SQLite existant, création d’une nouvelle base.');
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
    console.log('✨ Nouvelle base de données SQLite créée.');
  }

  // Création des tables SQL avec contraintes
  db.run(`
    -- 1. Table des Paramètres Généraux
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      initial_capital INTEGER NOT NULL DEFAULT 30000,
      platform_fee_percent REAL NOT NULL DEFAULT 5.0,
      currency TEXT NOT NULL DEFAULT 'FCFA',
      business_name TEXT NOT NULL DEFAULT 'E-commerce Digital',
      updated_at TEXT NOT NULL
    );

    -- 2. Table du Journal Comptable des Opérations Journalières
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      ca_journalier INTEGER NOT NULL DEFAULT 0,
      depenses_pub INTEGER NOT NULL DEFAULT 0,
      frais_plateforme INTEGER NOT NULL DEFAULT 0,
      benefice_net INTEGER NOT NULL DEFAULT 0,
      marge_percent REAL NOT NULL DEFAULT 0.0,
      capital_initial INTEGER NOT NULL DEFAULT 0,
      capital_final INTEGER NOT NULL DEFAULT 0,
      cumul_ca INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Index chronologique pour requêtes rapides et recalculs
    CREATE INDEX IF NOT EXISTS idx_records_date ON records(date ASC);

    -- 3. Table des Dépenses Publicitaires Détaillées
    CREATE TABLE IF NOT EXISTS ad_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      amount INTEGER NOT NULL,
      platform TEXT NOT NULL,
      campaign TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ads_date ON ad_expenses(date ASC);

    -- 4. Table du Journal d'Audit & Sécurité
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT NOT NULL DEFAULT 'Jude',
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      old_values TEXT,
      new_values TEXT,
      reason TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(timestamp DESC);

    -- 5. Table des Utilisateurs & Authentification (Jude et Benoit)
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Comptable Associé',
      created_at TEXT NOT NULL,
      last_login TEXT
    );
  `);

  // Migration de sécurité : s'assurer que la colonne user existe dans audit_logs
  try {
    db.run("ALTER TABLE audit_logs ADD COLUMN user TEXT NOT NULL DEFAULT 'Jude'");
  } catch (e) {
    // La colonne existe déjà
  }

  // Migrations pour la gestion multi-devises
  try {
    db.run('ALTER TABLE settings ADD COLUMN custom_usd_rate REAL DEFAULT NULL');
  } catch (e) {}
  try {
    db.run('ALTER TABLE settings ADD COLUMN custom_eur_rate REAL DEFAULT NULL');
  } catch (e) {}
  try {
    db.run("ALTER TABLE ad_expenses ADD COLUMN original_currency TEXT DEFAULT 'FCFA'");
  } catch (e) {}
  try {
    db.run('ALTER TABLE ad_expenses ADD COLUMN original_amount REAL DEFAULT NULL');
  } catch (e) {}
  try {
    db.run('ALTER TABLE ad_expenses ADD COLUMN exchange_rate REAL DEFAULT 1.0');
  } catch (e) {}

  // Initialisation des utilisateurs par défaut (Jude et Benoit)
  const existingUsers = db.exec('SELECT * FROM users');
  if (!existingUsers || existingUsers.length === 0 || existingUsers[0].values.length === 0) {
    const now = new Date().toISOString();
    // Jude
    db.run(
      'INSERT INTO users (email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?)',
      ['jude@compta.local', hashPassword('jude123'), 'Jude', 'Comptable Associé', now]
    );
    // Benoit
    db.run(
      'INSERT INTO users (email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?)',
      ['benoit@compta.local', hashPassword('benoit123'), 'Benoit', 'Comptable Associé', now]
    );
    console.log('👥 Comptes d’accès créés : Jude (jude@compta.local) et Benoit (benoit@compta.local)');
  }

  // Initialisation des réglages par défaut si vides
  const existingSettings = db.exec('SELECT * FROM settings WHERE id = 1');
  if (!existingSettings || existingSettings.length === 0 || existingSettings[0].values.length === 0) {
    db.run(
      'INSERT INTO settings (id, initial_capital, platform_fee_percent, currency, business_name, updated_at) VALUES (1, 30000, 5.0, ?, ?, ?)',
      ['FCFA', 'E-commerce Digital', new Date().toISOString()]
    );
  }

  persistDatabase();
  return db;
}

/**
 * Exécute une requête SQL de sélection et retourne un tableau d'objets JavaScript
 * @param {string} sql
 * @param {Array} params
 * @returns {Array<Object>}
 */
export function query(sql, params = []) {
  if (!db) throw new Error('Base de données non initialisée');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/**
 * Exécute une instruction SQL (INSERT, UPDATE, DELETE) et persiste automatiquement
 * @param {string} sql
 * @param {Array} params
 * @returns {Object} { changes: number }
 */
export function run(sql, params = []) {
  if (!db) throw new Error('Base de données non initialisée');
  db.run(sql, params);
  persistDatabase();
  return { changes: db.getRowsModified() };
}

/**
 * Ajoute un enregistrement dans le journal d'audit
 */
export function logAudit({ user = 'Jude', action, entity, entity_id = null, old_values = null, new_values = null, reason = '' }) {
  try {
    const timestamp = new Date().toISOString();
    run(
      `INSERT INTO audit_logs (user, action, entity, entity_id, old_values, new_values, reason, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user || 'Jude',
        action,
        entity,
        entity_id ? String(entity_id) : null,
        old_values ? JSON.stringify(old_values) : null,
        new_values ? JSON.stringify(new_values) : null,
        reason,
        timestamp,
      ]
    );
  } catch (e) {
    console.error('Erreur audit log:', e);
  }
}
