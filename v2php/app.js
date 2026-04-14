/**
 * app.js - Logique JavaScript pour le scraper live
 * Utilise Server-Sent Events (SSE) pour recevoir les données en temps réel
 */

class LiveScraper {
    constructor() {
        this.eventSource = null;
        this.comments = [];
        this.donations = [];
        this.isConnected = false;
        this.currentFilter = 'all';
        
        // Éléments DOM
        this.elements = {
            connectionStatus: document.getElementById('connectionStatus'),
            connectionText: document.getElementById('connectionText'),
            totalCount: document.getElementById('totalCount'),
            commentCount: document.getElementById('commentCount'),
            donationCount: document.getElementById('donationCount'),
            commentBadge: document.getElementById('commentBadge'),
            donationBadge: document.getElementById('donationBadge'),
            commentsContainer: document.getElementById('commentsContainer'),
            donationsContainer: document.getElementById('donationsContainer'),
            logContainer: document.getElementById('logContainer'),
            connectBtn: document.getElementById('connectBtn'),
            clearBtn: document.getElementById('clearBtn'),
            exportBtn: document.getElementById('exportBtn'),
            filterBtns: document.querySelectorAll('.filter-btn')
        };
        
        this.init();
    }
    
    init() {
        // Gestion des boutons
        this.elements.connectBtn.addEventListener('click', () => this.toggleConnection());
        this.elements.clearBtn.addEventListener('click', () => this.clearAll());
        this.elements.exportBtn.addEventListener('click', () => this.exportData());
        
        // Gestion des filtres
        this.elements.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.setFilter(e.target.dataset.filter));
        });
        
        this.log('Application initialisée', 'info');
    }
    
    toggleConnection() {
        if (this.isConnected) {
            this.disconnect();
        } else {
            this.connect();
        }
    }
    
    connect() {
        if (this.eventSource) {
            this.eventSource.close();
        }
        
        this.log('Connexion au flux SSE...', 'info');
        
        // Connexion au stream PHP via Server-Sent Events
        this.eventSource = new EventSource('stream.php');
        
        this.eventSource.onopen = () => {
            this.isConnected = true;
            this.updateConnectionStatus(true);
            this.elements.connectBtn.textContent = '⏹️ Arrêter';
            this.log('Connecté au serveur', 'success');
        };
        
        this.eventSource.onerror = (error) => {
            this.isConnected = false;
            this.updateConnectionStatus(false);
            this.elements.connectBtn.textContent = '▶️ Démarrer';
            this.log('Erreur de connexion: ' + (error.message || 'Connection fermée'), 'error');
            
            // Fermer la connexion en cas d'erreur
            this.eventSource.close();
        };
        
        // Écouteur pour les commentaires
        this.eventSource.addEventListener('comment', (event) => {
            const data = JSON.parse(event.data);
            this.addComment(data);
        });
        
        // Écouteur pour les dons
        this.eventSource.addEventListener('donation', (event) => {
            const data = JSON.parse(event.data);
            this.addDonation(data);
            this.log(`🎁 DON: ${data.author} a donné ${data.donationAmount} ${data.donationCurrency}`, 'donation');
        });
        
        // Écouteur pour les événements de statut
        this.eventSource.addEventListener('status', (event) => {
            const data = JSON.parse(event.data);
            this.log('Statut: ' + data.message, data.type === 'error' ? 'error' : 'info');
        });
        
        // Écouteur pour les erreurs
        this.eventSource.addEventListener('error', (event) => {
            const data = JSON.parse(event.data);
            this.log('Erreur serveur: ' + data.message, 'error');
        });
        
        // Écouteur pour le heartbeat
        this.eventSource.addEventListener('heartbeat', (event) => {
            const data = JSON.parse(event.data);
            // Mettre à jour l'heure de dernier heartbeat si nécessaire
        });
        
        // Écouteur pour la connexion établie
        this.eventSource.addEventListener('connected', (event) => {
            const data = JSON.parse(event.data);
            this.log(`Plateforme: ${data.platform}`, 'info');
        });
    }
    
    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        
        this.isConnected = false;
        this.updateConnectionStatus(false);
        this.elements.connectBtn.textContent = '▶️ Démarrer';
        this.log('Déconnecté', 'info');
    }
    
    updateConnectionStatus(connected) {
        if (connected) {
            this.elements.connectionStatus.className = 'status-dot connected';
            this.elements.connectionText.textContent = 'Connecté';
        } else {
            this.elements.connectionStatus.className = 'status-dot disconnected';
            this.elements.connectionText.textContent = 'Déconnecté';
        }
    }
    
    addComment(comment) {
        this.comments.unshift(comment);
        
        // Limiter le nombre de commentaires en mémoire
        if (this.comments.length > 500) {
            this.comments.pop();
        }
        
        this.renderComments();
        this.updateCounts();
    }
    
    addDonation(donation) {
        this.donations.unshift(donation);
        this.comments.unshift(donation); // Les dons apparaissent aussi dans les commentaires
        
        // Limiter le nombre de dons en mémoire
        if (this.donations.length > 500) {
            this.donations.pop();
        }
        
        this.renderDonations();
        this.renderComments();
        this.updateCounts();
    }
    
    renderComments() {
        const container = this.elements.commentsContainer;
        
        let itemsToRender = this.comments;
        
        // Appliquer le filtre
        if (this.currentFilter === 'comments') {
            itemsToRender = this.comments.filter(c => !c.isDonation);
        } else if (this.currentFilter === 'donations') {
            itemsToRender = this.comments.filter(c => c.isDonation);
        }
        
        if (itemsToRender.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">💬</div>
                    <p>Aucun commentaire</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = itemsToRender.map(item => this.createItemHTML(item)).join('');
    }
    
    renderDonations() {
        const container = this.elements.donationsContainer;
        
        if (this.donations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎁</div>
                    <p>Aucun don pour le moment</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.donations.map(item => this.createItemHTML(item, true)).join('');
    }
    
    createItemHTML(item, showDonationBadge = false) {
        const time = new Date(item.publishedAt).toLocaleTimeString('fr-FR');
        const avatarUrl = item.authorProfileImageUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23666" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23fff" font-size="40">?</text></svg>';
        
        let badgeHTML = '';
        if (item.isDonation || showDonationBadge) {
            badgeHTML = `<span class="donation-badge">💰 ${item.donationAmount} ${item.donationCurrency}</span>`;
        }
        
        return `
            <div class="item ${item.type}">
                <img src="${this.escapeHtml(item.authorProfileImageUrl || '')}" alt="${this.escapeHtml(item.author)}" class="item-avatar" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23666%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 fill=%22%23fff%22 font-size=%2240%22>?</text></svg>'">
                <div class="item-content">
                    <div class="item-header">
                        <span class="item-author">${this.escapeHtml(item.author)}</span>
                        <span class="item-time">${time}</span>
                    </div>
                    <div class="item-message">${this.escapeHtml(item.message)}</div>
                    ${badgeHTML}
                </div>
            </div>
        `;
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    updateCounts() {
        const totalComments = this.comments.length;
        const totalDonations = this.donations.length;
        
        this.elements.totalCount.textContent = totalComments;
        this.elements.commentCount.textContent = totalComments - totalDonations;
        this.elements.donationCount.textContent = totalDonations;
        this.elements.commentBadge.textContent = totalComments;
        this.elements.donationBadge.textContent = totalDonations;
    }
    
    setFilter(filter) {
        this.currentFilter = filter;
        
        // Mettre à jour les boutons actifs
        this.elements.filterBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        this.renderComments();
        this.log(`Filtre appliqué: ${filter}`, 'info');
    }
    
    clearAll() {
        this.comments = [];
        this.donations = [];
        this.renderComments();
        this.renderDonations();
        this.updateCounts();
        this.log('Données effacées', 'info');
    }
    
    exportData() {
        const data = {
            exportDate: new Date().toISOString(),
            totalComments: this.comments.length,
            totalDonations: this.donations.length,
            comments: this.comments,
            donations: this.donations
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scraper-export-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.log('Données exportées avec succès', 'success');
    }
    
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString('fr-FR');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${timestamp}] ${message}`;
        
        this.elements.logContainer.insertBefore(entry, this.elements.logContainer.firstChild);
        
        // Limiter le nombre de logs affichés
        while (this.elements.logContainer.children.length > 100) {
            this.elements.logContainer.removeChild(this.elements.logContainer.lastChild);
        }
    }
}

// Initialiser l'application quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    window.scraper = new LiveScraper();
});
