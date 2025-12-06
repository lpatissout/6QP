// État global de l'application
const AppState = {
    // Informations du joueur local
    player: {
        id: null,
        name: null
    },
    
    // Informations de la partie
    game: {
        code: null,
        status: null,
        hostId: null,
        round: 1,
        turn: 1,
        maxRounds: GAME_CONSTANTS.MAX_ROUNDS,
        players: [],
        rows: [[], [], [], []],
        waitingForChoice: null,
        pendingCard: null,
        deck: []
    },
    
    // Références Firebase
    firebaseRefs: {
        gameRef: null,
        gameListener: null
    },
    
    // État UI
    currentScreen: 'home',
    selectedCard: null,
    isReady: false
};

// Helpers pour l'état
const StateHelpers = {
    // Obtenir le joueur local
    getLocalPlayer() {
        return AppState.game.players.find(p => p.id === AppState.player.id);
    },
    
    // Vérifier si le joueur local est l'hôte
    isHost() {
        return AppState.game.hostId === AppState.player.id;
    },
    
    // Vérifier si tous les joueurs sont prêts
    allPlayersReady() {
        return AppState.game.players.length >= 2 && 
               AppState.game.players.every(p => p.ready);
    },
    
    // Obtenir l'index de la rangée avec la dernière carte la plus proche mais inférieure
    findRowForCard(cardValue) {
        const rows = AppState.game.rows;
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
    },
    
    // Vérifier si une carte est trop petite pour toutes les rangées
    isCardTooSmall(cardValue) {
        const rows = AppState.game.rows;
        return rows.every(row => {
            if (row.length === 0) return false;
            return cardValue < row[row.length - 1];
        });
    },
    
    // Réinitialiser l'état pour une nouvelle partie
    reset() {
        AppState.game = {
            code: null,
            status: null,
            hostId: null,
            round: 1,
            turn: 1,
            maxRounds: GAME_CONSTANTS.MAX_ROUNDS,
            players: [],
            rows: [[], [], [], []],
            waitingForChoice: null,
            pendingCard: null,
            deck: []
        };
        AppState.currentScreen = 'home';
        AppState.selectedCard = null;
        AppState.isReady = false;
    }
};

