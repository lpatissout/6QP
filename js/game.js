/* ---------------- GAME MODULE ---------------- */
/* This module handles the core game logic for "6 qui prend", including Firebase integration,
   game state management, player actions, and UI rendering. */

const firebaseConfig = {
    apiKey: "AIzaSyC2YfNviAE_jDD0wT7TmfZBeOaKqjJdJuQ",
    authDomain: "quiprend-879a6.firebaseapp.com",
    databaseURL: "https://quiprend-879a6-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "quiprend-879a6",
    storageBucket: "quiprend-879a6.firebasestorage.app",
    messagingSenderId: "476103541469",
    appId: "1:476103541469:web:3a0ac76f9bde94b1745134"
};

// Initialize Firebase
let database = null;
try {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    console.info('Firebase initialized ✅', { projectId: firebaseConfig.projectId });
} catch (e) {
    console.error('Firebase init error', e);
    alert('Erreur Firebase: ' + e.message);
}

// Global game state
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
    showDebug: false
};

let gameRef = null;

/* Helper functions */
const generateGameCode = () => Math.random().toString(36).substring(2,8).toUpperCase();

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

const debugLog = (msg, data = null) => {
    const time = new Date().toLocaleTimeString();
    state.debugLogs.push({ time, message: msg, data: data ? JSON.stringify(data) : null });
    // Keep last 100 logs
    if (state.debugLogs.length > 100) state.debugLogs.shift();
    console.log(`[DBG ${time}] ${msg}`, data || '');
    // Also push to spectator console
    spectatorPush('info', msg, data || '');
};

const hasPlayed = (p) => Number.isInteger(p && p.playedCard) && p.playedCard > 0;

/* Firebase save function */
const saveGame = async (data) => {
    if (!database) {
        console.warn('saveGame aborted: no database');
        return;
    }

    // Ensure presence of keys
    if (data.pendingCard === undefined) data.pendingCard = null;
    if (data.waitingForRowChoice === undefined) data.waitingForRowChoice = null;

    // Sanity check rows
    if (data.rows && data.rows.length) {
        for (let i = 0; i < data.rows.length; i++) {
            for (let j = 0; j < data.rows[i].length; j++) {
                if (data.rows[i][j] === undefined) {
                    debugLog('❌ ERREUR: undefined card in rows', { row: i, col: j, rows: data.rows });
                    throw new Error(`Carte undefined à la position [${i}][${j}]`);
                }
            }
        }
    }

    console.log('Saving to Firebase', { gameCode: state.gameCode, rowsCount: data.rows ? data.rows.map(r => r.length) : null });
    await database.ref('games/' + state.gameCode).set(data);
    state.game = data;
    console.info('Save completed for', state.gameCode);
};

/* Firebase subscription */
const subscribeToGame = (code) => {
    if (!database) return;
    if (gameRef) gameRef.off();
    gameRef = database.ref('games/' + code);
    gameRef.on('value', async (snap) => {
        const data = snap.val();
        if (!data) {
            console.warn('subscribeToGame: no game data', code);
            return;
        }
        debugLog('📥 Firebase update received', { status: data.status, waitingForRowChoice: data.waitingForRowChoice, players: data.players ? data.players.length : 0 });
        const oldStatus = state.game ? state.game.status : null;
        state.game = data;

        if (data.status === 'playing') {
            state.screen = 'game';
            debugLog('Switching to game screen', { gameCode: code });
        }

        // If we were already playing and now everyone has played, resolve turn
        if (state.game.status === 'playing' && !state.game.turnResolved && oldStatus === 'playing') {
            const allPlayed = state.game.players.every(p => hasPlayed(p));
            console.log('Checking allPlayed for resolveTurn', { allPlayed });
            if (allPlayed) {
                debugLog('All players played -> resolveTurn');
                await resolveTurn();
            }
        }

        render();
    });
};

/* Game creation and joining */
const createGame = async () => {
    if (!state.playerName || !state.playerName.trim()) { alert('Entrez un pseudo !'); return; }
    if (!database) { alert('DB not initialized'); return; }

    const code = generateGameCode();
    const pid = Math.random().toString(36).substring(7);
    state.gameCode = code;
    state.playerId = pid;

    const initial = {
        code,
        status: 'waiting',
        hostId: pid,
        players: [{
            id: pid, name: state.playerName, score: 0, ready: false, hand: [], playedCard: null
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

    debugLog('Creating game', { code, host: state.playerName, hostId: pid });
    await saveGame(initial);
    subscribeToGame(code);
    state.screen = 'lobby';
    render();
};

const joinGame = async () => {
    if (!state.playerName || !state.playerName.trim() || !state.joinCode || !state.joinCode.trim()) { alert('Entrez pseudo et code !'); return; }
    if (!database) { alert('DB not initialized'); return; }

    const normalized = state.joinCode.toUpperCase();
    debugLog('Attempting to join', { joinCode: normalized, player: state.playerName });
    const snap = await database.ref('games/' + normalized).once('value');
    const game = snap.val();
    if (!game) { alert('Partie introuvable !'); return; }
    if (game.status !== 'waiting') { alert('Partie déjà commencée !'); return; }

    const pid = Math.random().toString(36).substring(7);
    const newPlayer = { id: pid, name: state.playerName, score: 0, ready: false, hand: [], playedCard: null };
    game.players.push(newPlayer);
    state.gameCode = normalized;
    state.playerId = pid;
    debugLog('Joining game success', { gameCode: normalized, playerId: pid });
    await saveGame(game);
    subscribeToGame(state.gameCode);
    state.screen = 'lobby';
    render();
};

/* Lobby actions */
const toggleReady = async () => {
    const p = state.game.players.find(x => x.id === state.playerId);
    if (!p) { console.warn('toggleReady: no player'); return; }
    p.ready = !p.ready;
    debugLog('Toggling ready', { player: p.name, ready: p.ready });
    await saveGame(state.game);
};

const startGame = async () => {
    if (state.game.hostId !== state.playerId || state.game.players.length < 2) { console.warn('startGame: unauthorized or not enough players'); return; }
    if (!state.game.players.every(p => p.ready)) { alert('Tous doivent être prêts !'); return; }

    debugLog('Starting game', { players: state.game.players.length });
    try {
        const deck = shuffleDeck();
        const cardsNeeded = 4 + (state.game.players.length * 10);
        if (deck.length < cardsNeeded) throw new Error('Pas assez de cartes');

        state.game.rows = [[deck[0]], [deck[1]], [deck[2]], [deck[3]]];
        deck.splice(0, 4);
        state.game.players.forEach(p => { p.hand = deck.splice(0, 10).sort((a, b) => a - b); p.playedCard = null; debugLog('Dealt hand', { player: p.name, hand: p.hand }); });
        state.game.status = 'playing';
        state.game.round = 1;
        state.game.currentTurn = 1;
        state.game.turnResolved = false;
        state.game.waitingForRowChoice = null;
        state.game.pendingCard = null;

        debugLog('Game initialized', { rows: state.game.rows.map(r => r[0]) });
        await saveGame(state.game);
        state.screen = 'game';
        render();
    } catch (err) {
        debugLog('Error starting', { error: err.message });
        alert('Erreur au démarrage : ' + err.message);
    }
};

/* Game actions */
const playCard = async (card) => {
    const p = state.game.players.find(x => x.id === state.playerId);
    if (!p) { console.warn('playCard: player not found'); return; }
    if (hasPlayed(p)) { console.warn('playCard: already played'); return; }

    p.playedCard = card;
    p.hand = p.hand.filter(c => c !== card);
    debugLog('Player played card', { player: p.name, card });
    await saveGame(state.game);
    state.selectedCard = null;
    render();
};

const resolveTurn = async () => {
    debugLog('resolveTurn called');
    const snap = await database.ref('games/' + state.gameCode).once('value');
    const game = snap.val();
    if (!game) { console.warn('resolveTurn: no game'); return; }

    game.turnResolved = true;

    // Build plays only for players who actually played
    const plays = game.players.map(p => ({ pid: p.id, card: p.playedCard, name: p.name }))
                   .filter(x => Number.isInteger(x.card))
                   .sort((a, b) => a.card - b.card);

    debugLog('Plays to resolve', { plays: plays.map(p => ({ pid: p.pid, card: p.card })) });

    for (const play of plays) {
        const validRows = game.rows.map((r, i) => ({ i, last: r[r.length - 1], diff: play.card - r[r.length - 1] }))
                      .filter(x => x.diff > 0);

        debugLog('Checking validRows', { play, validRows });

        if (!validRows.length) {
            // Need player to choose
            game.waitingForRowChoice = play.pid;
            game.pendingCard = play.card;
            game.turnResolved = false;
            await saveGame(game);
            debugLog('Need player to choose row', { playerId: play.pid, card: play.card });
            return;
        }
    }

    // No choice needed
    debugLog('No choice required - resolving all plays');
    await resolveAllPlays(game);
};

const resolveAllPlays = async (game) => {
    const plays = game.players
        .filter(p => Number.isInteger(p.playedCard))
        .map(p => ({ pid: p.id, card: p.playedCard, name: p.name }))
        .sort((a, b) => a.card - b.card);

    debugLog('resolveAllPlays start', { cards: plays.map(p => p.card) });

    for (const play of plays) {
        const p = game.players.find(x => x.id === play.pid);
        const validRows = game.rows.map((r, i) => ({ i, last: r[r.length - 1], diff: play.card - r[r.length - 1] }))
                      .filter(x => x.diff > 0);

        if (!validRows.length) {
            game.waitingForRowChoice = play.pid;
            game.pendingCard = play.card;
            game.turnResolved = false;
            debugLog('Player must choose row during resolveAllPlays', { player: p.name, card: play.card });
            await saveGame(game);
            return;
        }

        const chosenRow = validRows.reduce((min, cur) => cur.diff < min.diff ? cur : min);
        if (game.rows[chosenRow.i].length === 5) {
            const penaltyRow = game.rows[chosenRow.i];
            const penaltyPoints = penaltyRow.reduce((s, c) => s + calculateHeads(c), 0);
            p.score += penaltyPoints;
            debugLog('6th card rule: penalty', { player: p.name, row: chosenRow.i, penaltyPoints });
            game.rows[chosenRow.i] = [play.card];
        } else {
            game.rows[chosenRow.i].push(play.card);
            debugLog('Card placed', { player: p.name, card: play.card, row: chosenRow.i });
        }

        p.playedCard = null;
    }

    debugLog('All plays resolved - advancing turn');
    game.currentTurn++;
    if (game.currentTurn > 10) {
        game.round++;
        if (game.round > game.maxRounds) {
            game.status = 'finished';
            debugLog('Game finished', {});
        } else {
            const deck = shuffleDeck();
            game.rows = [[deck[0]], [deck[1]], [deck[2]], [deck[3]]];
            deck.splice(0, 4);
            game.players.forEach(p => { p.hand = deck.splice(0, 10).sort((a, b) => a - b); debugLog('New hand', { player: p.name, hand: p.hand }); });
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
    if (!game) { debugLog('chooseRow: game not found'); return; }

    debugLog('Authorization check', { waitingForRowChoice: game.waitingForRowChoice, myId: state.playerId });

    if (game.waitingForRowChoice !== state.playerId) {
        debugLog('Not authorized to choose row', { allowed: game.waitingForRowChoice });
        return;
    }

    const p = game.players.find(x => x.id === state.playerId);
    const penaltyRow = game.rows[rowIndex];
    const penaltyPoints = penaltyRow.reduce((s, c) => s + calculateHeads(c), 0);
    p.score += penaltyPoints;

    debugLog('Player picked up row', { player: p.name, rowIndex, penaltyCards: penaltyRow, penaltyPoints });

    game.rows[rowIndex] = [game.pendingCard];
    p.playedCard = null;

    await resolveAllPlays(game);
};

window.chooseRow = chooseRow;

/* UI helpers */
const Card = (num, sel, click, dis, small) => {
    const h = calculateHeads(num);
    const col = getCardColor(num);
    const sz = small ? 'w-12 h-16 text-xs' : 'w-16 h-24 text-sm';
    return `<button ${click ? 'onclick="handleCard(' + num + ')"' : ''} ${dis ? 'disabled' : ''} class="${sz} ${col} text-white rounded-lg shadow-md flex flex-col items-center justify-between p-1 transition ${sel ? 'ring-4 ring-blue-600 scale-105' : ''} ${!dis && !sel ? 'hover:scale-105 cursor-pointer' : ''} ${dis ? 'opacity-50' : ''} font-bold"><span class="text-xl">${num}</span><div>${'🐮'.repeat(h)}</div></button>`;
};

window.handleCard = (c) => {
    const p = state.game.players.find(x => x.id === state.playerId);
    if (!p) { console.warn('handleCard: player not found'); return; }
    if (hasPlayed(p)) return;
    if (state.selectedCard === c) playCard(c);
    else { state.selectedCard = c; debugLog('Card selected', { player: p.name, selectedCard: c }); render(); }
};

const sendMessage = async () => {
    if (!state.chatMessage.trim()) return;
    const p = state.game.players.find(x => x.id === state.playerId);
    state.game.chat = state.game.chat || [];
    state.game.chat.push({ player: p.name, msg: state.chatMessage, time: new Date().toLocaleTimeString() });
    debugLog('Chat sent', { player: p.name, msg: state.chatMessage });
    state.chatMessage = '';
    await saveGame(state.game);
    render();
};

const copyLink = () => {
    const link = window.location.origin + window.location.pathname
    }