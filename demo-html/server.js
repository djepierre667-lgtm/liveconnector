const { WebcastPushConnection } = require('tiktok-live-connector');
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir le fichier HTML
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

let tiktokLiveConnection;
let currentUsername = null;

io.on('connection', (socket) => {
    console.log('Un client est connecté');

    socket.on('joinLive', (username) => {
        // Déconnexion précédente si existe
        if (tiktokLiveConnection) {
            tiktokLiveConnection.disconnect();
            tiktokLiveConnection = null;
            currentUsername = null;
        }

        console.log(`Connexion au live de : ${username}`);
        currentUsername = username;
        
        // Initialisation de la connexion TikTok
        tiktokLiveConnection = new WebcastPushConnection(username);

        tiktokLiveConnection.connect().then((state) => {
            console.log(`Connecté au live de ${username}, ID: ${state.roomId}`);
            socket.emit('connected', `Connecté au live de ${username} !`);
        }).catch((err) => {
            console.error('Erreur de connexion', err);
            socket.emit('error', 'Impossible de rejoindre ce live (vérifiez le nom d\'utilisateur).');
            tiktokLiveConnection = null;
            currentUsername = null;
        });

        // Événement : Nouveau Commentaire
        tiktokLiveConnection.on('chat', (data) => {
            socket.emit('chat', {
                user: data.uniqueId,
                message: data.comment,
                color: '#ffffff'
            });
        });

        // Événement : Nouveau Cadeau
        tiktokLiveConnection.on('gift', (data) => {
            socket.emit('gift', {
                user: data.uniqueId,
                giftName: data.giftName,
                repeatCount: data.repeatCount
            });
        });
        
        // Événement : Nouvel Abonné
        tiktokLiveConnection.on('social', (data) => {
             if (data.displayType === 'subscribe') {
                socket.emit('subscribe', {
                    user: data.uniqueId
                });
             }
        });

        // Événement : Like
        tiktokLiveConnection.on('like', (data) => {
            socket.emit('like', {
                user: data.uniqueId,
                likeCount: data.likeCount
            });
        });
    });

    socket.on('disconnectLive', () => {
        if (tiktokLiveConnection) {
            tiktokLiveConnection.disconnect();
            tiktokLiveConnection = null;
            currentUsername = null;
            console.log('Déconnecté du live');
            socket.emit('disconnected');
        }
    });

    socket.on('disconnect', () => {
        console.log('Client déconnecté');
        if (tiktokLiveConnection) {
            tiktokLiveConnection.disconnect();
            tiktokLiveConnection = null;
            currentUsername = null;
        }
    });
});

server.listen(3000, () => {
    console.log('Serveur lancé sur http://localhost:3000');
});
