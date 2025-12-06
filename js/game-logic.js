// Logique pure du jeu - calculs et règles

/**
 * Calcule le nombre de têtes de bœuf (points de pénalité) pour une carte
 * @param {number} cardNumber - Numéro de la carte (1-104)
 * @returns {number} - Nombre de têtes
 */
function calculateHeads(cardNumber) {
    if (cardNumber === GAME_CONSTANTS.CARD_55) {
        return HEADS_POINTS.CARD_55;
    }
    
    if (cardNumber % GAME_CONSTANTS.MULTIPLE_11 === 0) {
        return HEADS_POINTS.MULTIPLE_11;
    }
    
    if (cardNumber % GAME_CONSTANTS.MULTIPLE_10 === 0) {
        return HEADS_POINTS.MULTIPLE_10;
    }
    
    if (cardNumber % GAME_CONSTANTS.MULTIPLE_5 === 0) {
        return HEADS_POINTS.MULTIPLE_5;
    }
    
    return HEADS_POINTS.DEFAULT;
}

/**
 * Calcule le total de têtes pour un tableau de cartes
 * @param {number[]} cards - Tableau de numéros de cartes
 * @returns {number} - Total de têtes
 */
function calculateTotalHeads(cards) {
    return cards.reduce((total, card) => total + calculateHeads(card), 0);
}

/**
 * Génère et mélange un paquet de 104 cartes
 * @returns {number[]} - Tableau de cartes mélangées
 */
function shuffleDeck() {
    const deck = [];
    for (let i = 1; i <= GAME_CONSTANTS.TOTAL_CARDS; i++) {
        deck.push(i);
    }
    
    // Mélange Fisher-Yates
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    return deck;
}

/**
 * Distribue les cartes initiales
 * @param {number[]} deck - Paquet de cartes mélangé
 * @param {number} playerCount - Nombre de joueurs
 * @returns {Object} - {rows, hands, remainingDeck}
 */
function dealCards(deck, playerCount) {
    const hands = [];
    const rows = [];
    let deckIndex = 0;
    
    // Distribuer 4 cartes pour les rangées
    for (let i = 0; i < GAME_CONSTANTS.ROWS_COUNT; i++) {
        rows.push([deck[deckIndex++]]);
    }
    
    // Distribuer 10 cartes à chaque joueur
    for (let i = 0; i < playerCount; i++) {
        const hand = [];
        for (let j = 0; j < GAME_CONSTANTS.CARDS_PER_PLAYER; j++) {
            hand.push(deck[deckIndex++]);
        }
        // Trier la main en ordre croissant
        hand.sort((a, b) => a - b);
        hands.push(hand);
    }
    
    const remainingDeck = deck.slice(deckIndex);
    
    return { rows, hands, remainingDeck };
}

/**
 * Trouve la rangée appropriée pour une carte
 * @param {number} cardValue - Valeur de la carte
 * @param {number[][]} rows - Tableau des rangées
 * @returns {number} - Index de la rangée (-1 si carte trop petite)
 */
function findValidRow(cardValue, rows) {
    let bestRow = -1;
    let bestDiff = Infinity;
    
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].length === 0) continue;
        const lastCard = rows[i][rows[i].length - 1];
        const diff = cardValue - lastCard;
        
        if (diff > 0 && diff < bestDiff) {
            bestDiff = diff;
            bestRow = i;
        }
    }
    
    return bestRow;
}

/**
 * Vérifie si une carte est trop petite pour toutes les rangées
 * @param {number} cardValue - Valeur de la carte
 * @param {number[][]} rows - Tableau des rangées
 * @returns {boolean}
 */
function isCardTooSmall(cardValue, rows) {
    return rows.every(row => {
        if (row.length === 0) return false;
        return cardValue < row[row.length - 1];
    });
}

/**
 * Place une carte dans une rangée et gère les règles spéciales
 * @param {number} cardValue - Valeur de la carte
 * @param {number} rowIndex - Index de la rangée
 * @param {number[][]} rows - Tableau des rangées
 * @returns {Object} - {newRows, collectedCards, collectedHeads}
 */
function placeCardInRow(cardValue, rowIndex, rows) {
    const newRows = rows.map(row => [...row]);
    const row = newRows[rowIndex];
    let collectedCards = [];
    let collectedHeads = 0;
    
    // Si la rangée a déjà 5 cartes, ramasser les 5 premières
    if (row.length >= GAME_CONSTANTS.MAX_ROWS_LENGTH) {
        collectedCards = row.slice(0, GAME_CONSTANTS.MAX_ROWS_LENGTH);
        collectedHeads = calculateTotalHeads(collectedCards);
        // La nouvelle carte devient la première
        newRows[rowIndex] = [cardValue];
    } else {
        // Ajouter la carte à la fin
        row.push(cardValue);
        newRows[rowIndex] = row;
    }
    
    return { newRows, collectedCards, collectedHeads };
}

/**
 * Trie les cartes jouées par ordre croissant
 * @param {Object[]} playedCards - [{playerId, card}, ...]
 * @returns {Object[]} - Cartes triées
 */
function sortPlayedCards(playedCards) {
    return [...playedCards].sort((a, b) => {
        if (a.card !== b.card) {
            return a.card - b.card;
        }
        // Si même carte, trier par ID joueur pour la cohérence
        return a.playerId.localeCompare(b.playerId);
    });
}

/**
 * Vérifie si la partie est terminée
 * @param {Object[]} players - Liste des joueurs
 * @param {number} currentRound - Manche actuelle
 * @returns {Object} - {finished, reason, winner}
 */
function checkGameEnd(players, currentRound) {
    // Vérifier si un joueur a atteint 66 points
    const loser = players.find(p => p.score >= GAME_CONSTANTS.LOSE_SCORE);
    if (loser) {
        // Le gagnant est celui avec le moins de points
        const sortedPlayers = [...players].sort((a, b) => a.score - b.score);
        return {
            finished: true,
            reason: 'lose_score',
            winner: sortedPlayers[0]
        };
    }
    
    // Vérifier si 6 manches sont complètes
    if (currentRound > GAME_CONSTANTS.MAX_ROUNDS) {
        const sortedPlayers = [...players].sort((a, b) => a.score - b.score);
        return {
            finished: true,
            reason: 'max_rounds',
            winner: sortedPlayers[0]
        };
    }
    
    return { finished: false };
}

/**
 * Génère un code de partie aléatoire
 * @returns {string} - Code de 6 caractères alphanumériques
 */
function generateGameCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Obtient la classe de couleur pour une carte selon son nombre de têtes
 * @param {number} cardNumber - Numéro de la carte
 * @returns {string} - Classe Tailwind CSS
 */
function getCardColorClass(cardNumber) {
    const heads = calculateHeads(cardNumber);
    if (heads >= 5) return 'bg-red-500';
    if (heads === 3) return 'bg-yellow-500';
    if (heads === 2) return 'bg-blue-500';
    return 'bg-green-500';
}

