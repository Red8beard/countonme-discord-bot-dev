# 🚀 GUIDE DE DÉPLOIEMENT RAILWAY

## 📋 Structure recommandée

### Branches Git
- `main` → Déploie sur Railway PRODUCTION
- `dev` → Déploie sur Railway DEV (optionnel)
- `feature/*` → Tests locaux uniquement

### Projets Railway
1. **Count On Me** (Production)
2. **Count On Me DEV** (Tests)

## 🔧 Configuration Railway

### Projet Production
```bash
# Variables d'environnement Railway PROD
DISCORD_TOKEN=votre_token_production
CLIENT_ID=votre_client_id_production
NODE_ENV=production
```

### Projet Développement
```bash
# Variables d'environnement Railway DEV
DISCORD_TOKEN=votre_token_dev
CLIENT_ID=votre_client_id_dev
NODE_ENV=development
```

## 🚢 Commandes de déploiement

### Déploiement automatique (git push)
```bash
# Production (branche main)
git checkout main
git push origin main  # Déploie automatiquement sur Railway PROD

# Développement (branche dev)
git checkout dev
git push origin dev    # Déploie automatiquement sur Railway DEV
```

### Déploiement manuel Railway
```bash
# Se connecter au bon projet
railway login

# Lister les projets
railway status

# Basculer vers le projet de dev
railway link [project-id-dev]

# Déployer manuellement
railway up
```

## 🔄 Workflow de test recommandé

1. **Développement local**
   ```bash
   git checkout -b feature/nouvelle-fonctionnalite
   npm run dev  # Test en local avec bot DEV
   ```

2. **Test sur Railway DEV**
   ```bash
   git checkout dev
   git merge feature/nouvelle-fonctionnalite
   git push origin dev  # Auto-déploie sur Railway DEV
   ```

3. **Production**
   ```bash
   git checkout main
   git merge dev
   git push origin main  # Auto-déploie sur Railway PROD
   ```

## ⚡ Railway CLI - Raccourcis

```bash
# Voir les logs en temps réel
railway logs --follow

# Accéder à la console de la base de données
railway shell

# Redémarrer le service
railway restart

# Voir les variables d'environnement
railway variables
```

## 🛠️ Configuration avancée

### Déploiement conditionnel
Si vous voulez un seul projet Railway avec des environnements :

```javascript
// Dans railway.json (si existant)
{
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health"
  }
}
```

### Variables d'environnement par branche
Railway peut utiliser différentes variables selon la branche :
- Branch `main` → Variables PROD
- Branch `dev` → Variables DEV
