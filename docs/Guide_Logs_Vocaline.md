# 📊 Guide d'utilisation du système de logs Vocaline

## 🌐 Accès aux logs
**URL de la page des logs** : https://0vhlizc3g866.manus.space/logs

## 📋 Fonctionnalités disponibles

### 📊 Statistiques en temps réel
- **Total logs** : Nombre total d'événements enregistrés
- **Types d'événements** : Nombre de types d'événements différents
- **Connexions** : Nombre total de connexions utilisateurs
- **Matchs réussis** : Nombre de matchs réussis entre utilisateurs

### 🔍 Filtrage et recherche
- **Filtrer par type** : Sélectionner un type d'événement spécifique
- **Limite d'affichage** : Contrôler le nombre de logs affichés (10-1000)
- **Auto-refresh** : Les logs se mettent à jour automatiquement toutes les 10 secondes

### 📥 Export et copie
- **🔄 Actualiser** : Recharger manuellement les logs
- **📋 Copier tous les logs** : Copier tous les logs dans le presse-papiers
- **📥 Exporter CSV** : Télécharger tous les logs au format CSV
- **🗑️ Vider les logs** : Supprimer tous les logs (avec confirmation)

## 🏷️ Types d'événements loggés

### Connexions et déconnexions
- **CONNECT** : Connexion d'un utilisateur
- **DISCONNECT** : Déconnexion d'un utilisateur
- **USER_REGISTER** : Enregistrement d'un utilisateur dans le système
- **USER_REMOVE** : Suppression d'un utilisateur du système

### Matchmaking
- **JOIN_MATCHMAKING** : Utilisateur rejoint le matchmaking
- **PARTNER_SEARCH** : Recherche de partenaires disponibles
- **PARTNER_FOUND** : Partenaire valide trouvé
- **PARTNER_INVALID** : Partenaire non valide (déconnecté)
- **NO_PARTNER** : Aucun partenaire disponible
- **MATCH_SUCCESS** : Match réussi entre deux utilisateurs
- **MATCHMAKING** : Tentative de recherche d'un nouveau partenaire

### Gestion des rooms
- **ROOM_CREATE** : Création d'une nouvelle room de conversation
- **ROOM_DELETE** : Suppression d'une room
- **ROOM_DISCONNECT** : Déconnexion d'un utilisateur d'une room

### Changement de partenaire
- **LEAVE_CONVERSATION** : Utilisateur demande à quitter la conversation
- **LEAVE_ROOM** : Utilisateur quitte une room
- **PARTNER_IDENTIFIED** : Identification du partenaire à notifier
- **PARTNER_NOTIFY_LEAVE** : Notification au partenaire qu'un utilisateur a quitté
- **PARTNER_REQUEUE** : Partenaire remis en liste d'attente
- **USER_REQUEUE** : Utilisateur remis en liste d'attente
- **AUTO_REQUEUE** : Remise automatique en attente après déconnexion

### Gestion des listes d'attente
- **WAITING_REMOVE** : Utilisateur retiré de la liste d'attente
- **PARTNER_NOTIFY** : Notification de déconnexion du partenaire

### Erreurs
- **ERROR** : Erreurs diverses du système

## 🔍 Comment diagnostiquer le problème de reconnexion

### Scénario à reproduire :
1. **User1** et **User2** sont en conversation
2. **User2** clique sur "Changer de partenaire"
3. **User3** est en attente
4. **User2** devrait se connecter à **User3**

### Logs à surveiller :
1. **LEAVE_CONVERSATION** : User2 demande à quitter
2. **PARTNER_REQUEUE** : User1 remis en attente
3. **USER_REQUEUE** : User2 remis en attente
4. **MATCHMAKING** : Tentative de match pour User2
5. **PARTNER_FOUND** ou **NO_PARTNER** : Résultat de la recherche
6. **MATCH_SUCCESS** : Si le match réussit

### Points d'attention :
- Vérifier que **User3** est bien dans `waiting_users`
- Vérifier que **User2** est correctement remis en attente
- Vérifier que la fonction `try_find_new_partner` est appelée
- Analyser les données des logs pour voir les états des listes

## 📱 Utilisation mobile
L'interface des logs est responsive et fonctionne sur mobile avec :
- Contrôles adaptés pour écrans tactiles
- Filtres empilés verticalement sur petits écrans
- Défilement optimisé pour la consultation des logs

## 🔧 Conseils d'utilisation
1. **Reproduire le problème** en ouvrant plusieurs onglets avec des utilisateurs différents
2. **Consulter les logs en temps réel** pendant les tests
3. **Filtrer par type** pour se concentrer sur les événements de matchmaking
4. **Exporter les logs** pour analyse approfondie si nécessaire
5. **Vider les logs** entre les sessions de test pour plus de clarté

## 🌐 URLs importantes
- **Application principale** : https://0vhlizc3g866.manus.space
- **Page des logs** : https://0vhlizc3g866.manus.space/logs
- **API des logs** : https://0vhlizc3g866.manus.space/api/logs

