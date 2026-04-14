<?php
/**
 * stream.php - Server-Sent Events (SSE) pour pousser les données en temps réel
 * Ce fichier maintient une connexion ouverte et envoie les nouvelles données au client
 */

require_once __DIR__ . '/config.php';

// Headers SSE obligatoires
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');
header('X-Accel-Buffering: no'); // Désactiver le buffering nginx si applicable

// Désactiver le buffering PHP
ob_end_clean();
ob_implicit_flush(true);

// Fichier de stockage des données
$dataFile = __DIR__ . '/data_store.json';
$lastPageTokenFile = __DIR__ . '/last_page_token.txt';
$seenIdsFile = __DIR__ . '/seen_ids.json';

// Charger les IDs déjà vus pour éviter les doublons
$seenIds = file_exists($seenIdsFile) ? json_decode(file_get_contents($seenIdsFile), true) : [];
if (!is_array($seenIds)) {
    $seenIds = [];
}

/**
 * Envoie un événement SSE au client
 */
function sendEvent($eventType, $data) {
    echo "event: {$eventType}\n";
    echo "data: " . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n\n";
    ob_flush();
    flush();
}

/**
 * Récupère les commentaires YouTube Live avec gestion du polling
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
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        return ['error' => "HTTP {$httpCode}", 'items' => [], 'nextPageToken' => null, 'pollingInterval' => 5000];
    }
    
    $data = json_decode($response, true);
    
    $items = [];
    if (isset($data['items'])) {
        foreach ($data['items'] as $item) {
            $snippet = $item['snippet'];
            $author = $item['authorDetails'];
            
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
                'authorProfileImageUrl' => $author['profileImageUrl'] ?? '',
                'message' => $snippet['textMessageDetails']['messageText'] ?? '',
                'publishedAt' => $snippet['publishedAt'],
                'isDonation' => $isDonation,
                'donationAmount' => $donationAmount,
                'donationCurrency' => $donationCurrency,
                'platform' => 'youtube'
            ];
        }
    }
    
    return [
        'items' => $items,
        'nextPageToken' => $data['nextPageToken'] ?? null,
        'pollingInterval' => $data['pollingIntervalMillis'] ?? 2000
    ];
}

/**
 * Boucle principale de streaming
 */
function runStream() {
    global $seenIds, $dataFile, $lastPageTokenFile, $seenIdsFile;
    
    $platform = PLATFORM;
    $lastPageToken = file_exists($lastPageTokenFile) ? file_get_contents($lastPageTokenFile) : null;
    $consecutiveErrors = 0;
    $maxErrors = 10;
    
    // Envoyer un événement de connexion
    sendEvent('connected', [
        'status' => 'connected',
        'platform' => $platform,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
    while (true) {
        // Vérifier si le client est toujours connecté
        if (connection_aborted()) {
            log_message("Client disconnected");
            break;
        }
        
        $result = ['items' => [], 'pollingInterval' => REFRESH_INTERVAL * 1000];
        
        switch ($platform) {
            case 'youtube':
                $videoId = YOUTUBE_VIDEO_ID;
                if (empty($videoId)) {
                    $result['error'] = 'YouTube Video ID not configured';
                } else {
                    $chatId = getChatId('youtube', $videoId);
                    if (!$chatId) {
                        $result['error'] = 'Could not get chat ID. Check if video is live.';
                        $result['pollingInterval'] = 5000;
                    } else {
                        $result = fetchYouTubeComments($chatId, $lastPageToken);
                        
                        if (isset($result['nextPageToken']) && $result['nextPageToken']) {
                            $lastPageToken = $result['nextPageToken'];
                            file_put_contents($lastPageTokenFile, $lastPageToken);
                        }
                    }
                }
                break;
                
            default:
                $result['error'] = 'Platform not supported or not configured';
        }
        
        // Gérer les erreurs
        if (isset($result['error'])) {
            $consecutiveErrors++;
            log_message("Error: " . $result['error']);
            
            if ($consecutiveErrors >= $maxErrors) {
                sendEvent('error', ['message' => 'Too many consecutive errors', 'error' => $result['error']]);
                break;
            }
            
            sendEvent('status', ['type' => 'error', 'message' => $result['error']]);
            usleep($result['pollingInterval'] * 1000);
            continue;
        }
        
        $consecutiveErrors = 0;
        
        // Filtrer les items déjà vus
        $newItems = [];
        foreach ($result['items'] ?? [] as $item) {
            if (!in_array($item['id'], $seenIds)) {
                $seenIds[] = $item['id'];
                $newItems[] = $item;
            }
        }
        
        // Garder seulement les derniers 1000 IDs pour éviter la mémoire infinie
        if (count($seenIds) > 1000) {
            $seenIds = array_slice($seenIds, -1000);
            file_put_contents($seenIdsFile, json_encode($seenIds));
        }
        
        // Envoyer les nouveaux items
        if (!empty($newItems)) {
            foreach ($newItems as $item) {
                if ($item['isDonation']) {
                    sendEvent('donation', $item);
                    log_message("Donation detected: {$item['author']} - {$item['donationAmount']} {$item['donationCurrency']}");
                } else {
                    sendEvent('comment', $item);
                }
            }
        }
        
        // Attendre avant le prochain polling
        $pollingInterval = $result['pollingInterval'] ?? (REFRESH_INTERVAL * 1000);
        usleep($pollingInterval * 1000);
        
        // Envoyer un heartbeat périodique
        sendEvent('heartbeat', ['timestamp' => time()]);
    }
}

// Démarrer le stream
try {
    runStream();
} catch (Exception $e) {
    sendEvent('error', ['message' => $e->getMessage()]);
    log_message("Fatal error: " . $e->getMessage());
}
