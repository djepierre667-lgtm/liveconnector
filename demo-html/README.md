# 🎬 TikTok Live Dashboard Pro

Interface moderne et professionnelle pour monitorer les lives TikTok en temps réel.

## ✨ Fonctionnalités

- **Design moderne** : Interface sombre avec les couleurs officielles de TikTok
- **Statistiques en temps réel** : Compteur de messages, cadeaux, abonnés et likes
- **Deux panneaux distincts** :
  - Flux de messages (chat)
  - Événements spéciaux (cadeaux, abonnements, likes)
- **Boutons intuitifs** : Connexion/Déconnexion facile
- **Responsive** : S'adapte à tous les écrans
- **Animations fluides** : Effets d'apparition modernes
- **Pas de clé API nécessaire** : Utilise le reverse engineering

## 🚀 Installation

1. Installez les dépendances :
```bash
npm install
```

2. Lancez le serveur :
```bash
npm start
```

3. Ouvrez votre navigateur sur :
```
http://localhost:3000
```

## 📖 Utilisation

1. Entrez le nom d'utilisateur TikTok d'un streamer **actuellement en live** (sans le @)
2. Cliquez sur **"Se Connecter"**
3. Regardez les événements apparaître en temps réel !

### Panneau de gauche : Flux de Messages
Affiche tous les commentaires du chat avec l'heure et l'expéditeur.

### Panneau de droite : Événements Spéciaux
Affiche les cadeaux, nouveaux abonnés et sessions de likes avec des icônes colorées.

### Barre de statistiques
En haut de la page, suivez en temps réel :
- Nombre total de messages
- Nombre total de cadeaux
- Nombre total d'abonnés
- Nombre total de likes

## ⚠️ Important

- **Aucune clé API n'est requise** - Le projet utilise une connexion directe aux serveurs TikTok
- Fonctionne **uniquement** avec des profils actuellement en direct (badge LIVE visible)
- Si la connexion échoue, vérifiez que le streamer est bien en live

## 🛠️ Technologies utilisées

- **Backend** : Node.js, Express, Socket.io
- **Frontend** : HTML5, CSS3, JavaScript vanilla
- **Bibliothèque** : tiktok-live-connector
- **Police** : Inter (Google Fonts)

## 🎨 Personnalisation

Vous pouvez modifier les couleurs dans le fichier `index.html` en changeant les variables CSS :

```css
:root {
    --primary: #fe2c55;      /* Rose TikTok */
    --secondary: #25f4ee;    /* Cyan TikTok */
    --success: #00c853;      /* Vert */
    --warning: #ffd600;      /* Jaune */
    --danger: #ff5252;       /* Rouge */
}
```

## 📝 Notes

- Les messages sont limités aux 100 derniers pour éviter la surcharge mémoire
- Les événements sont limités aux 50 derniers
- La déconnexion peut se faire via le bouton "Déconnecter" ou en fermant l'onglet

---

Créé avec ❤️ pour la communauté TikTok Live
