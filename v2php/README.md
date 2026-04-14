# Scraper de Commentaires et Donateurs Live (PHP + JavaScript)

## Comment récupérer le flux live

La plupart des plateformes (YouTube, Twitch, TikTok, etc.) utilisent des **WebSockets** ou du **Server-Sent Events (SSE)** pour les commentaires et dons en temps réel.

### Méthodes de détection :

1. **Onglet Network (F12)** → Filtrer par "WS" (WebSocket) ou "EventStream"
2. **Recherche dans le code source** : Chercher `wss://`, `ws://`, `.onmessage`, `new WebSocket`
3. **API cachées** : Certains sites utilisent des endpoints API polling (`/livechat/get_live_chat`)

### Architecture de ce scraper :

- **PHP** : Backend qui gère les requêtes cURL vers l'API de la plateforme
- **JavaScript** : Frontend qui utilise EventSource (SSE) ou WebSocket pour recevoir les données en temps réel
- **Pas de Node.js requis** : Tout fonctionne avec PHP natif et JS vanilla

## Structure des fichiers

- `index.html` : Interface utilisateur
- `stream.php` : Server-Sent Events pour pousser les données au frontend
- `fetch_data.php` : Récupère les données depuis l'API externe
- `config.php` : Configuration (URL, clés API, etc.)
- `app.js` : Logique JavaScript côté client

