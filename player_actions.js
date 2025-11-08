/* ==================== PLAYER ACTIONS - IMPROVED ==================== */

// ✅ AMÉLIORATION : Gestionnaire d'animation qui utilise l'ID unique
const handleAnimation = (anim) => {
    // ✅ Utiliser l'ID unique de Firebase ou générer un ID basé sur le timestamp
    const animationId = anim.uniqueId || `${anim.timestamp}-${anim.type}`;
    
    debugLog('Received animation', { 
        type: anim.type, 
        id: animationId,
        timestamp: anim.timestamp 
    });
    
    // ✅ Passer l'ID unique au système d'animations
    queueAnimation(anim.type, anim, animationId);
    processAnimationQueue();
};

// Gestionnaire de mise à jour du jeu
const handleGameUpdate = async (data, oldStatus) => {
    if (data.status === 'playing' && state.screen !== 'game') {
        debugLog('Switching to game screen (Firebase status playing)');
        state.screen = 'game';
    }

    // CORRECTION: Vérifier que l'hôte déclenche la résolution quand tous ont joué
    if (
        state.game.status === 'playing' &&
        !state.game.turnResolved &&
        oldStatus === 'playing' &&
        state.playerId === state.game.hostId
    ) {
        const activePlayers = state.game.players.filter(p => !p.isSpectator);
        const allPlayed = activePlayers.every(p => hasPlayed(p));
        
        if (allPlayed) {
            debugLog('All players played -> resolveTurn (by host only)');
            await resolveTurn();
        }
    }
};

/* Les autres fonctions restent identiques mais voici les versions complètes pour référence */

const createGame = async () => {
    if (!state.playerName || !state.playerName.trim()) {
        alert('Entrez un pseudo !');
        return;
    }
    if (!database) {
        alert('Base de données non initialisée');
        return;
    }

    const code = generateGameCode();
    const pid = Math.random().toString(36).substring(7);
    state.gameCode = code;
    state.playerId = pid;

    const gameData = {
        code,
        status: 'waiting',
        hostId: pid,
        players: [{
            id: pid,
            name: state.playerName,
            score: 0,
            ready: false,
            hand: [],
            playedCard: null,
            isSpectator: false
        }],
        rows: [],
        round: 0,
        chat: [],
        currentTurn: 0,
        maxRounds: 6,
        turnResolved: false,
        waitingForRowChoice: null,
        pendingCard: null,
        turnHistory: []
    };

    debugLog('Creating game', { code, host: state.playerName });
    await saveGame(gameData);
    
    subscribeToGame(code, handleGameUpdate);
    subscribeToAnimations(code, handleAnimation);
    
    state.screen = 'lobby';
    if (typeof render === 'function') render();
};

const joinAsSpectator = async () => {
    if (!state.playerName || !state.playerName.trim() || !state.joinCode || !state.joinCode.trim()) {
        alert('Entrez pseudo et code !');
        return;
    }
    if (!database) {
        alert('Base de données non initialisée');
        return;
    }

    const normalized = state.joinCode.toUpperCase();
    debugLog('Attempting to join as spectator', { joinCode: normalized });
    
    const game = await loadGame(normalized);
    
    if (!game) {
        alert('Partie introuvable !');
        return;
    }

    const pid = Math.random().toString(36).substring(7);
    game.players.push({
        id: pid,
        name: state.playerName + ' 👁️',
        score: 0,
        ready: true,
        hand: [],
        playedCard: null,
        isSpectator: true
    });
    
    state.gameCode = normalized;
    state.playerId = pid;
    state.isSpectator = true;
    
    debugLog('Joined as spectator', { gameCode: normalized, playerId: pid });
    await saveGame(game);
    
    subscribeToGame(state.gameCode, handleGameUpdate);
    subscribeToAnimations(state.gameCode, handleAnimation);
    
    state.screen = game.status === 'waiting' ? 'lobby' : 'game';
    if (typeof render === 'function') render();
};

const joinGame = async () => {
    if (!state.playerName || !state.playerName.trim() || !state.joinCode || !state.joinCode.trim()) {
        alert('Entrez pseudo et code !');
        return;
    }
    if (!database) {
        alert('Base de données non initialisée');
        return;
    }

    const normalized = state.joinCode.toUpperCase();
    debugLog('Attempting to join', { joinCode: normalized });
    
    const game = await loadGame(normalized);
    
    if (!game) {
        alert('Partie introuvable !');
        return;
    }
    if (game.status !== 'waiting') {
        alert('Partie déjà commencée !');
        return;
    }

    const pid = Math.random().toString(36).substring(7);
    game.players.push({
        id: pid,
        name: state.playerName,
        score: 0,
        ready: false,
        hand: [],
        playedCard: null,
        isSpectator: false
    });
    
    state.gameCode = normalized;
    state.playerId = pid;
    state.isSpectator = false;
    
    debugLog('Joined game', { gameCode: normalized, playerId: pid });
    await saveGame(game);
    
    subscribeToGame(state.gameCode, handleGameUpdate);
    subscribeToAnimations(state.gameCode, handleAnimation);
    
    state.screen = 'lobby';
    if (typeof render === 'function') render();
};

const toggleReady = async () => {
    const p = state.game.players.find(x => x.id === state.playerId);
    if (!p || p.isSpectator) {
        console.warn('toggleReady: player not found or is spectator');
        return;
    }
    p.ready = !p.ready;
    debugLog('Toggle ready', { player: p.name, ready: p.ready });
    await saveGame(state.game);
};

const startGame = async () => {
    if (state.game.hostId !== state.playerId || state.game.players.filter(p => !p.isSpectator).length < 2) {
        console.warn('startGame: unauthorized or not enough players');
        return;
    }
    
    const activePlayers = state.game.players.filter(p => !p.isSpectator);
    if (!activePlayers.every(p => p.ready)) {
        alert('Tous les joueurs doivent être prêts !');
        return;
    }

    debugLog('Starting game', { players: activePlayers.length });
    
    try {
        const deck = shuffleDeck();
        const cardsNeeded = GAME_CONSTANTS.INITIAL_ROWS + (activePlayers.length * GAME_CONSTANTS.CARDS_PER_PLAYER);
        
        if (deck.length < cardsNeeded) {
            throw new Error('Pas assez de cartes');
        }

        state.game.rows = [[deck[0]], [deck[1]], [deck[2]], [deck[3]]];
        deck.splice(0, GAME_CONSTANTS.INITIAL_ROWS);
        
        state.game.players.forEach(p => {
            if (!p.isSpectator) {
                p.hand = deck.splice(0, GAME_CONSTANTS.CARDS_PER_PLAYER).sort((a, b) => a - b);
            } else {
                p.hand = [];
            }
            p.playedCard = null;
            debugLog('Dealt hand', { player: p.name, handSize: p.hand.length, isSpectator: p.isSpectator });
        });

        state.game.status = 'playing';
        state.game.round = 1;
        state.game.currentTurn = 1;
        state.game.turnResolved = false;
        state.game.waitingForRowChoice = null;
        state.game.pendingCard = null;
        state.game.turnHistory = [];

        debugLog('Game started', { rows: state.game.rows.map(r => r[0]) });
        await saveGame(state.game);
        state.screen = 'game';
        if (typeof render === 'function') render();
    } catch (err) {
        debugLog('Error starting game', { error: err.message });
        alert('Erreur au démarrage : ' + err.message);
    }
};

const playCard = async (card) => {
    const p = state.game.players.find(x => x.id === state.playerId);
    if (!p || p.isSpectator) {
        console.warn('playCard: player not found or is spectator');
        return;
    }
    if (hasPlayed(p)) {
        console.warn('playCard: already played');
        return;
    }

    p.playedCard = card;
    p.hand = p.hand.filter(c => c !== card);
    state.selectedCard = null;
    
    // ✅ Ajouter à l'historique (sera masqué jusqu'à ce que tous jouent)
    if (!state.game.turnHistory) state.game.turnHistory = [];
    state.game.turnHistory.push({
        turn: state.game.currentTurn,
        round: state.game.round,
        player: p.name,
        card: card,
        action: 'played',
        timestamp: Date.now()
    });
    
    debugLog('Card played', { player: p.name, card });
    await saveGame(state.game);
    if (typeof render === 'function') render();
};

const analyzeRowChoice = (rowIndex, playerCard) => {
    const row = state.game.rows[rowIndex];
    const penaltyPoints = calculatePenaltyPoints(row);
    
    const otherPlayers = state.game.players.filter(p => 
        !p.isSpectator && 
        p.id !== state.playerId && 
        p.hand && p.hand.length > 0
    );
    
    let strategicAdvice = '';
    let potentialVictims = [];
    
    otherPlayers.forEach(opponent => {
        const minOpponentCard = Math.min(...opponent.hand);
        const maxOpponentCard = Math.max(...opponent.hand);
        
        if (minOpponentCard > playerCard && minOpponentCard < playerCard + 10) {
            potentialVictims.push({
                name: opponent.name,
                reason: `${opponent.name} a probablement des petites cartes (${minOpponentCard}-${maxOpponentCard}) qui pourraient tomber sur cette rangée`
            });
        }
    });
    
    if (potentialVictims.length > 0) {
        strategicAdvice = `🎯 Choix stratégique ! ` + potentialVictims[0].reason;
    } else {
        strategicAdvice = `Cette rangée vous coûtera ${penaltyPoints} points`;
    }
    
    return {
        penaltyPoints,
        strategicAdvice,
        potentialVictims
    };
};

const chooseRow = async (rowIndex) => {
    debugLog('chooseRow called', { rowIndex, playerId: state.playerId });
    
    const game = await loadGame(state.gameCode);
    
    if (!game) {
        debugLog('chooseRow: game not found');
        return;
    }

    if (game.waitingForRowChoice !== state.playerId) {
        debugLog('Not authorized to choose row', { allowed: game.waitingForRowChoice });
        return;
    }

    const p = game.players.find(x => x.id === state.playerId);
    const penaltyRow = [...game.rows[rowIndex]];
    const penaltyPoints = calculatePenaltyPoints(penaltyRow);
    p.score += penaltyPoints;
    
    if (!game.turnHistory) game.turnHistory = [];
    game.turnHistory.push({
        turn: game.currentTurn,
        round: game.round,
        player: p.name,
        card: game.pendingCard,
        action: 'chose_row',
        rowIndex: rowIndex,
        penaltyPoints: penaltyPoints,
        timestamp: Date.now()
    });

    debugLog('Player picked up row', { 
        player: p.name, 
        rowIndex, 
        penaltyPoints,
        cards: penaltyRow
    });

    if (state.enableAnimations) {
        await publishAnimation(state.gameCode, 'PLAYER_CHOSE_ROW', {
            card: game.pendingCard,
            rowIndex,
            playerName: p.name,
            penaltyPoints
        });
        
        await new Promise(r => setTimeout(r, 3000));
    }

    game.rows[rowIndex] = [game.pendingCard];
    p.playedCard = null;

    if (p.score >= GAME_CONSTANTS.SCORE_LIMIT) {
        game.status = 'finished';
        game.finishReason = 'score_limit';
        debugLog('Game finished - player reached 66 points after choice', { player: p.name, score: p.score });
        await saveGame(game);
        return;
    }

    await resolveAllPlays(game);
};

const restartGame = async () => {
    if (!state.game || state.game.hostId !== state.playerId) {
        console.warn('restartGame: unauthorized');
        return;
    }

    debugLog('Restarting game');
    
    state.game.players.forEach(p => {
        if (!p.isSpectator) {
            p.score = 0;
            p.ready = false;
        }
        p.hand = [];
        p.playedCard = null;
    });

    state.game.status = 'waiting';
    state.game.round = 0;
    state.game.currentTurn = 0;
    state.game.rows = [];
    state.game.turnResolved = false;
    state.game.waitingForRowChoice = null;
    state.game.pendingCard = null;
    state.game.finishReason = null;
    state.game.turnHistory = [];

    await saveGame(state.game);
    state.screen = 'lobby';
    if (typeof render === 'function') render();
};

const leaveGame = () => {
    unsubscribeFromGame();
    debugLog('Leaving game', { gameCode: state.gameCode });
    state.screen = 'home';
    state.game = null;
    state.gameCode = '';
    state.playerId = null;
    state.isSpectator = false;
    state.revealedCards = null;
    state.animationsDisabledReason = null;
    if (typeof render === 'function') render();
};

const copyLink = () => {
    const link = window.location.origin + window.location.pathname + '?join=' + state.gameCode;
    navigator.clipboard.writeText(link);
    state.copied = true;
    debugLog('Link copied', { link });
    if (typeof render === 'function') render();
    setTimeout(() => {
        state.copied = false;
        if (typeof render === 'function') render();
    }, 2000);
};