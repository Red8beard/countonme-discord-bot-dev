# 🧪 GUIDE DE TEST ET DÉVELOPPEMENT

## 🔧 Configuration initiale

1. **Créer un bot de développement** :
   - Allez sur https://discord.com/developers/applications
   - Créez "Count On Me - DEV"
   - Copiez le token et le Client ID

2. **Configurer les variables d'environnement** :
   ```bash
   # Dans votre fichier .env
   # Production (Railway)
   DISCORD_TOKEN=votre_token_production
   CLIENT_ID=votre_client_id_production

   # Development (tests locaux)
   DISCORD_TOKEN_DEV=votre_token_développement  
   CLIENT_ID_DEV=votre_client_id_développement
   ```

## 🚀 Commandes de développement

### Mode Développement (Bot de test)
```bash
# Installer cross-env si nécessaire
npm install cross-env --save-dev

# Déployer les commandes sur le bot de test
npm run dev:deploy

# Lancer le bot en mode développement
npm run dev
```

### Mode Production (Bot principal)
```bash
# Déployer les commandes sur le bot principal
npm run prod:deploy

# Lancer le bot en mode production
npm run prod
```

## 🎯 Workflow de test recommandé

1. **Développement local** :
   ```bash
   NODE_ENV=development npm run dev
   ```

2. **Test sur serveur Discord** :
   - Invitez le bot DEV sur votre serveur de test
   - Testez toutes les nouvelles fonctionnalités

3. **Déploiement production** :
   ```bash
   git add .
   git commit -m "feat: nouvelle fonctionnalité testée"
   git push  # Déploie automatiquement sur Railway
   ```

## 🏗️ Structure des tests

- **Bot DEV** : Tests et nouvelles fonctionnalités
- **Bot PROD** : Version stable sur Railway
- **Base de données** : Séparée automatiquement par bot

## ⚡ Raccourcis PowerShell

```powershell
# Créer des alias pratiques
Set-Alias dev 'npm run dev'
Set-Alias deploy-dev 'npm run dev:deploy'
Set-Alias deploy-prod 'npm run prod:deploy'
```

## 🔍 Vérification

Les logs vous montreront le mode actuel :
```
🚀 MODE: DEVELOPMENT
🤖 Token utilisé: ***abcd
```
