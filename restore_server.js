// restore_server.js - Restaurer le serveur manquant
const Database = require('./db_final.js');

const targetGuildId = '1254968527027310602';
const targetChannelId = '1393113158666686484';

console.log('🔧 Restauration du serveur manquant...');
console.log('Guild ID:', targetGuildId);
console.log('Channel ID:', targetChannelId);

const db = new Database();

setTimeout(() => {
  // Créer le serveur avec le channel configuré
  const query = `INSERT OR REPLACE INTO servers 
    (guild_id, counting_channel_id, current_number, created_at, updated_at) 
    VALUES (?, ?, 0, datetime('now'), datetime('now'))`;
  
  db.db.run(query, [targetGuildId, targetChannelId], function(err) {
    if (err) {
      console.error('❌ Erreur création serveur:', err.message);
    } else {
      console.log('✅ Serveur créé avec succès!');
      console.log('📺 Channel de comptage configuré:', targetChannelId);
      
      // Vérifier la création
      db.db.get('SELECT * FROM servers WHERE guild_id = ?', [targetGuildId], (err, server) => {
        if (server) {
          console.log('✅ Vérification réussie:');
          console.log('  - Guild:', server.guild_id);
          console.log('  - Channel:', server.counting_channel_id);
          console.log('  - Count:', server.current_number);
          
          console.log('\n🎯 SERVEUR RESTAURÉ!');
          console.log('\n📝 Le bot peut maintenant fonctionner sur ce serveur:');
          console.log('1. ✅ Channel de comptage configuré');
          console.log('2. 📊 Prêt pour le comptage (commence à 1)');
          console.log('3. 🎮 Commandes disponibles: /info, /set-fail-role, etc.');
          
          console.log('\n🚀 Déployons maintenant sur Railway...');
        } else {
          console.log('❌ Erreur de vérification');
        }
        
        process.exit(0);
      });
    }
  });
}, 3000);
