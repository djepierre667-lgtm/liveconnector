# Demo HTML - TikTok Live Connector

Cette démo montre comment utiliser `tiktok-live-connector` avec une interface HTML en temps réel via Socket.io.

## Installation

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

## Utilisation

1. Entrez le nom d'utilisateur TikTok d'un streamer **actuellement en direct** (sans le @)
2. Cliquez sur "Rejoindre"
3. Vous verrez apparaître en temps réel :
   - Les commentaires du chat
   - Les cadeaux envoyés
   - Les nouveaux abonnés
   - Les likes

## Structure des fichiers

- `server.js` : Serveur Node.js qui se connecte à TikTok et diffuse les données
- `index.html` : Interface utilisateur pour afficher les événements en temps réel
- `package.json` : Configuration du projet et dépendances

## Personnalisation

Vous pouvez modifier `index.html` pour changer l'apparence ou ajouter de nouvelles fonctionnalités comme :
- Compteur de viewers
- Statistiques des cadeaux
- Export des données
- Intégration OBS (via navigateur source)

## Notes importantes

- Le streamer doit être **en direct** au moment du test
- Certains comptes privés ou restreints peuvent ne pas fonctionner
- Pour une utilisation dans OBS, ajoutez simplement l'URL `http://localhost:3000` comme source "Navigateur"
