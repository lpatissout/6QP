// Fonctions utilitaires :

/**
 * Calcule le nombre de points de pénalité pour une carte.
 * @param {number} card - La valeur de la carte (1 à 104).
 * @returns {number} - Le nombre de points de pénalité.
 */
function getCardPoints(card) {
    if (card === 55) return 7;
    if (card % 11 === 0) return 5;
    if (card % 10 === 0) return 3;
    if (card % 5 === 0) return 2;
    return 1;
}

/**
 * Crée le HTML pour afficher une carte.
 * @param {number} card - La valeur de la carte.
 * @returns {string} - Le HTML de la carte.
 */
function createCardHTML(card) {
    return `<div class="card">${card}<div class="card-points">${getCardPoints(card)}</div></div>`;
}

/**
 * Génère un code de jeu aléatoire de 4 lettres.
 * @returns {string} - Le code du jeu.
 */
function generateGameCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Génère un identifiant de joueur unique.
 * @returns {string} - L'ID du joueur.
 */
function generatePlayerId() {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Mélange un tableau (Algorithme de Fisher-Yates).
 * @param {Array<any>} array - Le tableau à mélanger.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}


// --- Fonctions de Persistance (pour résoudre le problème de rechargement) ---

/**
 * Sauvegarde les infos de session dans le stockage local du navigateur.
 */
function saveSession(code, name, id, host) {
    localStorage.setItem('gameCode', code);
    localStorage.setItem('playerName', name);
    localStorage.setItem('playerId', id);
    localStorage.setItem('isHost', host ? 'true' : 'false');
    // On sauvegarde aussi le mode pour la reprise
    localStorage.setItem('gameMode', host ? 'host' : 'join'); 
}

/**
 * Récupère les infos de session sauvegardées.
 * @returns {{code: string, name: string, id: string, isHost: boolean} | null}
 */
function loadSession() {
    const code = localStorage.getItem('gameCode');
    const name = localStorage.getItem('playerName');
    const id = localStorage.getItem('playerId');
    const isHost = localStorage.getItem('isHost') === 'true';

    if (code && name && id) {
        return { code, name, id, isHost };
    }
    return null;
}