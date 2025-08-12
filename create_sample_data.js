// create_sample_data.js - Créer des données d'exemple pour le serveur
const Database = require('./db_final.js');

const targetGuildId = '1254968527027310602';

console.log('🎮 Création de données d\'exemple pour le serveur:', targetGuildId);

const db = new Database();

// Données d'exemple
const samplePlayers = [
  { user_id: '711621673144811650', correct: 15, incorrect: 3 }, // Vous
  { user_id: '123456789012345678', correct: 8, incorrect: 2 },   // Joueur fictif
  { user_id: '987654321098765432', correct: 12, incorrect: 1 },  // Joueur fictif
];

const sampleHistory = [
  { user_id: '711621673144811650', number: 25, is_correct: 1 },
  { user_id: '123456789012345678', number: 24, is_correct: 1 },
  { user_id: '987654321098765432', number: 23, is_correct: 1 },
  { user_id: '711621673144811650', number: 22, is_correct: 1 },
  { user_id: '123456789012345678', number: 21, is_correct: 1 },
];

setTimeout(() => {
  console.log('📊 Ajout des joueurs d\'exemple...');
  
  // Ajouter les joueurs
  samplePlayers.forEach(player => {
    const query = `INSERT OR REPLACE INTO player_stats 
      (user_id, guild_id, correct_counts, incorrect_counts, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`;
    
    db.db.run(query, [player.user_id, targetGuildId, player.correct, player.incorrect], function(err) {
      if (err) {
        console.error('❌ Erreur joueur:', err.message);
      } else {
        console.log('✅ Joueur ajouté:', player.user_id, '-', player.correct, 'correct');
      }
    });
  });
  
  // Ajouter l'historique
  setTimeout(() => {
    console.log('📈 Ajout de l\'historique...');
    
    sampleHistory.forEach((entry, index) => {
      const query = `INSERT INTO count_history 
        (user_id, guild_id, number, is_correct, timestamp)
        VALUES (?, ?, ?, ?, datetime('now', '-${index} minutes'))`;
      
      db.db.run(query, [entry.user_id, targetGuildId, entry.number, entry.is_correct], function(err) {
        if (err) {
          console.error('❌ Erreur historique:', err.message);
        } else {
          console.log('✅ Historique ajouté:', entry.number, 'par', entry.user_id);
        }
      });
    });
    
    // Mettre à jour le compteur du serveur
    setTimeout(() => {
      const updateServerQuery = `UPDATE servers 
        SET current_number = ?, updated_at = datetime('now')
        WHERE guild_id = ?`;
      
      db.db.run(updateServerQuery, [25, targetGuildId], function(err) {
        if (err) {
          console.error('❌ Erreur serveur:', err.message);
        } else {
          console.log('✅ Compteur serveur mis à jour: 25');
          
          console.log('');
          console.log('🎉 DONNÉES D\'EXEMPLE CRÉÉES!');
          console.log('📊 3 joueurs avec statistiques');
          console.log('📈 5 entrées d\'historique');
          console.log('🔢 Compteur actuel: 25');
          console.log('');
          console.log('🚀 Prêt pour le déploiement sur Railway!');
        }
        
        process.exit(0);
      });
    }, 1000);
  }, 1000);
}, 3000);
