// db_postgres.js - Implémentation PostgreSQL pour le bot Count On Me
'use strict';

const { Pool } = require('pg');

/**
 * 🐘 DB POSTGRESQL - PROD & RASPBERRY PI
 * Compatible avec l'interface de db_final.js
 */
class PostgresDatabase {
    constructor() {
        console.log('[DB Postgres] Constructeur appelé - VERSION POSTGRESQL');
        console.log(`🕐 [DB Postgres] Timestamp: ${new Date().toISOString()}`);

        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error('DATABASE_URL manquante pour le mode PostgreSQL');
        }

        console.log(`🔌 [DB Postgres] Connexion à: ${connectionString.replace(/:[^:]+@/, ':***@')}`); // Masquer le mdp

        this.pool = new Pool({
            connectionString: connectionString,
            ssl: (connectionString.includes('localhost') || connectionString.includes('db-dev')) ? false : { rejectUnauthorized: false }
        });

        this.pool.on('error', (err) => {
            console.error('❌ [DB Postgres] Erreur inattendue du client:', err);
        });

        // Test de connexion et initialisation
        this.init().catch(err => {
            console.error('❌ [DB Postgres] Échec initialisation:', err);
        });
    }

    async init() {
        try {
            const client = await this.pool.connect();
            console.log('✅ [DB Postgres] Connexion établie avec succès');
            client.release();

            await this.createTables();
            await this.verifyDatabaseIntegrity();
            console.log('✅ [DB Postgres] Base initialisée et prête');
        } catch (err) {
            console.error('❌ [DB Postgres] Erreur de connexion initiale:', err);
            throw err;
        }
    }

    async query(text, params) {
        return this.pool.query(text, params);
    }

    // Création des tables
    async createTables() {
        console.log('🛠️ [DB Postgres] Création des tables...');

        // Table des serveurs
        await this.query(`
            CREATE TABLE IF NOT EXISTS servers (
                guild_id TEXT PRIMARY KEY,
                current_number INTEGER DEFAULT 0,
                high_score INTEGER DEFAULT 0,
                last_user_id TEXT,
                counting_channel_id TEXT,
                fail_role_id TEXT,
                fail_role_duration INTEGER DEFAULT 24,
                winner_role_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Table des statistiques des joueurs
        await this.query(`
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
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (guild_id, user_id),
                FOREIGN KEY (guild_id) REFERENCES servers (guild_id)
            )
        `);

        // Table de l'historique des comptages
        await this.query(`
            CREATE TABLE IF NOT EXISTS count_history (
                id SERIAL PRIMARY KEY,
                guild_id TEXT,
                user_id TEXT,
                number INTEGER,
                message_id TEXT,
                is_correct BOOLEAN DEFAULT TRUE,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (guild_id) REFERENCES servers (guild_id)
            )
        `);

        // Table des rôles temporaires
        await this.query(`
            CREATE TABLE IF NOT EXISTS temporary_roles (
                id SERIAL PRIMARY KEY,
                guild_id TEXT,
                user_id TEXT,
                role_id TEXT,
                expires_at TIMESTAMP,
                role_type TEXT DEFAULT 'fail',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (guild_id) REFERENCES servers (guild_id)
            )
        `);

        // Table des trophées hebdomadaires
        await this.query(`
            CREATE TABLE IF NOT EXISTS weekly_trophies (
                id SERIAL PRIMARY KEY,
                guild_id TEXT,
                user_id TEXT,
                week_start DATE,
                highest_score INTEGER,
                awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (guild_id) REFERENCES servers (guild_id)
            )
        `);

        console.log('✅ [DB Postgres] Tables assurées');
    }

    async verifyDatabaseIntegrity() {
        try {
            const res = await this.query("SELECT count(*) as count FROM servers");
            console.log(`📊 [DB Postgres] ${res.rows[0].count} serveurs détectés`);
        } catch (err) {
            console.error('❌ [DB Postgres] Erreur vérification intégrité:', err);
        }
    }

    // ========== MÉTHODES SERVEURS ==========

    async getOrCreateServer(guildId) {
        const res = await this.query('SELECT * FROM servers WHERE guild_id = $1', [guildId]);
        if (res.rows.length > 0) {
            return res.rows[0];
        }

        await this.query('INSERT INTO servers (guild_id) VALUES ($1) ON CONFLICT (guild_id) DO NOTHING', [guildId]);

        // Retourner l'objet par défaut si on vient de le créer (ou le relire)
        return {
            guild_id: guildId,
            current_number: 0,
            high_score: 0,
            last_user_id: null,
            counting_channel_id: null,
            fail_role_id: null,
            fail_role_duration: 24
        };
    }

    async updateCurrentNumber(guildId, number, userId) {
        // GREATEST n'est pas standard SQL mais marche sur Postgres
        await this.query(
            `UPDATE servers 
             SET current_number = $1, 
                 last_user_id = $2, 
                 high_score = GREATEST(high_score, $3), 
                 updated_at = CURRENT_TIMESTAMP 
             WHERE guild_id = $4`,
            [number, userId, number, guildId]
        );
    }

    async resetCounter(guildId) {
        await this.query(
            'UPDATE servers SET current_number = 0, last_user_id = NULL WHERE guild_id = $1',
            [guildId]
        );
    }

    async setCountingChannel(guildId, channelId) {
        await this.query(
            'UPDATE servers SET counting_channel_id = $1 WHERE guild_id = $2',
            [channelId, guildId]
        );
    }

    async setFailRole(guildId, roleId, duration) {
        await this.query(
            'UPDATE servers SET fail_role_id = $1, fail_role_duration = $2 WHERE guild_id = $3',
            [roleId, duration, guildId]
        );
    }

    // ========== SYSTÈME RÔLE GAGNANT ==========

    async setWinnerRole(guildId, roleId) {
        // La colonne winner_role_id est déjà dans le CREATE TABLE, mais au cas où migration
        try {
            await this.query('UPDATE servers SET winner_role_id = $1 WHERE guild_id = $2', [roleId, guildId]);
        } catch (e) {
            console.error("Erreur setWinnerRole", e);
        }
    }

    async getWinnerRole(guildId) {
        const res = await this.query('SELECT winner_role_id FROM servers WHERE guild_id = $1', [guildId]);
        return res.rows[0] ? res.rows[0].winner_role_id : null;
    }

    async setCurrentWinner(guildId, userId, roleId) {
        const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));

        // Postgres n'a pas INSERT OR REPLACE standard, on utilise ON CONFLICT si on avait de clé unique
        // Temporary roles n'a pas de contrainte unique sur (guild_id, role_type='winner')
        // On supprime l'ancien d'abord
        await this.query("DELETE FROM temporary_roles WHERE guild_id = $1 AND role_type = 'winner'", [guildId]);

        const res = await this.query(
            `INSERT INTO temporary_roles (guild_id, user_id, role_id, expires_at, role_type) 
             VALUES ($1, $2, $3, $4, 'winner') RETURNING id`,
            [guildId, userId, roleId, expiresAt]
        );
        return res.rows[0].id;
    }

    async getCurrentWinner(guildId) {
        const res = await this.query(
            `SELECT * FROM temporary_roles 
             WHERE guild_id = $1 AND role_type = 'winner' AND expires_at > CURRENT_TIMESTAMP 
             ORDER BY expires_at DESC LIMIT 1`,
            [guildId]
        );
        return res.rows[0] || null;
    }

    async removeCurrentWinner(guildId) {
        await this.query("DELETE FROM temporary_roles WHERE guild_id = $1 AND role_type = 'winner'", [guildId]);
    }

    // ========== MÉTHODES PLAYERS ==========

    async getOrCreatePlayerStats(guildId, userId) {
        await this.getOrCreateServer(guildId); // Ensure server exists FK

        const res = await this.query('SELECT * FROM player_stats WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
        if (res.rows.length > 0) return res.rows[0];

        await this.query(
            'INSERT INTO player_stats (guild_id, user_id) VALUES ($1, $2) ON CONFLICT (guild_id, user_id) DO NOTHING',
            [guildId, userId]
        );

        return {
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
        };
    }

    async incrementPlayerCorrectCounts(guildId, userId) {
        await this.getOrCreatePlayerStats(guildId, userId);
        await this.query(
            `UPDATE player_stats 
             SET correct_counts = correct_counts + 1, 
                 weekly_correct_counts = weekly_correct_counts + 1, 
                 last_activity = CURRENT_TIMESTAMP 
             WHERE guild_id = $1 AND user_id = $2`,
            [guildId, userId]
        );
    }

    async updatePlayerHighestNumber(guildId, userId, number) {
        await this.getOrCreatePlayerStats(guildId, userId);
        await this.query(
            `UPDATE player_stats 
             SET highest_number = GREATEST(highest_number, $1), 
                 weekly_highest = GREATEST(weekly_highest, $2) 
             WHERE guild_id = $3 AND user_id = $4`,
            [number, number, guildId, userId]
        );
    }

    async incrementPlayerErrors(guildId, userId) {
        await this.getOrCreatePlayerStats(guildId, userId);
        await this.query(
            `UPDATE player_stats 
             SET error_counts = error_counts + 1, 
                 weekly_error_counts = weekly_error_counts + 1, 
                 last_activity = CURRENT_TIMESTAMP 
             WHERE guild_id = $1 AND user_id = $2`,
            [guildId, userId]
        );
    }

    async updateUserStats(guildId, userId, number) {
        // Legacy wrapper
        await this.incrementPlayerCorrectCounts(guildId, userId);
        await this.updatePlayerHighestNumber(guildId, userId, number);
        return true;
    }

    // ========== MÉTHODES LEADERBOARDS ==========

    async getServerLeaderboard(guildId, limit = 10) {
        const res = await this.query(
            `SELECT * FROM player_stats 
             WHERE guild_id = $1 AND correct_counts > 0 
             ORDER BY correct_counts DESC LIMIT $2`,
            [guildId, limit]
        );
        return res.rows;
    }

    async getWeeklyLeaderboard(guildId, limit = 10) {
        const res = await this.query(
            `SELECT * FROM player_stats 
             WHERE guild_id = $1 AND weekly_correct_counts > 0 
             ORDER BY weekly_correct_counts DESC LIMIT $2`,
            [guildId, limit]
        );
        return res.rows;
    }

    async getGlobalLeaderboard(limit = 10) {
        const res = await this.query(
            `SELECT user_id, SUM(correct_counts) as total_correct 
             FROM player_stats 
             GROUP BY user_id 
             ORDER BY total_correct DESC LIMIT $1`,
            [limit]
        );
        return res.rows;
    }

    async getPlayerDetailedStats(guildId, userId) {
        const res = await this.query('SELECT * FROM player_stats WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
        return res.rows[0];
    }

    // ========== MÉTHODES HISTORIQUE ==========

    async addCountHistory(guildId, userId, number, messageId, isCorrect = true) {
        await this.query(
            `INSERT INTO count_history (guild_id, user_id, number, message_id, is_correct) 
             VALUES ($1, $2, $3, $4, $5)`,
            [guildId, userId, number, messageId, isCorrect]
        );
    }

    async getRecentHistory(guildId, limit = 50) {
        const res = await this.query(
            `SELECT * FROM count_history 
             WHERE guild_id = $1 
             ORDER BY timestamp DESC LIMIT $2`,
            [guildId, limit]
        );
        return res.rows;
    }

    // ========== MÉTHODES RÔLES TEMPORAIRES ==========

    async hasTemporaryRole(guildId, userId, roleId) {
        const res = await this.query(
            `SELECT id FROM temporary_roles 
             WHERE guild_id = $1 AND user_id = $2 AND role_id = $3 AND expires_at > CURRENT_TIMESTAMP`,
            [guildId, userId, roleId]
        );
        return res.rows.length > 0;
    }

    async addTemporaryRole(guildId, userId, roleId, durationHours) {
        // Prolonge si existe
        const expiresAt = new Date(Date.now() + (durationHours * 60 * 60 * 1000));

        // Check existing
        const existing = await this.query(
            `SELECT id FROM temporary_roles WHERE guild_id = $1 AND user_id = $2 AND role_id = $3`,
            [guildId, userId, roleId]
        );

        if (existing.rows.length > 0) {
            await this.query(
                `UPDATE temporary_roles SET expires_at = $1 WHERE id = $2`,
                [expiresAt, existing.rows[0].id]
            );
        } else {
            await this.query(
                `INSERT INTO temporary_roles (guild_id, user_id, role_id, expires_at) 
                 VALUES ($1, $2, $3, $4)`,
                [guildId, userId, roleId, expiresAt]
            );
        }
    }

    async removeTemporaryRole(id = null, guildId = null, userId = null, roleId = null) {
        if (id) {
            await this.query('DELETE FROM temporary_roles WHERE id = $1', [id]);
        } else if (guildId && userId && roleId) {
            await this.query(
                'DELETE FROM temporary_roles WHERE guild_id = $1 AND user_id = $2 AND role_id = $3',
                [guildId, userId, roleId]
            );
        }
    }

    async getExpiredTemporaryRoles() {
        const res = await this.query('SELECT * FROM temporary_roles WHERE expires_at < CURRENT_TIMESTAMP');
        return res.rows;
    }

    // Nettoyage obsolète (si incohérence discord)
    async cleanObsoleteTemporaryRoles(guildId, userId, roleId) {
        await this.removeTemporaryRole(null, guildId, userId, roleId);
    }

    async addShameRoleTime(guildId, userId, hours) {
        await this.getOrCreatePlayerStats(guildId, userId);
        await this.query(
            `UPDATE player_stats SET shame_role_hours = shame_role_hours + $1 
             WHERE guild_id = $2 AND user_id = $3`,
            [hours, guildId, userId]
        );
    }

    // ========== MÉTHODES HEBDOMADAIRES ==========

    async resetWeeklyStats(guildId) {
        if (guildId) {
            await this.query(
                `UPDATE player_stats SET weekly_correct_counts = 0, weekly_error_counts = 0, weekly_highest = 0 
                 WHERE guild_id = $1`,
                [guildId]
            );
        } else {
            await this.query(
                `UPDATE player_stats SET weekly_correct_counts = 0, weekly_error_counts = 0, weekly_highest = 0`
            );
        }
    }

    async getWeeklyWinner(guildId) {
        // Score = Counts - Errors * 5
        const res = await this.query(
            `SELECT *, (weekly_correct_counts - (weekly_error_counts * 5)) as score 
             FROM player_stats 
             WHERE guild_id = $1 AND weekly_correct_counts > 0 
             ORDER BY score DESC LIMIT 1`,
            [guildId]
        );
        return res.rows[0];
    }

    async awardTrophy(guildId, userId) {
        await this.getOrCreatePlayerStats(guildId, userId);

        // Ajouter un trophée au compteur global
        await this.query(
            `UPDATE player_stats SET total_trophies = total_trophies + 1 WHERE guild_id = $1 AND user_id = $2`,
            [guildId, userId]
        );

        // Enregistrer l'historique
        const stats = await this.getPlayerDetailedStats(guildId, userId);
        const score = (stats.weekly_correct_counts || 0) - ((stats.weekly_error_counts || 0) * 5);

        await this.query(
            `INSERT INTO weekly_trophies (guild_id, user_id, week_start, highest_score) 
             VALUES ($1, $2, CURRENT_DATE, $3)`,
            [guildId, userId, score]
        );
    }
}

module.exports = PostgresDatabase;
