/* ==================== FIREBASE OPERATIONS ==================== */

let gameRef = null;

const saveGame = async (data) => {
    if (!database) {
        console.warn('saveGame aborted: no database');
        return;
    }

    if (data.waitingForRowChoice === undefined) data.waitingForRowChoice = null;
    if (data.pendingCard === undefined) data.pendingCard = null;

    debugLog('Saving game', { gameCode: state.gameCode, status: data.status });
    await database.ref('games/' + state.gameCode).set(data);
    state.game = data;
};

const loadGame = async (code) => {
    if (!database) return null;
    const snap = await database.ref('games/' + code).once('value');
    return snap.val();
};

const subscribeToGame = (code, onUpdate) => {
    if (!database) return;
    if (gameRef) gameRef.off();
    
    gameRef = database.ref('games/' + code);
    gameRef.on('value', async (snap) => {
        const data = snap.val();
        if (!data) {
            console.warn('subscribeToGame: no game data for', code);
            return;
        }

        debugLog('Firebase update received', { status: data.status });
        
        // Si le joueur doit choisir une rangée, on efface les cartes révélées
        // FIX: Ajout de la vérification state.playerId
        if (state.game && state.playerId && data.waitingForRowChoice === state.playerId && state.revealedCards) {
            state.revealedCards = null;
        }

        const oldStatus = state.game ? state.game.status : null;
        state.game = data;

        // Callback pour la logique métier
        if (onUpdate) {
            await onUpdate(data, oldStatus);
        }

        if (typeof render === 'function') render();
    });
};

const unsubscribeFromGame = () => {
    if (gameRef) gameRef.off();
    gameRef = null;
};

const subscribeToAnimations = (code, onAnimation) => {
    if (!database) return;
    const animRef = database.ref('animations/' + code);
    animRef.on('value', (snap) => {
        const anim = snap.val();
        if (anim && anim.timestamp > Date.now() - 5000) {
            if (onAnimation) {
                onAnimation(anim);
            }
        }
    });
};

const publishAnimation = async (code, animationType, data) => {
    if (!database || !state.enableAnimations) return;
    
    await database.ref('animations/' + code).set({
        type: animationType,
        ...data,
        timestamp: Date.now()
    });
};

const createGameData = (code, playerId, playerName) => {
    return {
        code,
        status: 'waiting',
        hostId: playerId,
        players: [{
            id: playerId,
            name: playerName,
            score: 0,
            ready: false,
            hand: [],
            playedCard: null
        }],
        rows: [],
        round: 0,
        chat: [],
        currentTurn: 0,
        maxRounds: GAME_CONSTANTS.MAX_ROUNDS,
        turnResolved: false,
        waitingForRowChoice: null,
        pendingCard: null
    };
};
