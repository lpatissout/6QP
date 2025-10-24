const state = {
    screen: 'home',
    playerName: '',
    playerId: Date.now().toString(36),
    gameCode: '',
    game: null,
    isMobile: false,
    copied: false
};

// Vérifie si la manche a commencé
function canPlayCard(playerId) {
    if (!state.game) return false;
    if (!state.game.roundStarted) return false;
    return state.game.players.some(p => p.id === playerId);
}

// Crée une nouvelle partie
function createGame() {
    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    state.gameCode = code;
    state.game = {
        hostId: state.playerId,
        players: [{id: state.playerId, name: state.playerName, ready: false}],
        roundStarted: false,
        rows: [[],[],[],[]],
        deck: [],
        chat: []
    };
    saveGame(code, state.game);
    state.screen = 'lobby';
    render();
}

// Rejoindre une partie
function joinGame() {
    getGame(state.joinCode, gameData => {
        if (!gameData) { alert("Partie introuvable !"); return; }
        state.gameCode = state.joinCode;
        state.game = gameData;
        if (!state.game.players.some(p=>p.id===state.playerId)) {
            state.game.players.push({id: state.playerId, name: state.playerName, ready: false});
            saveGame(state.gameCode, state.game);
        }
        state.screen = 'lobby';
        render();
    });
}

// Lancer la partie
function startGame() {
    if (state.game.hostId !== state.playerId) return;
    state.game.roundStarted = true;
    // Distribuer les cartes (simplifié)
    state.game.deck = Array.from({length: 104}, (_, i) => i+1).sort(()=>Math.random()-0.5);
    saveGame(state.gameCode, state.game);
    state.screen = 'game';
    render();
}

// Jouer une carte
function playCard(cardNumber) {
    if (!canPlayCard(state.playerId)) return;
    // Ajouter la carte dans la pile et résoudre les rangées...
    console.log(`[DEBUG] Joueur ${state.playerName} joue la carte ${cardNumber}`);
}
