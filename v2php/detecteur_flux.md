# Comment détecter le flux de commentaires et dons en direct

## Outils nécessaires
- Navigateur web (Chrome, Firefox, Edge)
- Outils de développement (F12)

## Méthode 1: Onglet Network (Réseau)

### Étape par étape :

1. **Ouvrir les outils de développement**
   - Appuyez sur `F12` ou `Ctrl+Shift+I` (Windows/Linux)
   - Ou `Cmd+Option+I` (Mac)

2. **Aller dans l'onglet "Network" (Réseau)**

3. **Filtrer par type de connexion :**
   - **WS** pour WebSocket
   - **Fetch/XHR** pour les API REST
   - **EventStream** pour Server-Sent Events (SSE)

4. **Rechercher les motifs suivants :**
   - `live_chat`
   - `chat`
   - `comment`
   - `donation`
   - `superchat`
   - `event`
   - `socket`

5. **Examiner la requête :**
   - URL du endpoint
   - Headers (authentification, tokens)
   - Payload/Response format (JSON, protobuf, etc.)

## Méthode 2: Recherche dans le code source

### Dans l'onglet "Sources" ou "Debugger" :

1. **Rechercher (Ctrl+Shift+F) :**
   ```
   wss://
   ws://
   new WebSocket(
   .onmessage
   EventSource(
   text/event-stream
   liveChatId
   get_live_chat
   ```

2. **Explorer les fichiers JavaScript**
   - Cherchez les fichiers contenant "chat", "live", "stream"
   - Décodez les fichiers minifiés si nécessaire

## Méthode 3: Analyse du trafic WebSocket

### Pour les connexions WebSocket :

1. **Cliquez sur la connexion WS dans l'onglet Network**
2. **Onglet "Messages"** pour voir les données échangées
3. **Notez :**
   - Format des messages entrants
   - Fréquence des messages
   - Structure des données (JSON, binaire, etc.)

## Exemples par plateforme

### YouTube Live Chat
```
Endpoint: https://www.googleapis.com/youtube/v3/liveChat/messages
Paramètres: liveChatId, part, key (API), pageToken, maxResults
Type: REST API avec polling
```

### YouTube (méthode alternative - Innertube)
```
Endpoint: https://www.youtube.com/youtubei/v1/live_chat/get_live_chat
Body: JSON avec context, liveChatId
Type: POST avec polling
```

### Twitch Chat
```
WebSocket: wss://irc-ws.chat.twitch.tv:443
Commands: CAP, PASS, NICK, USER, JOIN #channel
Type: IRC over WebSocket
```

### TikTok Live
```
WebSocket: wss://webcast58-normal...tiktok.com/
Type: WebSocket avec protobuf
Note: Données souvent encodées en protobuf
```

### Facebook Live
```
WebSocket: wss://edge-chat.facebook.com/chat
Type: WebSocket avec séquences MQTT
```

## Scripts PHP pour différentes plateformes

### Pour YouTube (déjà implémenté)
- Utilise l'API officielle YouTube Data v3
- Nécessite une clé API
- Polling automatique géré par stream.php

### Pour Twitch
- Nécessite connexion WebSocket IRC
- OAuth token requis
- Voir: https://dev.twitch.tv/docs/irc

### Pour TikTok
- WebSocket avec données protobuf
- Nécessite décodage protobuf
- Signature des requêtes complexe

### Pour une plateforme custom
- Identifier l'endpoint API
- Reproduire les headers nécessaires
- Implémenter le polling ou WebSocket en PHP

## Conseils importants

1. **Respectez les CGU** de chaque plateforme
2. **Utilisez les API officielles** quand disponibles
3. **Rate limiting** : Ne pas faire trop de requêtes
4. **Authentication** : Conservez les tokens securely
5. **User-Agent** : Utilisez un User-Agent valide

## Outils utiles

- **Wireshark** : Analyse réseau avancée
- **Fiddler/Charles** : Proxy HTTP pour inspecter le trafic
- **Postman** : Tester les endpoints API
- **wscat** : Tool en ligne de commande pour WebSocket
