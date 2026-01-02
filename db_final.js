// db_final.js - Version finale intégrée pour le bot Count On Me
'use strict';

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

/**
 * 🚀 DB INTÉGRÉE - LÉGER ET PERSISTANT 
 * Compatible avec toutes les fonctionnalités existantes
 * Backup intelligent avec limite stricte de 10 MB
 * Idéal pour Railway et développement local
 */
function Database() {
  console.log('[DB Final] Constructeur appelé - VERSION LÉGER');

  // DÉTECTION POSTGRESQL (RASPBERRY)
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgresql')) {
    console.log('🐘 [DB Final] CHANGEMENT DE MODE: PostgreSQL détecté');
    const PostgresDatabase = require('./db_postgres');
    return new PostgresDatabase();
  }

  console.log('🚀 VERSION DB: LÉGER v1.0 - LIMITE 10MB STRICTE');
  console.log(`🕐 [DB Final] Timestamp: ${new Date().toISOString()}`);

  // Configuration du chemin de la base de données - Détection Railway
  const isProduction = process.env.NODE_ENV === 'production' ||
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY === 'true' ||
    process.env.RAILWAY_PROJECT_ID ||
    process.env.RAILWAY_SERVICE_ID ||
    process.cwd().includes('/app');

  // Chemins pour Railway - ORDRE IMPORTANT : chercher d'abord le fichier déployé
  const possibleDbDirs = isProduction ? [
    '/app',                // D'ABORD notre fichier déployé
    '/app/data',          // PUIS le volume persistant
    '/data',
    '/app/storage',
    '/tmp/persistent'
  ] : [__dirname];

  let dbDir = __dirname;
  let dbPath = path.join(dbDir, 'countonme.db');

  if (isProduction) {
    for (const testDir of possibleDbDirs) {
      try {
        if (!fs.existsSync(testDir)) {
          fs.mkdirSync(testDir, { recursive: true });
        }

        const testFile = path.join(testDir, '.write-test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);

        dbDir = testDir;
        dbPath = path.join(dbDir, 'countonme.db');

        // 🚨 RÉCUPÉRATION URGENTE : Si on trouve notre fichier déployé, l'utiliser
        if (testDir === '/app' && fs.existsSync(dbPath)) {
          const stats = fs.statSync(dbPath);
          console.log(`🔍 [DB Final] Fichier déployé trouvé: ${dbPath} (${stats.size} bytes)`);

          // Si le volume existe mais est vide, copier notre fichier
          const volumePath = '/app/data/countonme.db';
          if (fs.existsSync('/app/data')) {
            if (!fs.existsSync(volumePath) || fs.statSync(volumePath).size === 0) {
              console.log(`📋 [DB Final] Copie des données vers volume persistant...`);
              fs.copyFileSync(dbPath, volumePath);
              dbPath = volumePath; // Utiliser le volume pour la persistance
              dbDir = '/app/data';
              console.log(`✅ [DB Final] Données migrées vers volume persistant`);
            }
          }
        }

        console.log(`✅ [DB Final] Répertoire accessible: ${dbDir}`);
        break;
      } catch (error) {
        console.log(`⚠️ [DB Final] Répertoire ${testDir} inaccessible`);
        continue;
      }
    }
  }

  console.log(`💾 [DB Final] Base de données: ${dbPath}`);
  console.log(`🔧 [DB Final] Mode: ${isProduction ? 'PRODUCTION (Railway)' : 'DÉVELOPPEMENT'}`);

  // Configuration backup léger
  this.backup = {
    dir: path.join(dbDir, 'backup-light'),
    maxSize: 10 * 1024 * 1024, // 10 MB STRICT
    keepRecent: 2,              // 2 backups récents
    keepCompressed: 3,          // 3 backups compressés
    intervalHours: 1,           // Backup toutes les heures
    enabled: true
  };

  this.isRailway = isProduction;

  try {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ [DB Final] Erreur connexion SQLite:', err);
        throw err;
      }
      console.log('✅ [DB Final] Connexion SQLite établie');
    });

    // Configuration optimisée
    this.db.run('PRAGMA foreign_keys = ON');
    this.db.run('PRAGMA journal_mode = WAL');
    this.db.run('PRAGMA synchronous = FULL');
    this.db.run('PRAGMA cache_size = 1000');

    if (isProduction) {
      this.db.run('PRAGMA temp_store = MEMORY');
      this.db.run('PRAGMA mmap_size = 268435456');
      this.db.run('PRAGMA wal_autocheckpoint = 100');
      console.log('🔧 [DB Final] Configuration production activée');
    }

    this.initBackupSystem();

    this.createTables().then(() => {
      this.verifyDatabaseIntegrity();
      console.log('✅ [DB Final] Base initialisée - BACKUP LÉGER ACTIF');
    });

  } catch (error) {
    console.error('❌ [DB Final] Erreur initialisation:', error);
    throw error;
  }
}

// Initialiser le système de backup léger
Database.prototype.initBackupSystem = function () {
  if (!fs.existsSync(this.backup.dir)) {
    fs.mkdirSync(this.backup.dir, { recursive: true });
  }

  console.log(`📁 [DB Final] Backup dir: ${this.backup.dir}`);

  // Nettoyage initial des anciens backups
  this.cleanupOldBackups();

  // Backup automatique en production seulement
  if (this.isRailway) {
    const interval = this.backup.intervalHours * 60 * 60 * 1000;
    this.backupInterval = setInterval(() => {
      this.smartBackup().catch(err => {
        console.error('⚠️ [DB Final] Erreur backup auto:', err.message);
      });
    }, interval);

    console.log(`⏰ [DB Final] Backup automatique: ${this.backup.intervalHours}h`);
  }
};

// Backup intelligent
Database.prototype.smartBackup = function () {
  return new Promise(async (resolve, reject) => {
    try {
      // Vérifier si nécessaire
      const needed = await this.isBackupNeeded();
      if (!needed) {
        console.log('ℹ️ [DB Final] Backup non nécessaire');
        return resolve(null);
      }

      // Vérifier l'espace
      const spaceOk = await this.checkBackupSpace();
      if (!spaceOk) {
        console.log('🧹 [DB Final] Nettoyage forcé...');
        await this.forceCleanup();
      }

      // Créer le backup
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = `backup-${timestamp}.db`;
      const backupPath = path.join(this.backup.dir, backupFile);

      // Forcer sync avant backup
      await this.forceSync();

      // Copier la DB
      fs.copyFileSync(this.db.filename || path.join(__dirname, 'countonme.db'), backupPath);

      const size = fs.statSync(backupPath).size;
      console.log(`✅ [DB Final] Backup créé: ${backupFile} (${this.formatBytes(size)})`);

      // Organiser les backups
      await this.organizeBackups();

      resolve(backupFile);

    } catch (error) {
      console.error('❌ [DB Final] Erreur backup:', error.message);
      reject(error);
    }
  });
};

// Vérifier si backup nécessaire
Database.prototype.isBackupNeeded = function () {
  return new Promise((resolve) => {
    try {
      if (!fs.existsSync(this.backup.dir)) return resolve(true);

      const files = fs.readdirSync(this.backup.dir);
      const backups = files.filter(f => f.startsWith('backup-') && f.endsWith('.db'));

      if (backups.length === 0) return resolve(true);

      // Vérifier l'âge du dernier backup
      const latest = backups
        .map(f => ({
          file: f,
          time: fs.statSync(path.join(this.backup.dir, f)).mtime
        }))
        .sort((a, b) => b.time - a.time)[0];

      const hoursSince = (Date.now() - latest.time.getTime()) / (1000 * 60 * 60);
      resolve(hoursSince >= this.backup.intervalHours);

    } catch (error) {
      resolve(true);
    }
  });
};

// Vérifier l'espace backup
Database.prototype.checkBackupSpace = function () {
  return new Promise((resolve) => {
    try {
      const files = fs.readdirSync(this.backup.dir);
      let totalSize = 0;

      files.forEach(file => {
        const filePath = path.join(this.backup.dir, file);
        if (fs.statSync(filePath).isFile()) {
          totalSize += fs.statSync(filePath).size;
        }
      });

      console.log(`📊 [DB Final] Espace backup: ${this.formatBytes(totalSize)}/${this.formatBytes(this.backup.maxSize)}`);
      resolve(totalSize < this.backup.maxSize);

    } catch (error) {
      resolve(false);
    }
  });
};

// Organiser les backups
Database.prototype.organizeBackups = function () {
  return new Promise(async (resolve) => {
    try {
      const files = fs.readdirSync(this.backup.dir);
      const backups = files.filter(f => f.startsWith('backup-') && (f.endsWith('.db') || f.endsWith('.db.gz')))
        .map(file => {
          const filePath = path.join(this.backup.dir, file);
          const stats = fs.statSync(filePath);
          return {
            file: file,
            path: filePath,
            date: stats.mtime,
            size: stats.size,
            compressed: file.endsWith('.gz')
          };
        })
        .sort((a, b) => b.date - a.date);

      // Garder les récents non compressés
      const uncompressed = backups.filter(b => !b.compressed);
      const toCompress = uncompressed.slice(this.backup.keepRecent);

      // Compresser les anciens
      for (const backup of toCompress) {
        await this.compressBackup(backup);
      }

      // Nettoyer les très anciens
      const allBackups = fs.readdirSync(this.backup.dir)
        .filter(f => f.startsWith('backup-'))
        .map(file => ({
          file: file,
          path: path.join(this.backup.dir, file),
          date: fs.statSync(path.join(this.backup.dir, file)).mtime
        }))
        .sort((a, b) => b.date - a.date);

      const toDelete = allBackups.slice(this.backup.keepRecent + this.backup.keepCompressed);
      toDelete.forEach(backup => {
        try {
          fs.unlinkSync(backup.path);
          console.log(`🗑️ [DB Final] Supprimé: ${backup.file}`);
        } catch (err) {
          console.error(`❌ [DB Final] Erreur suppression:`, err.message);
        }
      });

      resolve();
    } catch (error) {
      console.error('❌ [DB Final] Erreur organisation:', error.message);
      resolve();
    }
  });
};

// Compresser un backup
Database.prototype.compressBackup = function (backup) {
  return new Promise((resolve) => {
    try {
      const compressedPath = backup.path + '.gz';

      if (fs.existsSync(compressedPath)) {
        return resolve();
      }

      const input = fs.createReadStream(backup.path);
      const output = fs.createWriteStream(compressedPath);
      const gzip = zlib.createGzip({ level: 9 });

      input.pipe(gzip).pipe(output)
        .on('finish', () => {
          try {
            fs.unlinkSync(backup.path);

            const originalSize = backup.size;
            const compressedSize = fs.statSync(compressedPath).size;
            const ratio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);

            console.log(`🗜️ [DB Final] Compressé ${backup.file}: -${ratio}%`);
            resolve();
          } catch (err) {
            console.error(`❌ [DB Final] Erreur post-compression:`, err.message);
            resolve();
          }
        })
        .on('error', (err) => {
          console.error(`❌ [DB Final] Erreur compression:`, err.message);
          resolve();
        });

    } catch (error) {
      console.error(`❌ [DB Final] Exception compression:`, error.message);
      resolve();
    }
  });
};

// Nettoyage forcé
Database.prototype.forceCleanup = function () {
  return new Promise((resolve) => {
    try {
      const files = fs.readdirSync(this.backup.dir);
      const backups = files.filter(f => f.startsWith('backup-'))
        .map(file => ({
          file: file,
          path: path.join(this.backup.dir, file),
          date: fs.statSync(path.join(this.backup.dir, file)).mtime
        }))
        .sort((a, b) => b.date - a.date);

      // Garder seulement le plus récent
      const toDelete = backups.slice(1);

      toDelete.forEach(backup => {
        try {
          fs.unlinkSync(backup.path);
          console.log(`🧹 [DB Final] Nettoyage forcé: ${backup.file}`);
        } catch (err) {
          console.error(`❌ [DB Final] Erreur nettoyage:`, err.message);
        }
      });

      console.log(`✅ [DB Final] Nettoyage forcé: ${toDelete.length} fichiers supprimés`);
      resolve();

    } catch (error) {
      console.error('❌ [DB Final] Erreur nettoyage forcé:', error.message);
      resolve();
    }
  });
};

// Nettoyage des anciens backups
Database.prototype.cleanupOldBackups = function () {
  if (!fs.existsSync(this.backup.dir)) return;

  try {
    const files = fs.readdirSync(this.backup.dir);
    const now = Date.now();

    files.forEach(file => {
      if (file.startsWith('backup-')) {
        const filePath = path.join(this.backup.dir, file);
        const stats = fs.statSync(filePath);
        const ageDays = (now - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

        // Supprimer les backups de plus de 7 jours
        if (ageDays > 7) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ [DB Final] Supprimé ancien: ${file}`);
        }
      }
    });
  } catch (error) {
    console.error('❌ [DB Final] Erreur nettoyage initial:', error.message);
  }
};

// Synchronisation forcée
Database.prototype.forceSync = function () {
  return new Promise((resolve) => {
    this.db.run('PRAGMA wal_checkpoint(FULL)', (err) => {
      if (err) console.error('❌ [DB Final] Erreur sync:', err.message);
      resolve();
    });
  });
};

// ================ TOUTES LES MÉTHODES EXISTANTES ================

// Création des tables (identique à l'original)
Database.prototype.createTables = function () {
  return new Promise((resolve) => {
    this.db.run('PRAGMA foreign_keys = ON');

    let tablesCreated = 0;
    const totalTables = 5;

    const checkComplete = () => {
      tablesCreated++;
      if (tablesCreated === totalTables) {
        console.log('✅ [DB Final] Toutes les tables créées');
        resolve();
      }
    };

    // Table des serveurs
    this.db.run(`
      CREATE TABLE IF NOT EXISTS servers (
        guild_id TEXT PRIMARY KEY,
        current_number INTEGER DEFAULT 0,
        high_score INTEGER DEFAULT 0,
        last_user_id TEXT,
        counting_channel_id TEXT,
        fail_role_id TEXT,
        fail_role_duration INTEGER DEFAULT 24,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, checkComplete);

    // Table des statistiques des joueurs
    this.db.run(`
      CREATE TABLE IF NOT EXISTS player_stats (
        guild_id TEXT,
        user_id TEXT,
        correct_counts INTEGER DEFAULT 0,
        error_counts INTEGER DEFAULT 0,
        highest_number INTEGER DEFAULT 0,
        weekly_highest INTEGER DEFAULT 0,
        weekly_correct_counts INTEGER DEFAULT 0,
        weekly_error_counts INTEGER DEFAULT 0,
        total_trophies INTEGER DEFAULT 0,
        shame_role_hours INTEGER DEFAULT 0,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (guild_id, user_id),
        FOREIGN KEY (guild_id) REFERENCES servers (guild_id)
      )
    `, checkComplete);

    // Table de l'historique des comptages
    this.db.run(`
      CREATE TABLE IF NOT EXISTS count_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        user_id TEXT,
        number INTEGER,
        message_id TEXT,
        is_correct BOOLEAN DEFAULT 1,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (guild_id) REFERENCES servers (guild_id)
      )
    `, checkComplete);

    // Table des rôles temporaires
    this.db.run(`
      CREATE TABLE IF NOT EXISTS temporary_roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        user_id TEXT,
        role_id TEXT,
        expires_at DATETIME,
        role_type TEXT DEFAULT 'fail',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (guild_id) REFERENCES servers (guild_id)
      )
    `, checkComplete);

    // Table des trophées hebdomadaires
    this.db.run(`
      CREATE TABLE IF NOT EXISTS weekly_trophies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        user_id TEXT,
        week_start DATE,
        highest_score INTEGER,
        awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (guild_id) REFERENCES servers (guild_id)
      )
    `, checkComplete);
  });
};

// Vérification intégrité (simplifiée)
Database.prototype.verifyDatabaseIntegrity = function () {
  console.log('🔍 [DB Final] Vérification intégrité...');

  this.db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (!err && tables) {
      console.log('📋 [DB Final] Tables:', tables.map(t => t.name));

      // Compter les données
      this.db.get("SELECT COUNT(*) as count FROM servers", (err, serverRow) => {
        if (!err && serverRow) {
          this.db.get("SELECT COUNT(*) as count FROM player_stats", (err, playerRow) => {
            if (!err && playerRow) {
              console.log(`📊 [DB Final] ${serverRow.count} serveurs, ${playerRow.count} joueurs`);
            }
          });
        }
      });
    }
  });
};

// ========== TOUTES LES MÉTHODES SERVEURS (identiques) ==========
Database.prototype.getOrCreateServer = function (guildId) {
  return new Promise((resolve, reject) => {
    this.db.get('SELECT * FROM servers WHERE guild_id = ?', [guildId], (err, row) => {
      if (err) return reject(err);

      if (!row) {
        this.db.run('INSERT INTO servers (guild_id) VALUES (?)', [guildId], function (err) {
          if (err) return reject(err);
          resolve({
            guild_id: guildId,
            current_number: 0,
            high_score: 0,
            last_user_id: null,
            counting_channel_id: null,
            fail_role_id: null,
            fail_role_duration: 24
          });
        });
      } else {
        resolve(row);
      }
    });
  });
};

Database.prototype.updateCurrentNumber = function (guildId, number, userId) {
  return new Promise(async (resolve, reject) => {
    this.db.run(
      'UPDATE servers SET current_number = ?, last_user_id = ?, high_score = MAX(high_score, ?), updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?',
      [number, userId, number, guildId],
      async (err) => {
        if (err) return reject(err);

        // Backup intelligent après mise à jour importante
        if (number > 50 && number % 50 === 0) {
          try {
            await this.smartBackup();
          } catch (backupErr) {
            console.log('⚠️ [DB Final] Erreur backup auto:', backupErr.message);
          }
        }

        resolve(this.changes);
      }
    );
  });
};

Database.prototype.resetCounter = function (guildId) {
  return new Promise((resolve, reject) => {
    this.db.run(
      'UPDATE servers SET current_number = 0, last_user_id = NULL WHERE guild_id = ?',
      [guildId],
      function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      }
    );
  });
};

Database.prototype.setCountingChannel = function (guildId, channelId) {
  return new Promise((resolve, reject) => {
    this.db.run(
      'UPDATE servers SET counting_channel_id = ? WHERE guild_id = ?',
      [channelId, guildId],
      function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      }
    );
  });
};

Database.prototype.setFailRole = function (guildId, roleId, duration) {
  return new Promise((resolve, reject) => {
    this.db.run(
      'UPDATE servers SET fail_role_id = ?, fail_role_duration = ? WHERE guild_id = ?',
      [roleId, duration, guildId],
      function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      }
    );
  });
};

// ========== SYSTÈME RÔLE GAGNANT HEBDOMADAIRE ==========
Database.prototype.setWinnerRole = function (guildId, roleId) {
  return new Promise((resolve, reject) => {
    // Ajouter la colonne si elle n'existe pas
    this.db.run('ALTER TABLE servers ADD COLUMN winner_role_id TEXT', () => {
      // Ignorer l'erreur si la colonne existe déjà
      this.db.run(
        'UPDATE servers SET winner_role_id = ? WHERE guild_id = ?',
        [roleId, guildId],
        function (err) {
          if (err) return reject(err);
          resolve(this.changes);
        }
      );
    });
  });
};

Database.prototype.getWinnerRole = function (guildId) {
  return new Promise((resolve, reject) => {
    this.db.get(
      'SELECT winner_role_id FROM servers WHERE guild_id = ?',
      [guildId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row ? row.winner_role_id : null);
      }
    );
  });
};

// Gestion du gagnant actuel
Database.prototype.setCurrentWinner = function (guildId, userId, roleId) {
  return new Promise((resolve, reject) => {
    // Calculer l'expiration (1 semaine)
    const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString();

    const query = `
      INSERT OR REPLACE INTO temporary_roles 
      (guild_id, user_id, role_id, expires_at, role_type) 
      VALUES (?, ?, ?, ?, 'winner')
    `;

    this.db.run(query, [guildId, userId, roleId, expiresAt], function (err) {
      if (err) return reject(err);
      resolve(this.lastID);
    });
  });
};

Database.prototype.getCurrentWinner = function (guildId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM temporary_roles 
      WHERE guild_id = ? AND role_type = 'winner' AND expires_at > ?
      ORDER BY expires_at DESC LIMIT 1
    `;

    const now = new Date().toISOString();
    this.db.get(query, [guildId, now], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
};

Database.prototype.removeCurrentWinner = function (guildId) {
  return new Promise((resolve, reject) => {
    const query = `
      DELETE FROM temporary_roles 
      WHERE guild_id = ? AND role_type = 'winner'
    `;

    this.db.run(query, [guildId], function (err) {
      if (err) return reject(err);
      resolve(this.changes);
    });
  });
};

// ========== TOUTES LES MÉTHODES PLAYERS (identiques) ==========
Database.prototype.getOrCreatePlayerStats = function (guildId, userId) {
  return new Promise(async (resolve, reject) => {
    try {
      await this.getOrCreateServer(guildId);

      this.db.get(
        'SELECT * FROM player_stats WHERE guild_id = ? AND user_id = ?',
        [guildId, userId],
        (err, row) => {
          if (err) return reject(err);

          if (!row) {
            this.db.run(
              'INSERT INTO player_stats (guild_id, user_id) VALUES (?, ?)',
              [guildId, userId],
              function (err) {
                if (err) return reject(err);
                resolve({
                  guild_id: guildId,
                  user_id: userId,
                  correct_counts: 0,
                  error_counts: 0,
                  highest_number: 0,
                  weekly_highest: 0,
                  weekly_correct_counts: 0,
                  weekly_error_counts: 0,
                  total_trophies: 0,
                  shame_role_hours: 0
                });
              }
            );
          } else {
            resolve(row);
          }
        }
      );
    } catch (error) {
      reject(error);
    }
  });
};

Database.prototype.incrementPlayerCorrectCounts = function (guildId, userId) {
  return new Promise(async (resolve, reject) => {
    try {
      await this.getOrCreatePlayerStats(guildId, userId);

      this.db.run(
        'UPDATE player_stats SET correct_counts = correct_counts + 1, weekly_correct_counts = weekly_correct_counts + 1, last_activity = CURRENT_TIMESTAMP WHERE guild_id = ? AND user_id = ?',
        [guildId, userId],
        (err) => {
          if (err) return reject(err);
          resolve(this.changes);
        }
      );
    } catch (error) {
      reject(error);
    }
  });
};

Database.prototype.updatePlayerHighestNumber = function (guildId, userId, number) {
  return new Promise(async (resolve, reject) => {
    try {
      await this.getOrCreatePlayerStats(guildId, userId);

      this.db.run(
        'UPDATE player_stats SET highest_number = MAX(highest_number, ?), weekly_highest = MAX(weekly_highest, ?) WHERE guild_id = ? AND user_id = ?',
        [number, number, guildId, userId],
        (err) => {
          if (err) return reject(err);
          resolve(this.changes);
        }
      );
    } catch (error) {
      reject(error);
    }
  });
};

Database.prototype.incrementPlayerErrors = function (guildId, userId) {
  return new Promise(async (resolve, reject) => {
    try {
      await this.getOrCreatePlayerStats(guildId, userId);

      this.db.run(
        'UPDATE player_stats SET error_counts = error_counts + 1, weekly_error_counts = weekly_error_counts + 1, last_activity = CURRENT_TIMESTAMP WHERE guild_id = ? AND user_id = ?',
        [guildId, userId],
        (err) => {
          if (err) return reject(err);
          resolve(this.changes);
        }
      );
    } catch (error) {
      reject(error);
    }
  });
};

Database.prototype.updateUserStats = function (guildId, userId, number) {
  return new Promise(async (resolve, reject) => {
    try {
      await this.getOrCreatePlayerStats(guildId, userId);
      await this.incrementPlayerCorrectCounts(guildId, userId);
      await this.updatePlayerHighestNumber(guildId, userId, number);
      resolve(1);
    } catch (error) {
      reject(error);
    }
  });
};

// ========== MÉTHODES LEADERBOARDS ==========
Database.prototype.getServerLeaderboard = function (guildId, limit = 10) {
  return new Promise((resolve, reject) => {
    this.db.all(
      `SELECT user_id, correct_counts, error_counts, highest_number, total_trophies, shame_role_hours,
              weekly_correct_counts, weekly_error_counts, weekly_highest
       FROM player_stats 
       WHERE guild_id = ? AND (correct_counts > 0 OR error_counts > 0)
       ORDER BY highest_number DESC, correct_counts DESC, error_counts ASC 
       LIMIT ?`,
      [guildId, limit],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });
};

Database.prototype.getWeeklyLeaderboard = function (guildId, limit = 10) {
  return new Promise((resolve, reject) => {
    this.db.all(
      `SELECT user_id, weekly_correct_counts, weekly_error_counts, weekly_highest,
              (weekly_correct_counts - (weekly_error_counts * 5)) as weekly_score,
              (weekly_correct_counts * 1.0 / CASE WHEN (weekly_correct_counts + weekly_error_counts) = 0 THEN 1 ELSE (weekly_correct_counts + weekly_error_counts) END) as weekly_success_rate
       FROM player_stats 
       WHERE guild_id = ? AND (weekly_correct_counts > 0 OR weekly_error_counts > 0)
       ORDER BY weekly_score DESC, weekly_highest DESC, weekly_correct_counts DESC 
       LIMIT ?`,
      [guildId, limit],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });
};

Database.prototype.getGlobalLeaderboard = function (limit = 10) {
  return new Promise((resolve, reject) => {
    this.db.all(
      `SELECT guild_id, high_score, current_number, 
              (SELECT COUNT(*) FROM count_history WHERE guild_id = servers.guild_id AND is_correct = 1) as total_count
       FROM servers 
       WHERE high_score > 0
       ORDER BY high_score DESC
       LIMIT ?`,
      [limit],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });
};

Database.prototype.getPlayerDetailedStats = function (guildId, userId) {
  return new Promise((resolve, reject) => {
    this.db.get(
      'SELECT * FROM player_stats WHERE guild_id = ? AND user_id = ?',
      [guildId, userId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });
};

// ========== MÉTHODES HISTORIQUE ==========
Database.prototype.addCountHistory = function (guildId, userId, number, messageId, isCorrect = true) {
  return new Promise((resolve, reject) => {
    this.db.run(
      'INSERT INTO count_history (guild_id, user_id, number, message_id, is_correct) VALUES (?, ?, ?, ?, ?)',
      [guildId, userId, number, messageId, isCorrect],
      function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });
};

Database.prototype.getRecentHistory = function (guildId, limit = 50) {
  return new Promise((resolve, reject) => {
    this.db.all(
      'SELECT * FROM count_history WHERE guild_id = ? ORDER BY timestamp DESC LIMIT ?',
      [guildId, limit],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });
};

// ========== MÉTHODES RÔLES TEMPORAIRES ==========
Database.prototype.hasTemporaryRole = function (guildId, userId, roleId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT id FROM temporary_roles 
      WHERE guild_id = ? AND user_id = ? AND role_id = ? AND expires_at > datetime('now')
    `;

    this.db.get(query, [guildId, userId, roleId], (err, row) => {
      if (err) return reject(err);
      resolve(!!row);
    });
  });
};

Database.prototype.addTemporaryRole = function (guildId, userId, roleId, durationHours) {
  return new Promise((resolve, reject) => {
    const expiresAt = new Date(Date.now() + (durationHours * 60 * 60 * 1000)).toISOString();

    const query = `
      INSERT OR REPLACE INTO temporary_roles 
      (guild_id, user_id, role_id, expires_at) 
      VALUES (?, ?, ?, ?)
    `;

    this.db.run(query, [guildId, userId, roleId, expiresAt], function (err) {
      if (err) return reject(err);
      resolve(this.lastID);
    });
  });
};

Database.prototype.removeTemporaryRole = function (id = null, guildId = null, userId = null, roleId = null) {
  return new Promise((resolve, reject) => {
    let query, params;

    if (id) {
      query = 'DELETE FROM temporary_roles WHERE id = ?';
      params = [id];
    } else if (guildId && userId && roleId) {
      query = 'DELETE FROM temporary_roles WHERE guild_id = ? AND user_id = ? AND role_id = ?';
      params = [guildId, userId, roleId];
    } else {
      reject(new Error('Paramètres insuffisants pour removeTemporaryRole'));
      return;
    }

    this.db.run(query, params, function (err) {
      if (err) return reject(err);
      resolve(this.changes);
    });
  });
};

Database.prototype.getExpiredTemporaryRoles = function () {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString(); // Utiliser le même format que addTemporaryRole()
    const query = `
      SELECT * FROM temporary_roles 
      WHERE expires_at <= ?
    `;

    this.db.all(query, [now], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
};

Database.prototype.addShameRoleTime = function (guildId, userId, hours) {
  return new Promise((resolve, reject) => {
    this.getOrCreatePlayerStats(guildId, userId).then(() => {
      const query = `
        UPDATE player_stats 
        SET shame_role_hours = shame_role_hours + ? 
        WHERE guild_id = ? AND user_id = ?
      `;

      this.db.run(query, [hours, guildId, userId], function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      });
    }).catch(reject);
  });
};

// ========== MÉTHODES HEBDOMADAIRES ==========
Database.prototype.resetWeeklyStats = function (guildId) {
  return new Promise((resolve, reject) => {
    this.db.run(
      'UPDATE player_stats SET weekly_highest = 0, weekly_correct_counts = 0, weekly_error_counts = 0 WHERE guild_id = ?',
      [guildId],
      function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      }
    );
  });
};

Database.prototype.getWeeklyWinner = function (guildId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT user_id, weekly_highest, weekly_correct_counts, weekly_error_counts,
             (weekly_correct_counts - (weekly_error_counts * 5)) as weekly_score
      FROM player_stats 
      WHERE guild_id = ? AND weekly_correct_counts > 0
      ORDER BY weekly_score DESC, weekly_highest DESC, weekly_correct_counts DESC
      LIMIT 1
    `;

    this.db.get(query, [guildId], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
};

Database.prototype.awardTrophy = function (guildId, userId) {
  return new Promise(async (resolve, reject) => {
    try {
      await this.getOrCreatePlayerStats(guildId, userId);

      const query = `
        UPDATE player_stats 
        SET total_trophies = total_trophies + 1 
        WHERE guild_id = ? AND user_id = ?
      `;

      this.db.run(query, [guildId, userId], function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      });
    } catch (error) {
      reject(error);
    }
  });
};

Database.prototype.resetWeeklyScores = function (guildId) {
  return this.resetWeeklyStats(guildId);
};

// ========== MÉTHODES UTILITAIRES ==========
Database.prototype.getDbInfo = function () {
  return new Promise((resolve, reject) => {
    const info = {};

    this.db.get("SELECT COUNT(*) as servers FROM servers", (err, row) => {
      if (err) return reject(err);
      info.servers_count = row.servers;

      this.db.get("SELECT COUNT(*) as players FROM player_stats", (err, row) => {
        if (err) return reject(err);
        info.players_count = row.players;

        // Ajouter infos backup
        info.backup_system = 'LÉGER';
        info.backup_limit = this.formatBytes(this.backup.maxSize);

        resolve(info);
      });
    });
  });
};

Database.prototype.formatBytes = function (bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Backup manuel (pour tests)
Database.prototype.manualBackup = function () {
  return this.smartBackup();
};

// ========== FERMETURE ==========
Database.prototype.close = function () {
  return new Promise(async (resolve) => {
    console.log('🔄 [DB Final] Fermeture...');

    // Arrêter le backup automatique
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }

    try {
      // Backup final
      await this.smartBackup();
      console.log('✅ [DB Final] Backup final effectué');
    } catch (error) {
      console.log('⚠️ [DB Final] Erreur backup final:', error.message);
    }

    this.db.close((err) => {
      if (err) {
        console.error('❌ [DB Final] Erreur fermeture:', err);
      } else {
        console.log('✅ [DB Final] Base fermée - BACKUP LÉGER ACTIF');
      }
      resolve();
    });
  });
};

module.exports = Database;
