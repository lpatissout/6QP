/* ==================== TOUT-EN-UN : game.js ==================== */
/* Ce fichier contient TOUTE la logique car tu n'as pas de fichiers séparés */

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
    animationQueue: [],
    isAnimating: false,
    enableAnimations: true,
    animationSpeed: 800,
    revealedCards: null,
    animationsDisabledReason: null
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
    if (!state.enableAnimations) {
        state.animationsDisabledReason = 'Animations désactivées par l\'utilisateur';
        debugLog('Animation skipped - disabled', { type });
        return;
    }
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
            case 'REVEAL_CARDS': animateRevealCards(anim.data, resolve); break;
            case 'FADE_OVERLAY': animateFadeOverlay(anim.data, resolve); break;
            case 'CARD_TO_ROW': animateCardToRow(anim.data, resolve); break;
            case 'SIXTH_CARD_PENALTY': animate6thCardPenalty(anim.data, resolve); break;
            case 'WAITING_FOR_CHOICE': animateWaitingForChoice(anim.data, resolve); break;
            case 'PLAYER_CHOSE_ROW': animatePlayerChoseRow(anim.data, resolve); break;
            default: debugLog('Unknown animation type, skipping', anim.type); resolve();
        }
    });
};

const animateRevealCards = (data, callback) => {
    const { plays } = data;
    if (!plays || plays.length === 0) { callback(); return; }
    state.revealedCards = plays;
    if (typeof render === 'function') render();
    setTimeout(() => callback(), 2000);
};

const animateWaitingForChoice = (data, callback) => {
    const { playerName } = data;
    debugLog('Waiting for player choice', { playerName, isMe: state.game.waitingForRowChoice === state.playerId });
    if (state.game.waitingForRowChoice === state.playerId) {
        setTimeout(() => {
            debugLog('Clearing revealed cards for player who must choose');
            state.revealedCards = null;
            if (typeof render === 'function') render();
            callback();
        }, 100);
    } else {
        debugLog('Keeping revealed cards for waiting players');
        callback();
    }
};

const animatePlayerChoseRow = (data, callback) => {
    const { card, rowIndex, playerName, penaltyPoints } = data;
    if (state.revealedCards && state.revealedCards.length > 0) {
        state.revealedCards = state.revealedCards.filter(p => p.card === card);
    }
    if (typeof render === 'function') render();
    const popup = document.createElement('div');
    popup.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white px-8 py-6 rounded-xl shadow-2xl z-[10001] font-bold text-lg bounce-in';
    popup.innerHTML = `<div class="text-center"><div class="text-3xl mb-2">⚠️ ${escapeHtml(playerName)} ramasse !</div><div class="text-4xl mt-3 font-black">+${penaltyPoints} 🐮</div></div>`;
    document.body.appendChild(popup);
    setTimeout(() => {
        popup.style.opacity = '0';
        setTimeout(() => popup.remove(), 500);
        const overlay = document.getElementById('reveal-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                state.revealedCards = null;
                if (typeof render === 'function') render();
                callback();
            }, 500);
        } else {
            state.revealedCards = null;
            if (typeof render === 'function') render();
            callback();
        }
    }, 2000);
};

const animateFadeOverlay = (data, callback) => {
    debugLog('Fading overlay');
    const overlay = document.getElementById('reveal-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            state.revealedCards = null;
            if (typeof render === 'function') render();
            callback();
        }, 500);
    } else {
        state.revealedCards = null;
        if (typeof render === 'function') render();
        callback();
    }
};

const animateCardToRow = (data, callback) => {
    const { card, rowIndex, playerName, is6thCard } = data;
    debugLog('Animating card to row', { card, rowIndex, playerName, is6thCard });
    const targetRow = document.getElementById(`row-${rowIndex}`);
    if (!targetRow) { debugLog('Target row not found', { rowIndex }); callback(); return; }
    const overlay = document.getElementById('flying-cards-overlay');
    const color = getCardColor(card);
    const flyingCard = document.createElement('div');
    flyingCard.className = `${color} text-white rounded-lg shadow-2xl flex flex-col items-center justify-center font-bold`;
    flyingCard.style.cssText = `position: fixed; width: 80px; height: 112px; z-index: 9999; pointer-events: none; transform-origin: center center; opacity: 0; transform: scale(0.5) rotate(-10deg); transition: all ${state.animationSpeed}ms cubic-bezier(0.4, 0.0, 0.2, 1);`;
    flyingCard.innerHTML = `<span class="text-3xl">${card}</span>`;
    overlay.appendChild(flyingCard);
    const startX = window.innerWidth / 2 - 40;
    const startY = window.innerHeight / 2 - 56;
    flyingCard.style.left = startX + 'px';
    flyingCard.style.top = startY + 'px';
    requestAnimationFrame(() => {
        flyingCard.style.opacity = '1';
        flyingCard.style.transform = 'scale(1.1) rotate(0deg)';
    });
    setTimeout(() => {
        const rowCards = targetRow.querySelectorAll('.w-12');
        const rectRow = targetRow.getBoundingClientRect();
        const targetX = is6thCard ? rectRow.left + 100 : rectRow.left + 100 + rowCards.length * 50;
        const targetY = rectRow.top + rectRow.height / 2 - 32;
        flyingCard.style.left = targetX + 'px';
        flyingCard.style.top = targetY + 'px';
        flyingCard.style.width = '48px';
        flyingCard.style.height = '64px';
        flyingCard.style.transform = 'scale(1) rotate(0deg)';
        setTimeout(() => {
            flyingCard.style.opacity = '0';
            flyingCard.style.transform = 'scale(0.8)';
            setTimeout(() => {
                flyingCard.remove();
                if (typeof render === 'function') render();
                callback();
            }, 300);
        }, state.animationSpeed);
    }, 300);
};

const animate6thCardPenalty = (data, callback) => {
    const { card, rowIndex, playerName, penaltyPoints } = data;
    debugLog('Animating 6th card penalty', { card, rowIndex, playerName, penaltyPoints });
    const targetRow = document.getElementById(`row-${rowIndex}`);
    if (!targetRow) { callback(); return; }
    const cards = targetRow.querySelectorAll('div[class*="w-12"]');
    const overlay = document.getElementById('flying-cards-overlay');
    cards.forEach((cardEl, i) => {
        const clone = cardEl.cloneNode(true);
        const cardRect = cardEl.getBoundingClientRect();
        clone.style.cssText = `position: fixed; left: ${cardRect.left}px; top: ${cardRect.top}px; width: ${cardRect.width}px; height: ${cardRect.height}px; z-index: 9998; transition: all 600ms ease-in-out;`;
        overlay.appendChild(clone);
        setTimeout(() => {
            const rowRect = targetRow.getBoundingClientRect();
            clone.style.left = (rowRect.left + 80) + 'px';
            clone.style.transform = `translateX(${i * 5}px)`;
        }, 100);
        setTimeout(() => {
            clone.style.opacity = '0';
            clone.style.transform = `translateX(${i * 5}px) scale(0.5)`;
        }, 800);
        setTimeout(() => clone.remove(), 1400);
    });
    setTimeout(() => {
        const popup = document.createElement('div');
        popup.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white px-8 py-6 rounded-xl shadow-2xl z-[10001] font-bold text-lg bounce-in';
        popup.innerHTML = `<div class="text-center"><div class="text-3xl mb-2">⚠️ ${escapeHtml(playerName)} ramasse !</div><div class="text-4xl mt-3 font-black">+${penaltyPoints} 🐮</div></div>`;
        document.body.appendChild(popup);
        setTimeout(() => {
            popup.style.opacity = '0';
            setTimeout(() => popup.remove(), 500);
            if (typeof render === 'function') render();
            callback();
        }, 2000);
    }, 1500);
};

/* ==================== FIREBASE ==================== */
const saveGame = async (data) => {
    if (!database) { console.warn('saveGame aborted: no database'); return; }
    if (data.waitingForRowChoice === undefined) data.waitingForRowChoice = null;
    if (data.pendingCard === undefined) data.pendingCard = null;
    debugLog('Saving game', { gameCode: state.gameCode, status: data.status });
    await database.ref('games/' + state.gameCode).set(data);
    state.game = data;
};

const subscribeToGame = (code) => {
    if (!database) return;
    if (gameRef) gameRef.off();
    gameRef = database.ref('games/' + code);
    gameRef.on('value', async (snap) => {
        const data = snap.val();
        if (!data) { console.warn('subscribeToGame: no game data for', code); return; }
        debugLog('Firebase update received', { status: data.status });
        const oldStatus = state.game ? state.game.status : null;
        state.game = data;
        if (state.game.waitingForRowChoice === state.playerId && state.revealedCards) {
            state.revealedCards = null;
        }
        if (data.status === 'playing' && state.screen !== 'game') {
            debugLog('Switching to game screen (Firebase status playing)');
            state.screen = 'game';
            if (typeof render === 'function') render();
        }
        if (data.status === 'playing' && !state.subscribedAnimations) {
            subscribeToAnimations(code);
            state.subscribedAnimations = true;
        }
        if (state.game.status === 'playing' && !state.game.turnResolved && oldStatus === 'playing' && state.playerId === state.game.hostId) {
            const allPlayed = state.game.players.every(p => hasPlayed(p));
            if (allPlayed) {
                debugLog('All players played -> resolveTurn (by host only)');
                await resolveTurn();
            }
        }
        if (typeof render === 'function') render();
    });
};

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
    if (!state.playerName || !state.playerName.trim()) { alert('Entrez un pseudo !'); return; }
    if (!database) { alert('Base de données non initialisée'); return; }
    const code = generateGameCode();
    const pid = Math.random().toString(36).substring(7);
    state.gameCode = code;
    state.playerId = pid;
    const gameData = {
        code, status: 'waiting', hostId: pid,
        players: [{ id: pid, name: state.playerName, score: 0, ready: false, hand: [], playedCard: null }],
        rows: [], round: 0, chat: [], currentTurn: 0, maxRounds: 6, turnResolved: false, waitingForRowChoice: null, pendingCard: null
    };
    debugLog('Creating game', { code, host: state.playerName });
    await saveGame(gameData);
    subscribeToGame(code);
    state.screen = 'lobby';
    if (typeof render === 'function') render();
};

const joinGame = async () => {
    if (!state.playerName || !state.playerName.trim() || !state.joinCode || !state.joinCode.trim()) { alert('Entrez pseudo et code !'); return; }
    if (!database) { alert('Base de données non initialisée'); return; }
    const normalized = state.joinCode.toUpperCase();
    debugLog('Attempting to join', { joinCode: normalized });
    const snap = await database.ref('games/' + normalized).once('value');
    const game = snap.val();
    if (!game) { alert('Partie introuvable !'); return; }
    if (game.status !== 'waiting') { alert('Partie déjà commencée !'); return; }
    const pid = Math.random().toString(36).substring(7);
    game.players.push({ id: pid, name: state.playerName, score: 0, ready: false, hand: [], playedCard: null });
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
    if (!p) { console.warn('toggleReady: player not found'); return; }
    p.ready = !p.ready;
    debugLog('Toggle ready', { player: p.name, ready: p.ready });
    await saveGame(state.game);
};

const startGame = async () => {
    if (state.game.hostId !== state.playerId || state.game.players.length < 2) { console.warn('startGame: unauthorized or not enough players'); return; }
    if (!state.game.players.every(p => p.ready)) { alert('Tous les joueurs doivent être prêts !'); return; }
    debugLog('Starting game', { players: state.game.players.length });
    try {
        const deck = shuffleDeck();
        const cardsNeeded = 4 + (state.game.players.length * 10);
        if (deck.length < cardsNeeded) throw new Error('Pas assez de cartes');
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
    if (!p) { console.warn('playCard: player not found'); return; }
    if (hasPlayed(p)) { console.warn('playCard: already played'); return; }
    p.playedCard = card;
    p.hand = p.hand.filter(c => c !== card);
    state.selectedCard = null;
    debugLog('Card played', { player: p.name, card });
    await saveGame(state.game);
    if (typeof render === 'function') render();
};

const resolveTurn = async () => {
    debugLog('resolveTurn called');
    const snap = await database.ref('games/' + state.gameCode).once('value');
    const game = snap.val();
    if (!game) { console.warn('resolveTurn: no game'); return; }
    game.turnResolved = true;
    const plays = game.players.map(p => ({ pid: p.id, card: p.playedCard, name: p.name })).filter(x => Number.isInteger(x.card)).sort((a, b) => a.card - b.card);
    debugLog('Resolving plays', { plays: plays.map(p => `${p.name}:${p.card}`) });
    if (state.enableAnimations && plays.length > 0) {
        await database.ref('animations/' + state.gameCode).set({ type: 'REVEAL_CARDS', plays, timestamp: Date.now() });
        await new Promise(r => setTimeout(r, 2500));
    }
    for (const play of plays) {
        const validRows = game.rows.map((r, i) => ({ i, last: r[r.length - 1], diff: play.card - r[r.length - 1] })).filter(x => x.diff > 0);
        if (!validRows.length) {
            game.waitingForRowChoice = play.pid;
            game.pendingCard = play.card;
            game.turnResolved = false;
            await database.ref('animations/' + state.gameCode).set({ type: 'WAITING_FOR_CHOICE', playerName: play.name, timestamp: Date.now() });
            await saveGame(game);
            debugLog('Player must choose row', { playerId: play.pid, card: play.card });
            return;
        }
    }
    if (state.enableAnimations) {
        await database.ref('animations/' + state.gameCode).set({ type: 'FADE_OVERLAY', timestamp: Date.now() });
        await new Promise(r => setTimeout(r, 500));
    }
    await resolveAllPlays(game);
};

const resolveAllPlays = async (game) => {
    const plays = game.players.filter(p => Number.isInteger(p.playedCard)).map(p => ({ pid: p.id, card: p.playedCard, name: p.name, playerName: p.name })).sort((a, b) => a.card - b.card);
    debugLog('resolveAllPlays', { cards: plays.map(p => p.card) });
    for (const play of plays) {
        const p = game.players.find(x => x.id === play.pid);
        const validRows = game.rows.map((r, i) => ({ i, last: r[r.length - 1], diff: play.card - r[r.length - 1] })).filter(x => x.diff > 0);
        if (!validRows.length) {
            game.waitingForRowChoice = play.pid;
            game.pendingCard = play.card;
            game.turnResolved = false;
            await saveGame(game);
            debugLog('Player must choose during resolve', { player: p.name, card: play.card });
            return;
        }
        const chosenRow = validRows.reduce((min, cur) => cur.diff < min.diff ? cur : min);
        if (game.rows[chosenRow.i].length === 5) {
            const penaltyRow = [...game.rows[chosenRow.i]];
            const penaltyPoints = penaltyRow.reduce((s, c) => s + calculateHeads(c), 0);
            p.score += penaltyPoints;
            debugLog('6th card penalty', { player: p.name, row: chosenRow.i, penaltyPoints, cards: penaltyRow });
            if (state.enableAnimations) {
                await database.ref('animations/' + state.gameCode).set({ type: 'SIXTH_CARD_PENALTY', card: play.card, rowIndex: chosenRow.i, playerName: p.name, penaltyPoints, timestamp: Date.now() });
                await new Promise(r => setTimeout(r, 3500));
            }
            game.rows[chosenRow.i] = [play.card];
        } else {
            if (state.enableAnimations) {
                await database.ref('animations/' + state.gameCode).set({ type: 'CARD_TO_ROW', card: play.card, rowIndex: chosenRow.i, playerName: p.name, is6thCard: false, timestamp: Date.now() });
                await new Promise(r => setTimeout(r, 1200));
            }
            game.rows[chosenRow.i].push(play.card);
            debugLog('Card placed', { player: p.name, card: play.card, row: chosenRow.i });
        }
        p.playedCard = null;
        await saveGame(game);
        if (p.score >= 66) {
            game.status = 'finished';
            game.finishReason = 'score_limit';
            debugLog('Game finished - player reached 66 points', { player: p.name, score: p.score });
            await saveGame(game);
            return;
        }
    }
    game.currentTurn++;
    if (game.currentTurn > 10) {
        game.round++;
        if (game.round > game.maxRounds) {
            game.status = 'finished';
            game.finishReason = 'rounds_completed';
            debugLog('Game finished - all rounds completed');
        } else {
            const deck = shuffleDeck();
            game.rows = [[deck[0]], [deck[1]], [deck[2]], [deck[3]]];
            deck.splice(0, 4);
            game.players.forEach(p => {
                p.hand = deck.splice(0, 10).sort((a, b) => a - b);
                p.playedCard = null;
            });
            game.currentTurn = 1;
            debugLog('New round started', { round: game.round, noPointsAdded: true });
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
    if (!game) { debugLog('chooseRow: game not found'); return; }
    if (game.waitingForRowChoice !== state.playerId) { debugLog('Not authorized to choose row', { allowed: game.waitingForRowChoice }); return; }
    const p = game.players.find(x => x.id === state.playerId);
    const penaltyRow = [...game.rows[rowIndex]];
    const penaltyPoints = penaltyRow.reduce((s, c) => s + calculateHeads(c), 0);
    p.score += penaltyPoints;
    debugLog('Player picked up row', { player: p.name, rowIndex, penaltyPoints, cards: penaltyRow });
    if (state.enableAnimations) {
        await database.ref('animations/' + state.gameCode).set({ type: 'PLAYER_CHOSE_ROW', card: game.pendingCard, rowIndex, playerName: p.name, penaltyPoints, timestamp: Date.now() });
        await new Promise(r => setTimeout(r, 3000));
    }
    game.rows[rowIndex] = [game.pendingCard];
    p.playedCard = null;
    await resolveAllPlays(game);
};

const restartGame = async () => {
    if (!state.game || state.game.hostId !== state.playerId) { console.warn('restartGame: unauthorized'); return; }
    debugLog('Restarting game');
    state.game.players.forEach(p => { p.score = 0; p.hand = []; p.playedCard = null; p.ready = false; });
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
    if (gameRef) gameRef.off();
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
    setTimeout(() => { state.copied = false; if (typeof render === 'function') render(); }, 2000);
};