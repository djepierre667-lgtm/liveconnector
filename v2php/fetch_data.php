<?php
/**
 * fetch_data.php - Récupère les commentaires et dons depuis l'API
 * Ce fichier est appelé par stream.php via polling interne
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json');

// Session file pour stocker les données entre les requêtes
$sessionFile = __DIR__ . '/data_store.json';
$lastPageTokenFile = __DIR__ . '/last_page_token.txt';

/**
 * Récupère les commentaires YouTube Live
 */
function fetchYouTubeComments($chatId, $pageToken = null) {
    $url = "https://www.googleapis.com/youtube/v3/liveChat/messages?";
    $url .= "liveChatId={$chatId}&";
    $url .= "part=snippet,authorDetails&";
    $url .= "key=" . YOUTUBE_API_KEY;
    
    if ($pageToken) {
        $url .= "&pageToken={$pageToken}";
    }
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept: application/json'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        log_message("Erreur API YouTube: HTTP {$httpCode}");
        return ['error' => "HTTP {$httpCode}", 'items' => [], 'nextPageToken' => null];
    }
    
    $data = json_decode($response, true);
    
    $items = [];
    if (isset($data['items'])) {
        foreach ($data['items'] as $item) {
            $snippet = $item['snippet'];
            $author = $item['authorDetails'];
            
            // Détection de don (superchat, supersticker)
            $isDonation = false;
            $donationAmount = 0;
            $donationCurrency = '';
            
            if (isset($snippet['superChatDetails'])) {
                $isDonation = true;
                $donationAmount = $snippet['superChatDetails']['amountMicros'] / 1000000;
                $donationCurrency = $snippet['superChatDetails']['currency'];
            } elseif (isset($snippet['superStickerDetails'])) {
                $isDonation = true;
                $donationAmount = $snippet['superStickerDetails']['amountMicros'] / 1000000;
                $donationCurrency = $snippet['superStickerDetails']['currency'];
            }
            
            $items[] = [
                'id' => $item['id'],
                'type' => $isDonation ? 'donation' : 'comment',
                'author' => $author['displayName'],
                'authorChannelId' => $author['channelId'],
                'authorProfileImageUrl' => $author['profileImageUrl'],
                'message' => $snippet['textMessageDetails']['messageText'] ?? '',
                'publishedAt' => $snippet['publishedAt'],
                'isDonation' => $isDonation,
                'donationAmount' => $donationAmount,
                'donationCurrency' => $donationCurrency,
                'platform' => 'youtube'
            ];
        }
    }
    
    $nextPageToken = $data['nextPageToken'] ?? null;
    
    return [
        'items' => $items,
        'nextPageToken' => $nextPageToken,
        'pollingInterval' => $data['pollingIntervalMillis'] ?? 2000
    ];
}

/**
 * Récupère les commentaires Twitch (nécessite OAuth)
 */
function fetchTwitchComments($channelName) {
    // Note: Twitch nécessite une connexion WebSocket pour le chat en temps réel
    // Cette fonction est un exemple d'API REST (limité)
    
    $headers = [
        'Client-ID: ' . TWITCH_CLIENT_ID,
        'Authorization: Bearer ' . TWITCH_ACCESS_TOKEN
    ];
    
    // Récupérer l'ID du broadcaster
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.twitch.tv/helix/users?login={$channelName}");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $response = curl_exec($ch);
    curl_close($ch);
    
    $userData = json_decode($response, true);
    if (!isset($userData['data'][0]['id'])) {
        return ['error' => 'Channel not found', 'items' => []];
    }
    
    $broadcasterId = $userData['data'][0]['id'];
    
    // Note: Le chat Twitch en temps réel nécessite IRC/WebSocket
    // Ceci est un placeholder pour démontrer la structure
    log_message("Twitch nécessite une connexion WebSocket/IRC pour le chat live");
    
    return [
        'items' => [],
        'note' => 'Twitch chat requires WebSocket connection',
        'pollingInterval' => 5000
    ];
}

/**
 * Fonction principale de récupération
 */
function fetchData() {
    $platform = PLATFORM;
    $result = ['items' => [], 'pollingInterval' => REFRESH_INTERVAL * 1000];
    
    switch ($platform) {
        case 'youtube':
            $videoId = YOUTUBE_VIDEO_ID;
            if (empty($videoId)) {
                $result['error'] = 'YouTube Video ID not configured';
                break;
            }
            
            $chatId = getChatId('youtube', $videoId);
            if (!$chatId) {
                $result['error'] = 'Could not get chat ID. Check if video is live.';
                break;
            }
            
            $lastPageToken = file_exists($lastPageTokenFile) ? file_get_contents($lastPageTokenFile) : null;
            $result = fetchYouTubeComments($chatId, $lastPageToken);
            
            if (isset($result['nextPageToken'])) {
                file_put_contents($lastPageTokenFile, $result['nextPageToken']);
            }
            break;
            
        case 'twitch':
            $channelName = TWITCH_CHANNEL_NAME;
            if (empty($channelName)) {
                $result['error'] = 'Twitch channel name not configured';
                break;
            }
            
            $result = fetchTwitchComments($channelName);
            break;
            
        default:
            $result['error'] = 'Platform not supported';
    }
    
    return $result;
}

// Exécution
$response = fetchData();
echo json_encode($response);
log_message("Fetch completed: " . count($response['items'] ?? []) . " items");
