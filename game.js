// État global
const state = {
    screen: 'home',
    gameCode: '',
    playerName: '',
    joinCode: '',
    game: null,
    playerId: null,
    selectedCard: null,
    showDebug: false,
    debugLogs: [],
    isMobile: /Mobi|Android/i.test(navigator.userAgent)
};

// Logger debug
const debugLog = (msg, data=null) => {
    const time = new Date().toLocaleTimeString();
    state.debugLogs.push({ time, msg, data });
    if (!state.isMobile) console.log(`[${time}] ${msg}`, data || '');
};

// Vérifie si le joueur peut jouer
const canPlayCard = () => {
    if (!state.game) return false;
    const p = state.game.players.find(x => x.id === state.playerId);
    if (!p) return false;
    if (state.game.status !== 'playing') return false;
    if (p.playedCard) return false; // déjà joué
    if (state.game.waitingForRowChoice) return false; // attente rangée
    return true;
};

// Jouer une carte
const playCard = async (card) => {
    if (!canPlayCard()) return;
    const p = state.game.players.find(x => x.id === state.playerId);
    p.playedCard = card;
    p.hand = p.hand.filter(c => c !== card);
    await saveGame(state.game);
    state.selectedCard = null;
    render();
};

// Crée un deck
const shuffleDeck = () => {
    const deck = Array.from({ length: 104 }, (_, i) => i + 1);
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
};

// Calcul des têtes de vache
const calculateHeads = (card) => {
    if (card === 55) return 7;
    if (card % 11 === 0) return 5;
    if (card % 10 === 0) return 3;
    if (card % 5 === 0) return 2;
    return 1;
};

// Couleur des cartes
const getCardColor = (card) => {
    if (card <= 26) return 'bg-blue-400';
    if (card <= 52) return 'bg-green-400';
    if (card <= 78) return 'bg-yellow-400';
    return 'bg-red-400';
};
