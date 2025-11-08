/* ==================== STATE MANAGEMENT ==================== */

const state = {
    screen: 'home',
    gameCode: '',
    playerName: '',
    joinCode: '',
    game: null,
    playerId: null,
    selectedCard: null,
    copied: false,
    debugLogs: [],
    showDebug: false,
    isMobile: /Mobi|Android/i.test(navigator.userAgent),
    invitePending: false,
    animationQueue: [],
    isAnimating: false,
    enableAnimations: true,
    animationSpeed: 800,
    revealedCards: null,
    animationsDisabledReason: null,
    isSpectator: false
};

/* ==================== PURE HELPERS ==================== */

const debugLog = (msg, data = null) => {
    const time = new Date().toLocaleTimeString();
    state.debugLogs.push({ time, msg, data: data ? JSON.stringify(data) : null });
    console.log(`[${time}] ${msg}`, data || '');
    if (state.debugLogs.length > 100) state.debugLogs.shift();
};

const generateGameCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

const calculateHeads = (card) => {
    if (card === 55) return 7;
    if (card % 11 === 0) return 5;
    if (card % 10 === 0) return 3;
    if (card % 5 === 0) return 2;
    return 1;
};

// ✅ CORRECTION : Couleur basée sur le nombre de têtes, pas sur la valeur
const getCardColor = (card) => {
    const heads = calculateHeads(card);
    if (heads === 1) return 'bg-green-500';      // 1 tête = vert
    if (heads === 2) return 'bg-blue-500';       // 2 têtes = bleu
    if (heads === 3) return 'bg-yellow-500';     // 3 têtes = jaune
    return 'bg-red-500';                         // 5+ têtes = rouge
};

const shuffleDeck = () => {
    const deck = Array.from({ length: GAME_CONSTANTS.TOTAL_CARDS }, (_, i) => i + 1);
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
};

const hasPlayed = (p) => Number.isInteger(p && p.playedCard) && p.playedCard > 0;

const escapeHtml = (str) => {
    if (str === null || typeof str === 'undefined') return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

// Fonctions de jeu partagées (utilisées aussi dans game.js)
const calculatePenaltyPoints = (cards) => {
    return cards.reduce((sum, card) => sum + calculateHeads(card), 0);
};

const findValidRows = (card, rows) => {
    return rows
        .map((r, i) => ({ i, last: r[r.length - 1], diff: card - r[r.length - 1] }))
        .filter(x => x.diff > 0);
};

const findBestRow = (validRows) => {
    return validRows.reduce((min, cur) => cur.diff < min.diff ? cur : min);
};
