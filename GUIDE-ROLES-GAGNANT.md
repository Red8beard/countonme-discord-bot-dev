# 👑 Guide du Système de Rôles Gagnant

Le système de rôles gagnant permet d'attribuer automatiquement un rôle spécial au gagnant hebdomadaire jusqu'au prochain trophée.

## 🚀 Configuration

### 1. Configurer le rôle gagnant
```
/set-winner-role role:@ChampionHebdomadaire
```
- Choisissez un rôle existant sur votre serveur
- Le bot vérifiera automatiquement les permissions

### 2. Vérifier la configuration
```
/set-winner-role
```
- Sans paramètre pour voir la configuration actuelle

## 🏆 Fonctionnement

### Attribution automatique
- **Chaque lundi à minuit** : Le gagnant hebdomadaire reçoit automatiquement le rôle
- L'ancien détenteur du rôle le perd automatiquement
- Le nouveau champion est annoncé dans le canal de comptage

### Gestion des conflits
- **Si le champion fait une erreur** : Il perd immédiatement son rôle de gagnant
- Un message annonce la perte du titre
- Le rôle d'échec temporaire est attribué normalement

### Cycle hebdomadaire
- **Nouveau gagnant** → Reçoit le rôle champion
- **Ancien champion** → Perd automatiquement le rôle
- **Champion qui échoue** → Perd le rôle et reçoit le rôle d'échec

## 💡 Conseils

### Création du rôle
- Créez un rôle spécial : `@Champion de la Semaine`, `@Maître Compteur`, etc.
- Donnez-lui une couleur distinctive
- Positionnez-le suffisamment haut dans la hiérarchie
- Assurez-vous que le bot peut gérer ce rôle (position inférieure au rôle du bot)

### Permissions requises
- Le bot doit avoir la permission "Gérer les rôles"
- Le rôle du bot doit être au-dessus du rôle gagnant dans la hiérarchie

## 🔄 États possibles

1. **Pas de rôle configuré** : Système désactivé
2. **Rôle configuré, pas de gagnant** : En attente du premier trophée
3. **Champion actuel** : Un joueur porte le rôle jusqu'au prochain lundi
4. **Champion déchu** : Perte du rôle suite à une erreur

## 🛠️ Dépannage

### Le rôle n'est pas attribué ?
- Vérifiez que le bot a la permission "Gérer les rôles"
- Vérifiez que le rôle du bot est au-dessus du rôle gagnant
- Vérifiez que le rôle existe toujours

### Comment désactiver ?
```
/set-winner-role role:aucun
```
ou configurez un nouveau rôle pour remplacer l'ancien

## 📊 Intégration

Le système de rôles gagnant s'intègre parfaitement avec :
- ✅ Système de trophées hebdomadaires
- ✅ Rôles d'échec temporaires  
- ✅ Système de scoring
- ✅ Messages d'annonce automatiques

---

*Le système est entièrement automatique une fois configuré ! 🎯*
