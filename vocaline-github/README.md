# Vocaline - Application de Matchmaking Vocal

Application web de matchmaking vocal en temps réel permettant aux utilisateurs de se connecter et communiquer uniquement par la voix.

## 🎯 Fonctionnalités

- **Communication vocale uniquement** via WebRTC
- **Matchmaking automatique** entre utilisateurs connectés
- **Changement de partenaire** à tout moment
- **Interface responsive** (desktop et mobile)
- **Microphone persistant** (autorisation mémorisée)
- **Système de logs** pour diagnostic
- **Anti-auto-connexion** (empêche de se connecter à soi-même)

## 🚀 Installation et Déploiement

### Backend (Flask)
```bash
cd backend
pip install -r requirements.txt
python run_server.py
```

### Frontend (React)
```bash
cd frontend
npm install
npm run build
```

## 🌐 Version Live

**Application** : https://8xhpiqcqynkm.manus.space
**Logs** : https://8xhpiqcqynkm.manus.space/logs

## 📱 Utilisation

1. Autoriser l'accès au microphone
2. Entrer un nom d'utilisateur
3. Rejoindre le matchmaking
4. Communiquer par la voix avec votre partenaire
5. Changer de partenaire à tout moment

## 🔧 Technologies

- **Backend** : Flask, SocketIO, WebRTC signaling
- **Frontend** : React, Vite, Tailwind CSS
- **Communication** : WebSockets, WebRTC
- **Déploiement** : Manus Platform

## 📊 Logs et Diagnostic

L'application inclut un système de logs complet pour diagnostiquer les problèmes de connexion et audio, accessible via `/logs`.

## 📁 Structure du Projet

```
vocaline/
├── backend/          # Backend Flask + SocketIO
├── frontend/         # Frontend React
├── docs/            # Documentation
└── README.md        # Ce fichier
```

## 🛠️ Développement

### Corrections Récentes
- ✅ Problème audio résolu (stream WebRTC)
- ✅ Logs mobiles renforcés
- ✅ Anti-auto-connexion
- ✅ Microphone persistant
- ✅ Interface responsive

### Architecture
- **WebRTC** pour la communication audio P2P
- **SocketIO** pour le signaling et matchmaking
- **React** avec hooks personnalisés pour la gestion d'état
- **Système de logs** centralisé pour le diagnostic

## 📖 Documentation

- [Guide Utilisateur](docs/VoiceMatch_Guide_Utilisateur_Final.md)
- [Guide des Logs](docs/Guide_Logs_Vocaline.md)
- [Rapport Tests Audio](docs/rapport_tests_audio_vocaline.md)

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

