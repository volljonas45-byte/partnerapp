/**
 * SQLite Backup Script
 * Kopiert die Datenbank in ein /data/backups Verzeichnis mit Zeitstempel.
 * Behält die letzten 7 Backups, ältere werden gelöscht.
 *
 * Aufruf: node scripts/backup.js
 * Cron (täglich 3 Uhr): 0 3 * * * node /app/scripts/backup.js
 */

const fs   = require('fs');
const path = require('path');

const DB_PATH      = path.join(__dirname, '../data/invoices.db');
const BACKUP_DIR   = path.join(__dirname, '../data/backups');
const MAX_BACKUPS  = 7;

if (!fs.existsSync(DB_PATH)) {
  console.error('Datenbank nicht gefunden:', DB_PATH);
  process.exit(1);
}

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Zeitstempel im Dateinamen
const timestamp  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupFile = path.join(BACKUP_DIR, `invoices_${timestamp}.db`);

fs.copyFileSync(DB_PATH, backupFile);
console.log('Backup erstellt:', backupFile);

// Alte Backups aufräumen — nur MAX_BACKUPS behalten
const files = fs.readdirSync(BACKUP_DIR)
  .filter(f => f.endsWith('.db'))
  .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime }))
  .sort((a, b) => b.time - a.time);

files.slice(MAX_BACKUPS).forEach(f => {
  fs.unlinkSync(path.join(BACKUP_DIR, f.name));
  console.log('Altes Backup gelöscht:', f.name);
});

console.log(`Backups vorhanden: ${Math.min(files.length, MAX_BACKUPS)}`);
