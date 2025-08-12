# 🤖 CountOnMe - Bot Discord de Comptage

Un bot Discord interactif pour jouer au jeu de comptage avec votre communauté ! Comptez ensemble et battez des records !

## 🗄️ Persistance des données
- **Volume persistant**: La base de données SQLite est stockée dans `/app/data` sur Railway
- **Backups automatiques**: Créés à chaque redémarrage en production
- **Configuration Railway**: Le volume est monté via `railway.toml` pour garantir la persistance

## ✨ Fonctionnalités

### 🎮 Jeu de Comptage
- Comptage collaboratif dans un canal dédié
- Validation automatique des nombres
- Réactions et commentaires encourageants du bot
- Gestion des erreurs avec des messages amusants
- Jalons spéciaux avec célébrations

### 📊 Commandes Slash
- `/leaderboard-server` - Classement des joueurs du serveur
- `/leaderboard-total` - Classement global de tous les serveurs
- `/stats` - Statistiques détaillées du serveur
- `/set-counting-channel` - Définir le canal de comptage

### 💾 Base de Données
- Stockage SQLite local
- Historique des comptages
- Statistiques par utilisateur et serveur
- Sauvegarde automatique des records

### 🎉 Interactions Amusantes
- Messages d'encouragement aléatoires
- Moqueries gentilles quand ça échoue
- Réactions spéciales pour certains nombres (69, 420, 1337)
- Barres de progression pour les jalons

## 🚀 Installation et Configuration

### Prérequis
- Node.js 16.0.0 ou plus récent
- Un bot Discord configuré
- Un compte Railway pour l'hébergement

### 1. Configuration Discord

1. Rendez-vous sur le [Discord Developer Portal](https://discord.com/developers/applications)
2. Créez une nouvelle application
3. Créez un bot et copiez le token
4. Activez les intents suivants :
   - Message Content Intent
   - Server Members Intent (optionnel)

### 2. Configuration Locale

1. Clonez ce projet
2. Copiez `.env.example` vers `.env` :
   ```bash
   copy .env.example .env
   ```

3. Éditez le fichier `.env` avec vos informations :
   ```env
   DISCORD_TOKEN=votre_token_discord_ici
   CLIENT_ID=votre_client_id_ici
   PORT=3000
   ```

4. Installez les dépendances :
   ```bash
   npm install
   ```

5. Déployez les commandes slash :
   ```bash
   node deploy-commands.js
   ```

6. Lancez le bot :
   ```bash
   npm start
   ```

### 3. Déploiement sur Railway

1. Créez un compte sur [Railway](https://railway.app)
2. Connectez votre repository GitHub
3. Ajoutez les variables d'environnement :
   - `DISCORD_TOKEN`
   - `CLIENT_ID`
4. Railway déploiera automatiquement votre bot

## 🎯 Utilisation

### Configuration du Serveur

1. Invitez le bot sur votre serveur avec les permissions :
   - Send Messages
   - Use Slash Commands
   - Add Reactions
   - Read Message History

2. Utilisez `/set-counting-channel` pour définir le canal de comptage

### Jouer au Comptage

1. Dans le canal de comptage, tapez simplement le nombre suivant
2. Le bot validera automatiquement votre nombre
3. Continuez la séquence avec les autres membres !

**Règles :**
- Chaque joueur ne peut pas compter deux fois de suite
- Tapez le nombre suivant dans l'ordre (1, 2, 3, ...)
- Si vous vous trompez, tapez "1" pour recommencer

### Commandes Disponibles

```
/leaderboard-server  - Voir le classement du serveur
/leaderboard-total   - Voir le classement global
/stats               - Voir les statistiques
/set-counting-channel - Configurer le canal (admin seulement)
```

## 🛠️ Structure du Projet

```
countonme-discord-bot/
├── commands/           # Commandes slash
│   ├── leaderboard-server.js
│   ├── leaderboard-total.js
│   ├── stats.js
│   └── set-counting-channel.js
├── database.js         # Gestion base de données SQLite
├── index.js           # Fichier principal du bot
├── deploy-commands.js # Script de déploiement des commandes
├── package.json       # Dépendances et scripts
├── .env.example       # Template variables d'environnement
└── README.md          # Ce fichier
```

## 📈 Fonctionnalités Avancées

### Messages Contextuels
- Encouragements aléatoires toutes les 10 unités
- Messages de consolation en cas d'échec
- Célébrations pour les jalons importants

### Jalons Spéciaux
- 10, 25, 50, 100, 250, 500, 1000+ avec messages uniques
- Nombres spéciaux : 69 😏, 420 🌿, 1337 💻

### Statistiques Avancées
- Progression vers le record
- Total de comptages
- Historique complet
- Classements multiples

## 🔧 Développement

### Scripts Disponibles
```bash
npm start       # Lance le bot
npm run dev     # Lance avec nodemon (dev)
node deploy-commands.js  # Déploie les commandes
```

### Ajouter une Nouvelle Commande

1. Créez un fichier dans `/commands/`
2. Utilisez ce template :

```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ma-commande')
        .setDescription('Description de ma commande'),
    
    async execute(interaction) {
        // Logique de la commande
        await interaction.reply('Réponse de la commande');
    },
};
```

3. Redéployez les commandes avec `node deploy-commands.js`

## 🐛 Résolution de Problèmes

### Le bot ne répond pas
- Vérifiez que le token Discord est correct
- Assurez-vous que les intents sont activés
- Vérifiez les logs de la console

### Les commandes n'apparaissent pas
- Exécutez `node deploy-commands.js`
- Attendez quelques minutes pour la synchronisation
- Vérifiez que CLIENT_ID est correct

### Erreurs de base de données
- Supprimez `database.db` pour recommencer
- Vérifiez les permissions d'écriture

## � Documentation Légale

Pour l'utilisation du bot, veuillez consulter :
- **[Terms of Service](TERMS-OF-SERVICE.md)** - Conditions d'utilisation du bot
- **[Privacy Policy](PRIVACY-POLICY.md)** - Politique de confidentialité et protection des données

Ces documents détaillent :
- ✅ Vos droits et responsabilités en tant qu'utilisateur
- ✅ Comment nous collectons et utilisons les données
- ✅ Les mesures de sécurité mises en place
- ✅ Vos options de contrôle sur vos données

## �📄 Licence

MIT License - Vous êtes libre d'utiliser et modifier ce bot !

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- Signaler des bugs
- Proposer des fonctionnalités
- Soumettre des pull requests

## 📞 Support

Si vous avez des questions ou des problèmes :
1. Consultez ce README
2. Vérifiez les logs de la console
3. Créez une issue sur GitHub
4. Pour les questions de confidentialité, consultez la [Privacy Policy](PRIVACY-POLICY.md)

---

**Amusez-vous bien avec CountOnMe ! 🎉**
