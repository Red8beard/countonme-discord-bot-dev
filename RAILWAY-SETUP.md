# 🚀 RAILWAY DEPLOYMENT GUIDE

## Configuration des environnements Railway

### 1. Environnement PRODUCTION
- **But** : Bot principal utilisé par tous les serveurs
- **Base de données** : Railway Volume persistant
- **Auto-deploy** : Branche `main` 
- **Variables** :
  ```
  DISCORD_TOKEN=votre_token_principal
  CLIENT_ID=votre_client_id_principal
  NODE_ENV=production
  RAILWAY_ENVIRONMENT=production
  ```

### 2. Environnement DEVELOPMENT  
- **But** : Tests et nouvelles fonctionnalités
- **Base de données** : Séparée de la production
- **Auto-deploy** : Branche `dev` (optionnel)
- **Variables** :
  ```
  DISCORD_TOKEN=votre_token_test
  CLIENT_ID=votre_client_id_test
  NODE_ENV=development
  RAILWAY_ENVIRONMENT=development
  ```

## 🔄 Workflow de déploiement

### Tests locaux
```bash
# Mode développement local
npm run dev

# Tester les commandes localement  
npm run dev:deploy
```

### Tests sur Railway DEV
```bash
# Pousser vers la branche dev pour tester sur Railway
git checkout dev
git add .
git commit -m "feat: nouvelle fonctionnalité à tester"
git push origin dev

# Railway DEV se met à jour automatiquement
```

### Déploiement en production
```bash
# Une fois les tests validés
git checkout main
git merge dev
git push origin main

# Railway PROD se met à jour automatiquement
```

## ⚙️ Configuration Railway

### Service PRODUCTION
- **Environment** : production
- **Branch** : main
- **Auto-deploy** : ✅ Activé
- **Railway Volume** : ✅ Recommandé

### Service DEVELOPMENT
- **Environment** : development  
- **Branch** : dev (optionnel)
- **Auto-deploy** : ✅ Activé
- **Railway Volume** : ❌ Pas nécessaire

## 🎯 Avantages

- ✅ **Séparation claire** : Prod et dev complètement isolés
- ✅ **Base de données séparées** : Aucun risque de corruption
- ✅ **Rollback facile** : Si problème en prod, rollback immédiat
- ✅ **Tests réalistes** : Railway dev = conditions réelles
- ✅ **CI/CD intégré** : Auto-déploiement par branche

## 🔍 Monitoring

### Logs PRODUCTION
```bash
railway logs --environment production
```

### Logs DEVELOPMENT  
```bash
railway logs --environment development
```
