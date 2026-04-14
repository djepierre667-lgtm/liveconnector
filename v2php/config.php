<?php
/**
 * Configuration du scraper
 * Adaptez ces paramètres selon la plateforme cible
 */

// Configuration générale
define('PLATFORM', 'youtube'); // youtube, twitch, tiktok, custom
define('REFRESH_INTERVAL', 2); // secondes entre chaque polling
define('MAX_COMMENTS', 100); // nombre max de commentaires à garder en mémoire

// Configuration YouTube (exemple)
define('YOUTUBE_API_KEY', ''); // Votre clé API YouTube Data v3
define('YOUTUBE_VIDEO_ID', ''); // ID de la vidéo/live

// Configuration Twitch (exemple)
define('TWITCH_CLIENT_ID', '');
define('TWITCH_ACCESS_TOKEN', '');
define('TWITCH_CHANNEL_NAME', '');

// Configuration serveur
define('SERVER_URL', 'http://localhost:8000'); // URL de votre serveur PHP

// Mode debug
define('DEBUG', true);

/**
 * Fonction utilitaire pour logger
 */
function log_message($message) {
    if (DEBUG) {
        $timestamp = date('Y-m-d H:i:s');
        file_put_contents(__DIR__ . '/debug.log', "[$timestamp] $message\n", FILE_APPEND);
    }
}

/**
 * Récupère l'ID du live chat selon la plateforme
 */
function getChatId($platform, $identifier) {
    switch ($platform) {
        case 'youtube':
            return getYouTubeChatId($identifier);
        case 'twitch':
            return $identifier; // Twitch utilise le nom de channel directement
        default:
            return null;
    }
}

/**
 * Récupère l'ID du chat YouTube depuis l'API
 */
function getYouTubeChatId($videoId) {
    $url = "https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id={$videoId}&key=" . YOUTUBE_API_KEY;
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    $data = json_decode($response, true);
    
    if (isset($data['items'][0]['liveStreamingDetails']['activeLiveChatId'])) {
        return $data['items'][0]['liveStreamingDetails']['activeLiveChatId'];
    }
    
    return null;
}
