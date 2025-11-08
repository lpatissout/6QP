/* ==================== FIREBASE OPERATIONS - IMPROVED ==================== */

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
        
        if (state.game && state.playerId && data.waitingForRowChoice === state.playerId && state.revealedCards) {
            state.revealedCards = null;
        }

        const oldStatus = state.game ? state.game.status : null;
        state.game = data;

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

// ✅ AMÉLIORATION : Système d'animations avec ID unique
const subscribeToAnimations = (code, onAnimation) => {
    if (!database) return;
    const animRef = database.ref('animations/' + code);
    
    // ✅ Utiliser 'child_added' au lieu de 'value' pour ne recevoir que les nouvelles animations
    animRef.on('child_added', (snap) => {
        const anim = snap.val();
        const animId = snap.key; // ✅ Utiliser la clé Firebase comme ID unique
        
        if (anim && anim.timestamp > Date.now() - 10000) { // Seulement les 10 dernières secondes
            debugLog('New animation received', { type: anim.type, id: animId });
            
            if (onAnimation) {
                onAnimation({
                    ...anim,
                    uniqueId: animId // ✅ Ajouter l'ID unique
                });
            }
        }
    });
    
    // ✅ Nettoyer les vieilles animations (> 30 secondes)
    setInterval(() => {
        cleanupOldAnimations(code);
    }, 30000);
};

// ✅ Nettoyer les animations obsolètes
const cleanupOldAnimations = async (code) => {
    if (!database) return;
    
    const animRef = database.ref('animations/' + code);
    const snap = await animRef.once('value');
    const animations = snap.val();
    
    if (!animations) return;
    
    const now = Date.now();
    const updates = {};
    
    Object.entries(animations).forEach(([key, anim]) => {
        if (anim.timestamp < now - 30000) { // Plus de 30 secondes
            updates[key] = null; // Marquer pour suppression
        }
    });
    
    if (Object.keys(updates).length > 0) {
        await animRef.update(updates);
        debugLog('Cleaned up old animations', { count: Object.keys(updates).length });
    }
};

// ✅ AMÉLIORATION : Publier avec push() pour générer des IDs uniques
const publishAnimation = async (code, animationType, data) => {
    if (!database || !state.enableAnimations) return;
    
    const animRef = database.ref('animations/' + code);
    
    // ✅ Utiliser push() pour créer un ID unique automatiquement
    await animRef.push({
        type: animationType,
        ...data,
        timestamp: Date.now()
    });
    
    debugLog('Animation published', { type: animationType });
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