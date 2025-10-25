/* ==================== STATE ==================== */
let state = {
    screen: 'home',
    gameCode: '',
    playerName: '',
    joinCode: '',
    game: null,
    playerId: null,
    selectedCard: null,
    chatMessage: '',
    showChat: false,
    copied: false,
    debugLogs: [],
    showDebug: false,
    isMobile: /Mobi|Android/i.test(navigator.userAgent),
    invitePending: false,
    // Système d'animations
    animationQueue: [],
    isAnimating: false,
    enableAnimations: true,
    animationSpeed: 800,
    revealedCards: null // Pour stocker les cartes révélées
};

let gameRef = null;

/* ==================== HELPERS ==================== */
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

const getCardColor = (card) => {
    if (card <= 26) return 'bg-blue-400';
    if (card <= 52) return 'bg-green-400';
    if (card <= 78) return 'bg-yellow-400';
    return 'bg-red-400';
};

const shuffleDeck = () => {
    const deck = Array.from({ length: 104 }, (_, i) => i + 1);
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

/* ==================== ANIMATION SYSTEM ==================== */

const queueAnimation = (type, data) => {
    if (!state.enableAnimations) return;
    state.animationQueue.push({ type, data, id: Date.now() + Math.random() });
    debugLog('Animation queued', { type, queueLength: state.animationQueue.length });
};

const processAnimationQueue = async () => {
    if (!state.enableAnimations) {
        state.animationQueue = [];
        return;
    }

    if (state.isAnimating || state.animationQueue.length === 0) return;

    state.isAnimating = true;

    while (state.animationQueue.length > 0) {
        const anim = state.animationQueue.shift();
        await playAnimation(anim);
    }

    state.isAnimating = false;
    debugLog('Animation queue completed');
};

const playAnimation = (anim) => {
    return new Promise((resolve) => {
        debugLog('Playing animation', { type: anim.type });

        switch (anim.type) {
            case 'REVEAL_CARDS':
                animateRevealCards(anim.data, resolve);
                break;
            case 'CARDS_TO_ROWS':
                animateCardsToRows(anim.data, resolve);
                break;
            case 'ROW_PENALTY':
                animateRowPenalty(anim.data, resolve);
                break;
            case 'WAITING_FOR_CHOICE':
                animateWaitingForChoice(anim.data, resolve);
                break;
            case 'PLAYER_CHOSE_ROW':
                animatePlayerChoseRow(anim.data, resolve);
                break;
            default:
                debugLog('Unknown animation type, skipping', anim.type);
                resolve();
        }
    });
};

/* ==================== NOUVELLES ANIMATIONS ==================== */

// 🎬 Révélation des cartes avec fond noir transparent
const animateRevealCards = (data, callback) => {
    const { plays } = data;
    
    // Stocke les cartes révélées dans le state
    state.revealedCards = plays;
    
    // Force le re-render pour afficher l'overlay
    if (typeof render === 'function') render();
    
    // Attend 2 secondes avant de passer à la suite
    setTimeout(() => {
        callback();
    }, 2000);
};

// 🎯 Animation : attente du choix d'un joueur
const animateWaitingForChoice = (data, callback) => {
    const { playerName } = data;
    
    // Les cartes restent affichées, on attend juste
    debugLog('Waiting for player choice', { playerName });
    
    // Le callback est appelé immédiatement car c'est juste un état d'attente
    callback();
};

// 🎯 Animation : le joueur a choisi sa rangée
const animatePlayerChoseRow = (data, callback) => {
    const { card, rowIndex, playerName, penaltyPoints } = data;
    
    // Efface les cartes révélées sauf celle du joueur qui choisit
    state.revealedCards = state.revealedCards.filter(p => p.card === card);
    
    if (typeof render === 'function') render();
    
    // Popup de pénalité
    const popup = document.createElement('div');
    popup.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white px-8 py-6 rounded-xl shadow-2xl z-[10001] font-bold text-lg bounce-in';
    popup.innerHTML = `
        <div class="text-center">
            <div class="text-3xl mb-2">⚠️ ${escapeHtml(playerName)} ramasse !</div>
            <div class="text-4xl mt-3 font-black">+${penaltyPoints} 🐮</div>
        </div>
    `;
    document.body.appendChild(popup);
    
    setTimeout(() => {
        popup.style.opacity = '0';
        setTimeout(() => popup.remove(), 500);
        
        // Fondu de l'overlay
        const overlay = document.getElementById('reveal-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                // Animation de la carte vers la rangée
                animateCardToRowDirect(card, rowIndex, playerName, () => {
                    state.revealedCards = null;
                    if (typeof render === 'function') render();
                    callback();
                });
            }, 500);
        } else {
            callback();
        }
    }, 2000);
};

// 💫 Animation : toutes les cartes vont vers leurs rangées
const animateCardsToRows = (data, callback) => {
    const { plays } = data;
    
    // Fondu de l'overlay noir
    const overlay = document.getElementById('reveal-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
    }
    
    setTimeout(() => {
        // Lance l'animation de toutes les cartes en parallèle
        let completed = 0;
        const total = plays.length;
        
        plays.forEach(play => {
            animateCardToRowDirect(play.card, play.rowIndex, play.playerName, () => {
                completed++;
                if (completed === total) {
                    state.revealedCards = null;
                    if (typeof render === 'function') render();
                    callback();
                }
            });
        });
    }, 500);
};

// 💫 Animation directe : carte qui vole jusqu'à la rangée
const animateCardToRowDirect = (card, rowIndex, playerName, callback) => {
    const revealedCardEl = document.querySelector(`[data-revealed-card="${card}"]`);
    if (!revealedCardEl) {
        callback();
        return;
    }
    
    const cardRect = revealedCardEl.getBoundingClientRect();
    const targetRow = document.getElementById(`row-${rowIndex}`);
    
    if (!targetRow) {
        callback();
        return;
    }
    
    // Clone la carte pour l'animation
    const flyingCard = revealedCardEl.cloneNode(true);
    flyingCard.style.cssText = `
        position: fixed;
        left: ${cardRect.left}px;
        top: ${cardRect.top}px;
        width: ${cardRect.width}px;
        height: ${cardRect.height}px;
        z-index: 10002;
        transition: all 1s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
    `;
    document.body.appendChild(flyingCard);
    
    // Cache la carte originale
    revealedCardEl.style.opacity = '0';
    
    setTimeout(() => {
        const rowCards = targetRow.querySelectorAll('.w-12');
        const rowRect = targetRow.getBoundingClientRect();
        const targetX = rowRect.left + 100 + rowCards.length * 50;
        const targetY = rowRect.top + rowRect.height / 2 - 32;
        
        flyingCard.style.left = targetX + 'px';
        flyingCard.style.top = targetY + 'px';
        flyingCard.style.width = '48px';
        flyingCard.style.height = '64px';
        
        setTimeout(() => {
            flyingCard.remove();
            if (typeof render === 'function') render();
            callback();
        }, 1000);
    }, 50);
};

// 🧲 Animation : une rangée est ramassée
const animateRowPenalty = (data, callback) => {
    const { rowIndex, playerName, penaltyPoints } = data;
    const targetRow = document.getElementById(`row-${rowIndex}`);
    if (!targetRow) return callback();

    const cards = targetRow.querySelectorAll('div[class*="w-12"]');
    const overlay = document.getElementById('flying-cards-overlay');

    const popup = document.createElement('div');
    popup.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white px-8 py-6 rounded-xl shadow-2xl z-[10000] font-bold text-lg bounce-in';
    popup.innerHTML = `
        <div class="text-center">
            <div class="text-3xl mb-2">⚠️ ${escapeHtml(playerName)} ramasse !</div>
            <div class="text-4xl mt-3 font-black">+${penaltyPoints} 🐮</div>
        </div>
    `;
    document.body.appendChild(popup);

    cards.forEach((card, i) => {
        const clone = card.cloneNode(true);
        const cardRect = card.getBoundingClientRect();
        clone.style.cssText = `
            position: fixed;
            left: ${cardRect.left}px;
            top: ${cardRect.top}px;
            width: ${cardRect.width}px;
            height: ${cardRect.height}px;
            z-index: 9999;
            transition: all 800ms ease-in-out;
        `;
        overlay.appendChild(clone);

        setTimeout(() => {
            clone.style.transform = `translateY(${window.innerHeight / 2 - cardRect.top + 200}px) scale(0.5) rotate(${(i - 2) * 10}deg)`;
            clone.style.opacity = '0';
        }, i * 100);

        setTimeout(() => clone.remove(), 1500 + i * 100);
    });

    setTimeout(() => {
        popup.style.opacity = '0';
        setTimeout(() => popup.remove(), 500);
        if (typeof render === 'function') render();
        callback();
    }, 2000);
};

/* ==================== FIREBASE OPERATIONS ==================== */
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

/* ==================== SUBSCRIPTION TO GAME UPDATES ==================== */
const subscribeToGame = (code) => {
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
        const oldStatus = state.game ? state.game.status : null;
        state.game = data;

        if (data.status === 'playing' && state.screen !== 'game') {
            debugLog('Switching to game screen (Firebase status playing)');
            state.screen = 'game';
            if (typeof render === 'function') render();
        }

        if (data.status === 'playing' && !state.subscribedAnimations) {
            subscribeToAnimations(code);
            state.subscribedAnimations = true;
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

        if (typeof render === 'function') render();
    });
};

/* ==================== GLOBAL ANIMATIONS CHANNEL ==================== */
const subscribeToAnimations = (code) => {
    if (!database) return;
    const animRef = database.ref('animations/' + code);
    animRef.on('value', (snap) => {
        const anim = snap.val();
        if (anim && anim.timestamp > Date.now() - 5000) {
            queueAnimation(anim.type, anim);
            processAnimationQueue();
        }
    });
};

/* ==================== GAME ACTIONS ==================== */
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
    subscribeToGame(code);
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
    
    const snap = await database.ref('games/' + normalized).once('value');
    const game = snap.val();
    
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
    subscribeToGame(state.gameCode);
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
        const deck = shuffleDeck();
        const cardsNeeded = 4 + (state.game.players.length * 10);
        
        if (deck.length < cardsNeeded) {
            throw new Error('Pas assez de cartes');
        }

        state.game.rows = [[deck[0]], [deck[1]], [deck[2]], [deck[3]]];
        deck.splice(0, 4);
        
        state.game.players.forEach(p => {
            p.hand = deck.splice(0, 10).sort((a, b) => a - b);
            p.playedCard = null;
            debugLog('Dealt hand', { player: p.name, handSize: p.hand.length });
        });

        state.game.status = 'playing';
        state.game.round = 1;
        state.game.currentTurn = 1;
        state.game.turnResolved = false;
        state.game.waitingForRowChoice = null;
        state.game.pendingCard = null;

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

/* ==================== TOUR DE JEU ==================== */
const resolveTurn = async () => {
    debugLog('resolveTurn called');
    
    const snap = await database.ref('games/' + state.gameCode).once('value');
    const game = snap.val();
    
    if (!game) {
        console.warn('resolveTurn: no game');
        return;
    }

    game.turnResolved = true;

    const plays = game.players
        .map(p => ({ pid: p.id, card: p.playedCard, name: p.name }))
        .filter(x => Number.isInteger(x.card))
        .sort((a, b) => a.card - b.card);

    debugLog('Resolving plays', { plays: plays.map(p => p.card) });

    // Étape 1 : révéler les cartes
    if (state.enableAnimations && plays.length > 0) {
        await database.ref('animations/' + state.gameCode).set({
            type: 'REVEAL_CARDS',
            plays,
            timestamp: Date.now()
        });
    }

    await new Promise(r => setTimeout(r, 2500));

    // Étape 2 : vérifier si quelqu'un doit choisir une rangée
    for (const play of plays) {
        const validRows = game.rows
            .map((r, i) => ({ i, last: r[r.length - 1], diff: play.card - r[r.length - 1] }))
            .filter(x => x.diff > 0);

        if (!validRows.length) {
            game.waitingForRowChoice = play.pid;
            game.pendingCard = play.card;
            game.turnResolved = false;

            await database.ref('animations/' + state.gameCode).set({
                type: 'WAITING_FOR_CHOICE',
                playerName: play.name,
                timestamp: Date.now()
            });

            await saveGame(game);
            debugLog('Player must choose row', { playerId: play.pid, card: play.card });
            return;
        }
    }

    // Étape 3 : toutes les cartes peuvent être placées
    await resolveAllPlays(game);
};

const resolveAllPlays = async (game) => {
    const plays = game.players
        .filter(p => Number.isInteger(p.playedCard))
        .map(p => ({ pid: p.id, card: p.playedCard, name: p.name, playerName: p.name }))
        .sort((a, b) => a.card - b.card);

    debugLog('resolveAllPlays', { cards: plays.map(p => p.card) });

    // Calculer où chaque carte va aller
    const playsWithRows = [];
    for (const play of plays) {
        const validRows = game.rows
            .map((r, i) => ({ i, last: r[r.length - 1], diff: play.card - r[r.length - 1] }))
            .filter(x => x.diff > 0);

        if (validRows.length) {
            const chosenRow = validRows.reduce((min, cur) => cur.diff < min.diff ? cur : min);
            playsWithRows.push({ ...play, rowIndex: chosenRow.i });
        }
    }

    // Lancer l'animation globale
    if (state.enableAnimations && playsWithRows.length > 0) {
        await database.ref('animations/' + state.gameCode).set({
            type: 'CARDS_TO_ROWS',
            plays: playsWithRows,
            timestamp: Date.now()
        });
        
        await new Promise(r => setTimeout(r, 2000));
    }

    // Appliquer les changements dans la logique
    for (const play of plays) {
        const p = game.players.find(x => x.id === play.pid);
        const validRows = game.rows
            .map((r, i) => ({ i, last: r[r.length - 1], diff: play.card - r[r.length - 1] }))
            .filter(x => x.diff > 0);

        if (validRows.length) {
            const chosenRow = validRows.reduce((min, cur) => cur.diff < min.diff ? cur : min);
            
            if (game.rows[chosenRow.i].length === 5) {
                const penaltyRow = game.rows[chosenRow.i];
                const penaltyPoints = penaltyRow.reduce((s, c) => s + calculateHeads(c), 0);
                p.score += penaltyPoints;
                
                if (state.enableAnimations) {
                    queueAnimation('ROW_PENALTY', {
                        rowIndex: chosenRow.i,
                        playerName: p.name,
                        penaltyPoints
                    });
                    await processAnimationQueue();
                }
                
                game.rows[chosenRow.i] = [play.card];
            } else {
                game.rows[chosenRow.i].push(play.card);
            }
        }

        p.playedCard = null;
    }

    game.currentTurn++;
    
    if (game.currentTurn > 10) {
        game.round++;
        
        if (game.round > game.maxRounds) {
            game.status = 'finished';
            debugLog('Game finished');
        } else {
            const deck = shuffleDeck();
            game.rows = [[deck[0]], [deck[1]], [deck[2]], [deck[3]]];
            deck.splice(0, 4);
            game.players.forEach(p => {
                p.hand = deck.splice(0, 10).sort((a, b) => a - b);
                p.playedCard = null;
            });
            game.currentTurn = 1;
            debugLog('New round started', { round: game.round });
        }
    }

    game.turnResolved = false;
    game.waitingForRowChoice = null;
    game.pendingCard = null;
    await saveGame(game);
};

const chooseRow = async (rowIndex) => {
    debugLog('chooseRow called', { rowIndex, playerId: state.playerId });
    
    const snap = await database.ref('games/' + state.gameCode).once('value');
    const game = snap.val();
    
    if (!game) {
        debugLog('chooseRow: game not found');
        return;
    }

    if (game.waitingForRowChoice !== state.playerId) {
        debugLog('Not authorized to choose row', { allowed: game.waitingForRowChoice });
        return;
    }

    const p = game.players.find(x => x.id === state.playerId);
    const penaltyRow = game.rows[rowIndex];
    const penaltyPoints = penaltyRow.reduce((s, c) => s + calculateHeads(c), 0);
    p.score += penaltyPoints;

    debugLog('Player picked up row', { player: p.name, rowIndex, penaltyPoints });

    // Animation de choix de rangée
    if (state.enableAnimations) {
        await database.ref('animations/' + state.gameCode).set({
            type: 'PLAYER_CHOSE_ROW',
            card: game.pendingCard,
            rowIndex,
            playerName: p.name,
            penaltyPoints,
            timestamp: Date.now()
        });
        
        await new Promise(r => setTimeout(r, 3000));
    }

    game.rows[rowIndex] = [game.pendingCard];
    p.playedCard = null;

    await resolveAllPlays(game);
};

const leaveGame = () => {
    if (gameRef) gameRef.off();
    debugLog('Leaving game', { gameCode: state.gameCode });
    state.screen = 'home';
    state.game = null;
    state.gameCode = '';
    state.playerId = null;
    state.revealedCards = null;
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
