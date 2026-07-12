import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'Your Health Will Partner.db');
const db = new sqlite3.Database(dbPath);

// Encryption details
const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY 
  ? crypto.scryptSync(process.env.DB_ENCRYPTION_KEY, 'health_guard_salt_123', 32)
  : Buffer.from('v3ry_s3cr3t_k3y_for_h34lthgu4rd_', 'utf-8'); // 32 bytes

export function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText) {
  if (!encryptedText) return encryptedText;
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText; // Fallback for raw text
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed, returning ciphertext:', err);
    return encryptedText;
  }
}

// Promise wrappers
export const dbRun = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const dbGet = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const dbAll = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Initialize schema
export const initDb = async () => {
  // Users table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      date_of_birth TEXT,
      gender TEXT,
      blood_group TEXT,
      height REAL,
      weight REAL,
      allergies TEXT,
      chronic_conditions TEXT,
      biometric_enabled INTEGER DEFAULT 0,
      consent_timestamp TEXT,
      google_fit_refresh_token TEXT,
      google_fit_access_token TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migrate existing tables
  try {
    await dbRun(`ALTER TABLE users ADD COLUMN google_fit_refresh_token TEXT`);
  } catch (err) { /* column exists */ }
  try {
    await dbRun(`ALTER TABLE users ADD COLUMN google_fit_access_token TEXT`);
  } catch (err) { /* column exists */ }

  // Medical history
  await dbRun(`
    CREATE TABLE IF NOT EXISTS medical_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      condition_name TEXT NOT NULL,
      diagnosis_date TEXT,
      status TEXT,
      surgeries TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Medications
  await dbRun(`
    CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      dosage TEXT,
      frequency TEXT,
      times_per_day INTEGER DEFAULT 1,
      prescribing_doctor TEXT,
      start_date TEXT,
      end_date TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Uploaded medical documents
  await dbRun(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      doc_type TEXT,
      ocr_text TEXT,
      uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Vitals time-series (indexed by user and timestamp)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS vitals_timeseries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      heart_rate REAL,
      spo2 REAL,
      blood_pressure_systolic REAL,
      blood_pressure_diastolic REAL,
      steps INTEGER,
      sleep_duration REAL,
      sleep_stage TEXT,
      temperature REAL,
      ecg_wave TEXT,
      source_device TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for vitals query efficiency
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_vitals_user_time ON vitals_timeseries (user_id, timestamp)`);

  // Emergency Contacts
  await dbRun(`
    CREATE TABLE IF NOT EXISTS emergency_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      relationship TEXT,
      phone_number TEXT NOT NULL,
      email TEXT,
      priority_order INTEGER DEFAULT 1,
      notify_sms INTEGER DEFAULT 1,
      notify_call INTEGER DEFAULT 0,
      notify_push INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Alerts Log
  await dbRun(`
    CREATE TABLE IF NOT EXISTS alerts_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      vitals_snapshot_id INTEGER,
      anomaly_type TEXT NOT NULL,
      reading_value REAL,
      threshold_rule TEXT,
      countdown_started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL, -- 'triggered', 'user_confirmed', 'user_dismissed', 'contact_notified', 'resolved'
      resolved_at TEXT,
      notes TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (vitals_snapshot_id) REFERENCES vitals_timeseries(id)
    )
  `);

  // Seed demo user if empty
  // Check for existing demo users (either old or new email)
  const demoUser = await dbGet(
    `SELECT * FROM users WHERE email IN (?, ?)`,
    ['demo@healthguard.com', 'demo@Your Health Will Partner.com']
  );
  if (!demoUser) {
    const hash = await bcrypt.hash('password123', 10);
    const result = await dbRun(
      `INSERT INTO users (
        email, password_hash, full_name, date_of_birth, gender, 
        blood_group, height, weight, allergies, chronic_conditions, consent_timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'demo@healthguard.com', hash, 'John Doe', '1988-06-15', 'male',
        encrypt('O+'), 180, 75, encrypt('Penicillin'), encrypt('Hypertension'), new Date().toISOString()
      ]
    );
    const userId = result.lastID;
    
    // Seed default emergency contact
    await dbRun(
      `INSERT INTO emergency_contacts (user_id, name, relationship, phone_number, email, priority_order) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, 'Sarah Doe', 'Spouse', '+15550199', 'sarah@example.com', 1]
    );

    // Seed default medication
    await dbRun(
      `INSERT INTO medications (user_id, name, dosage, frequency, times_per_day, prescribing_doctor) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, encrypt('Lisinopril'), encrypt('10mg'), 'Once Daily', 1, encrypt('Dr. Marcus')]
    );
    console.log('Database seeded with demo patient (demo@healthguard.com).');
  }
};
