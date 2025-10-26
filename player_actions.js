/* ==================== PLAYER ACTIONS ==================== */

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
            playedCard: null
        }],
        rows: [],
        round: 0,
        chat: [],
        currentTurn: 0,
        maxRounds: 6,
        turnResolved: false,
        waitingForRowChoice: null,
        pendingCard: null
    };

    debugLog('Creating game', { code, host: state.playerName });
    await saveGame(gameData);
    
    subscribeToGame(code, handleGameUpdate);
    subscribeToAnimations(code, handleAnimation);
    
    state.screen = 'lobby';
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
        playedCard: null
    });
    
    state.gameCode = normalized;
    state.playerId = pid;
    
    debugLog('Joined game', { gameCode: normalized, playerId: pid });
    await saveGame(game);
    
    subscribeToGame(state.gameCode, handleGameUpdate);
    subscribeToAnimations(state.gameCode, handleAnimation);
    
    state.screen = 'lobby';
    if (typeof render === 'function') render();
};

const toggleReady = async () => {
    const p = state.game.players.find(x => x.id === state.playerId);
    if (!p) {
        console.warn('toggleReady: player not found');
        return;
    }
    p.ready = !p.ready;
    debugLog('Toggle ready', { player: p.name, ready: p.ready });
    await saveGame(state.game);
};

const startGame = async () => {
    if (state.game.hostId !== state.playerId || state.game.players.length < 2) {
        console.warn('startGame: unauthorized or not enough players');
        return;
    }
    if (!state.game.players.every(p => p.ready)) {
        alert('Tous les joueurs doivent être prêts !');
        return;
    }

    debugLog('Starting game', { players: state.game.players.length });
    
    try {
        const game = initializeGameRound(state.game);
        debugLog('Game started', { rows: game.rows.map(r => r[0]) });
        await saveGame(game);
        state.screen = 'game';
        if (typeof render === 'function') render();
    } catch (err) {
        debugLog('Error starting game', { error: err.message });
        alert('Erreur au démarrage : ' + err.message);
    }
};

const playCard = async (card) => {
    const p = state.game.players.find(x => x.id === state.playerId);
    if (!p) {
        console.warn('playCard: player not found');
        return;
    }
    if (hasPlayed(p)) {
        console.warn('playCard: already played');
        return;
    }

    p.playedCard = card;
    p.hand = p.hand.filter(c => c !== card);
    state.selectedCard = null;
    
    debugLog('Card played', { player: p.name, card });
    await saveGame(state.game);
    if (typeof render === 'function') render();
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

    debugLog('Player picked up row', { 
        player: p.name, 
        rowIndex, 
        penaltyPoints,
        cards: penaltyRow
    });

    // Animation de pénalité
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

    // Vérifier si le joueur a atteint 66 points
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
    
    // Réinitialiser les scores
    state.game.players.forEach(p => {
        p.score = 0;
        p.hand = [];
        p.playedCard = null;
        p.ready = false;
    });

    state.game.status = 'waiting';
    state.game.round = 0;
    state.game.currentTurn = 0;
    state.game.rows = [];
    state.game.turnResolved = false;
    state.game.waitingForRowChoice = null;
    state.game.pendingCard = null;
    state.game.finishReason = null;

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

// Gestionnaire de mise à jour du jeu
const handleGameUpdate = async (data, oldStatus) => {
    if (data.status === 'playing' && state.screen !== 'game') {
        debugLog('Switching to game screen (Firebase status playing)');
        state.screen = 'game';
    }

    if (
        state.game.status === 'playing' &&
        !state.game.turnResolved &&
        oldStatus === 'playing' &&
        state.playerId === state.game.hostId
    ) {
        const allPlayed = state.game.players.every(p => hasPlayed(p));
        if (allPlayed) {
            debugLog('All players played -> resolveTurn (by host only)');
            await resolveTurn();
        }
    }
};

// Gestionnaire d'animation
const handleAnimation = (anim) => {
    queueAnimation(anim.type, anim);
    processAnimationQueue();
};