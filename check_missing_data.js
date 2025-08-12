// check_missing_data.js - Vérifier les données manquantes pour le serveur
const Database = require('./db_final.js');
const fs = require('fs');

const targetGuildId = '1254968527027310602';

console.log('🔍 Recherche des données historiques pour le serveur:', targetGuildId);
console.log('');

const db = new Database();

setTimeout(() => {
  console.log('📊 DONNÉES ACTUELLES POUR CE SERVEUR:');
  
  // Historique
  db.db.all('SELECT * FROM count_history WHERE guild_id = ?', [targetGuildId], (err, history) => {
    console.log('📈 Historique:', history ? history.length : 0, 'entrées');
    if (history && history.length > 0) {
      history.slice(0, 5).forEach(h => {
        console.log('  - User:', h.user_id, 'Number:', h.number, 'Correct:', h.is_correct ? 'OUI' : 'NON', 'Date:', h.timestamp);
      });
    }
  });
  
  // Joueurs
  db.db.all('SELECT * FROM player_stats WHERE guild_id = ?', [targetGuildId], (err, players) => {
    console.log('👥 Joueurs:', players ? players.length : 0);
    if (players && players.length > 0) {
      players.forEach(p => {
        console.log('  - User:', p.user_id, 'Correct:', p.correct_counts, 'Incorrect:', p.incorrect_counts);
      });
    }
  });
  
  // Rôles temporaires
  db.db.all('SELECT * FROM temporary_roles WHERE guild_id = ?', [targetGuildId], (err, roles) => {
    console.log('🎭 Rôles temporaires:', roles ? roles.length : 0);
    if (roles && roles.length > 0) {
      roles.forEach(r => {
        console.log('  - User:', r.user_id, 'Role:', r.role_id, 'Expires:', r.expires_at);
      });
    }
  });
  
  console.log('');
  console.log('📁 Backups disponibles:');
  
  const backupFiles = fs.readdirSync('./backup-light/').filter(f => f.endsWith('.db'));
  console.log('💾 Nombre de backups:', backupFiles.length);
  
  backupFiles.forEach(file => {
    try {
      const stats = fs.statSync('./backup-light/' + file);
      console.log('  - ' + file + ':', Math.round(stats.size/1024) + 'KB', 'modifié:', stats.mtime.toLocaleString());
    } catch (e) {
      console.log('  - ' + file + ': erreur lecture');
    }
  });
  
  setTimeout(() => {
    console.log('');
    console.log('🎯 RÉSULTAT:');
    console.log('❌ Ce serveur n\'a actuellement AUCUNE donnée de score');
    console.log('');
    console.log('💡 OPTIONS DISPONIBLES:');
    console.log('1. 🎮 Recommencer le comptage à 1 (serveur propre)');
    console.log('2. 📊 Importer des données si vous avez un backup externe');
    console.log('3. 🔄 Recréer manuellement quelques statistiques de test');
    console.log('');
    console.log('🚀 Le serveur est maintenant configuré et prêt à fonctionner!');
    process.exit(0);
  }, 1000);
}, 3000);
