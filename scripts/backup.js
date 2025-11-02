#!/usr/bin/env node
/**
 * Database backup script
 * Creates timestamped backups of the SQLite database
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'responses.db');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const MAX_BACKUPS = parseInt(process.env.MAX_BACKUPS) || 7; // Keep last 7 backups

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`✓ Created backup directory: ${BACKUP_DIR}`);
  }
}

function createBackup() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`✗ Database file not found: ${DB_PATH}`);
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.db`);

  try {
    fs.copyFileSync(DB_PATH, backupFile);
    const stats = fs.statSync(backupFile);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`✓ Backup created: ${path.basename(backupFile)}`);
    console.log(`  Size: ${sizeMB} MB`);
    console.log(`  Location: ${backupFile}`);
    
    return backupFile;
  } catch (error) {
    console.error('✗ Error creating backup:', error.message);
    process.exit(1);
  }
}

function cleanOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup-') && f.endsWith('.db'))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > MAX_BACKUPS) {
      const toDelete = files.slice(MAX_BACKUPS);
      toDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`✓ Deleted old backup: ${file.name}`);
      });
    }

    console.log(`✓ Total backups: ${Math.min(files.length, MAX_BACKUPS)}`);
  } catch (error) {
    console.error('✗ Error cleaning old backups:', error.message);
  }
}

function listBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup-') && f.endsWith('.db'))
      .map(f => {
        const stats = fs.statSync(path.join(BACKUP_DIR, f));
        return {
          name: f,
          size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
          date: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (files.length === 0) {
      console.log('No backups found');
      return;
    }

    console.log('\nAvailable backups:');
    console.log('─'.repeat(80));
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name}`);
      console.log(`   Size: ${file.size} | Date: ${file.date}`);
    });
    console.log('─'.repeat(80));
  } catch (error) {
    console.error('✗ Error listing backups:', error.message);
  }
}

function restoreBackup(backupName) {
  const backupPath = path.join(BACKUP_DIR, backupName);
  
  if (!fs.existsSync(backupPath)) {
    console.error(`✗ Backup file not found: ${backupName}`);
    process.exit(1);
  }

  // Create a backup of current database before restoring
  const currentBackup = `current-before-restore-${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
  const currentBackupPath = path.join(BACKUP_DIR, currentBackup);
  
  try {
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, currentBackupPath);
      console.log(`✓ Current database backed up as: ${currentBackup}`);
    }

    fs.copyFileSync(backupPath, DB_PATH);
    console.log(`✓ Database restored from: ${backupName}`);
    console.log('✓ Restoration complete');
  } catch (error) {
    console.error('✗ Error restoring backup:', error.message);
    process.exit(1);
  }
}

// Main
const command = process.argv[2];

console.log('\n=== Database Backup Utility ===\n');

ensureBackupDir();

switch (command) {
  case 'create':
  case 'backup':
    createBackup();
    cleanOldBackups();
    break;

  case 'list':
    listBackups();
    break;

  case 'restore':
    const backupName = process.argv[3];
    if (!backupName) {
      console.error('✗ Please specify a backup file to restore');
      console.log('\nUsage: node backup.js restore <backup-filename>');
      process.exit(1);
    }
    restoreBackup(backupName);
    break;

  default:
    console.log('Usage:');
    console.log('  node backup.js create   - Create a new backup');
    console.log('  node backup.js list     - List all backups');
    console.log('  node backup.js restore <filename> - Restore from backup');
    console.log('');
    console.log('Example:');
    console.log('  node backup.js create');
    console.log('  node backup.js list');
    console.log('  node backup.js restore backup-2024-11-02T12-00-00-000Z.db');
    process.exit(0);
}

console.log('');
