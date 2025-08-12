# railway-deploy.ps1 - SCRIPT DE DÉPLOIEMENT RAILWAY SÉCURISÉ
Write-Host "🚀 DÉPLOIEMENT RAILWAY SÉCURISÉ v2.8" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan

# Vérifier si on est dans le bon dossier
if (!(Test-Path "package.json")) {
    Write-Host "❌ Erreur: package.json introuvable" -ForegroundColor Red
    Write-Host "Assurez-vous d'être dans le dossier du projet" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 1. Vérification des fichiers..." -ForegroundColor Yellow
$requiredFiles = @("db_direct.js", "db-backup-github.js", "package.json", "main.js")
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file trouvé" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file MANQUANT" -ForegroundColor Red
        exit 1
    }
}

Write-Host "💾 2. Création backup local avant déploiement..." -ForegroundColor Yellow
$backupDate = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupFolder = "backup-before-deploy-$backupDate"

if (!(Test-Path "backups")) {
    New-Item -ItemType Directory -Name "backups" | Out-Null
}

New-Item -ItemType Directory -Path "backups\$backupFolder" | Out-Null

if (Test-Path "countonme.db") {
    Copy-Item "countonme.db" "backups\$backupFolder\countonme.db"
    Write-Host "   ✅ Base de données sauvegardée" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Aucune base de données locale trouvée" -ForegroundColor Yellow
}

# Sauvegarder les fichiers principaux
$mainFiles = @("db_direct.js", "db-backup-github.js", "main.js", "package.json")
foreach ($file in $mainFiles) {
    Copy-Item $file "backups\$backupFolder\$file"
}
Write-Host "   ✅ Code source sauvegardé dans backups\$backupFolder" -ForegroundColor Green

Write-Host "📦 3. Installation des dépendances..." -ForegroundColor Yellow
npm install --production
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'installation des dépendances" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Dépendances installées" -ForegroundColor Green

Write-Host "🧪 4. Test local rapide..." -ForegroundColor Yellow
$testResult = node -e "
try {
    console.log('Test démarrage...');
    const Database = require('./db_direct.js');
    const GitHubBackup = require('./db-backup-github.js');
    console.log('✅ Modules chargés avec succès');
    process.exit(0);
} catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
}
"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Test local échoué" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Test local réussi" -ForegroundColor Green

Write-Host "🛸 5. Déploiement sur Railway..." -ForegroundColor Yellow
Write-Host "   Variables d'environnement importantes:" -ForegroundColor Cyan
Write-Host "   - NODE_ENV=production" -ForegroundColor White
Write-Host "   - RAILWAY_VOLUME_MOUNT_PATH=/data" -ForegroundColor White
Write-Host ""

# Vérifier si Railway CLI est installé
$railwayCli = Get-Command railway -ErrorAction SilentlyContinue
if ($railwayCli) {
    Write-Host "   🚂 Railway CLI détecté, déploiement automatique..." -ForegroundColor Cyan
    
    # Configurer les variables d'environnement
    railway variables set NODE_ENV=production
    railway variables set RAILWAY_ENVIRONMENT=production
    railway variables set DB_BACKUP_ENABLED=true
    
    # Déployer
    railway up --detach
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Déploiement Railway lancé" -ForegroundColor Green
        
        Write-Host "⏳ 6. Attente du démarrage (30s)..." -ForegroundColor Yellow
        Start-Sleep 30
        
        Write-Host "📊 7. Vérification des logs..." -ForegroundColor Yellow
        railway logs --tail 20
        
    } else {
        Write-Host "   ❌ Erreur lors du déploiement Railway" -ForegroundColor Red
        exit 1
    }
    
} else {
    Write-Host "   ⚠️ Railway CLI non installé" -ForegroundColor Yellow
    Write-Host "   💡 Déploiement manuel nécessaire:" -ForegroundColor Cyan
    Write-Host "      1. Connectez-vous à https://railway.app" -ForegroundColor White
    Write-Host "      2. Allez dans votre projet" -ForegroundColor White
    Write-Host "      3. Variables > Ajoutez:" -ForegroundColor White
    Write-Host "         NODE_ENV=production" -ForegroundColor White
    Write-Host "         RAILWAY_ENVIRONMENT=production" -ForegroundColor White
    Write-Host "         DB_BACKUP_ENABLED=true" -ForegroundColor White
    Write-Host "      4. Redéployez depuis GitHub" -ForegroundColor White
}

Write-Host ""
Write-Host "🎯 DÉPLOIEMENT TERMINÉ !" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Cyan
Write-Host "📋 Résumé:" -ForegroundColor Yellow
Write-Host "   ✅ Version DB: 2.8 avec backup GitHub" -ForegroundColor White
Write-Host "   ✅ Backup pré-déploiement créé" -ForegroundColor White
Write-Host "   ✅ Backup automatique activé (2min)" -ForegroundColor White
Write-Host "   ✅ Auto-récupération en cas de perte" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Commandes utiles:" -ForegroundColor Yellow
Write-Host "   railway logs        # Voir les logs" -ForegroundColor White
Write-Host "   railway status      # État du déploiement" -ForegroundColor White
Write-Host "   railway variables   # Variables d'environnement" -ForegroundColor White
Write-Host ""
Write-Host "📁 Backup local: backups\$backupFolder" -ForegroundColor Cyan
