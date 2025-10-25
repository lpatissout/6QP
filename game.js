/* ==================== STATE ==================== */
let state = {
    screen: 'home',
    gameCode: '',
    playerName: '',
    joinCode: '',
    game: null,
    playerId: null,
    selectedCard: null,
    showChat: false,
    isAnimating: false,
    enableAnimations: true,
    animationSpeed: 5000, // durée totale de la transition
};

let gameRef = null;

/* ==================== HELPERS ==================== */
const debugLog = (msg, data = null) => {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] ${msg}`, data || '');
};

const shuffleDeck = () => {
    const deck = Array.from({ length: 104 }, (_, i) => i + 1);
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
};

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

/* ==================== FIREBASE SYNC ==================== */
const saveGame = async (data) => {
    if (!database) return;
    await database.ref('games/' + state.gameCode).set(data);
    state.game = data;
};

const subscribeToGame = (code) => {
    if (gameRef) gameRef.off();
    gameRef = database.ref('games/' + code);
    gameRef.on('value', async (snap) => {
        const data = snap.val();
        if (!data) return;
        const oldStatus = state.game ? state.game.status : null;
        state.game = data;
        debugLog('Firebase update received', { status: data.status });
        if (data.status === 'playing' && oldStatus !== 'playing') {
            debugLog('Switching to game screen (Firebase status playing)');
            state.screen = 'game';
            render();
        }
        if (data.status === 'playing' && data.players.every(p => Number.isInteger(p.playedCard))) {
            if (state.game.hostId === state.playerId) {
                debugLog('All players played -> resolveTurn (by host only)');
                await resolveTurn();
            }
        }
        render();
    });
};

/* ==================== GAME FLOW ==================== */
const createGame = async () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const pid = Math.random().toString(36).substring(7);
    state.gameCode = code;
    state.playerId = pid;

    const gameData = {
        code,
        hostId: pid,
        players: [{ id: pid, name: state.playerName, score: 0, ready: false, hand: [], playedCard: null }],
        status: 'waiting',
        rows: [],
        round: 0,
        currentTurn: 0,
        waitingForRowChoice: null,
        pendingCard: null
    };

    await saveGame(gameData);
    subscribeToGame(code);
    state.screen = 'lobby';
    render();
};

const joinGame = async () => {
    const normalized = state.joinCode.toUpperCase();
    const snap = await database.ref('games/' + normalized).once('value');
    const game = snap.val();
    if (!game || game.status !== 'waiting') {
        alert('Partie introuvable ou déjà lancée');
        return;
    }
    const pid = Math.random().toString(36).substring(7);
    game.players.push({ id: pid, name: state.playerName, score: 0, ready: false, hand: [], playedCard: null });
    state.gameCode = normalized;
    state.playerId = pid;
    await saveGame(game);
    subscribeToGame(state.gameCode);
    state.screen = 'lobby';
    render();
};

const toggleReady = async () => {
    const p = state.game.players.find(x => x.id === state.playerId);
    p.ready = !p.ready;
    await saveGame(state.game);
};

const startGame = async () => {
    const g = state.game;
    if (g.hostId !== state.playerId) return;
    if (!g.players.every(p => p.ready)) return;

    const deck = shuffleDeck();
    g.rows = [[deck[0]], [deck[1]], [deck[2]], [deck[3]]];
    deck.splice(0, 4);

    g.players.forEach(p => {
        p.hand = deck.splice(0, 10).sort((a, b) => a - b);
        p.playedCard = null;
    });

    g.status = 'playing';
    g.round = 1;
    g.currentTurn = 1;
    await saveGame(g);
    state.screen = 'game';
    render();
};

/* ==================== NEW CINEMATIC ANIMATION ==================== */
const animateCinematicReveal = async (plays) => {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/80 flex flex-col justify-center items-center z-[9999] transition-opacity duration-700';
        overlay.style.opacity = '0';

        const cardZone = document.createElement('div');
        cardZone.className = 'flex flex-wrap justify-center gap-6';

        plays.forEach(p => {
            const cardDiv = document.createElement('div');
            cardDiv.className = `${getCardColor(p.card)} text-white rounded-xl shadow-2xl p-4 transform scale-110 transition-all duration-700`;
            cardDiv.style.width = '100px';
            cardDiv.innerHTML = `
                <div class="text-3xl font-bold">${p.card}</div>
                <div class="text-lg">${'🐮'.repeat(calculateHeads(p.card))}</div>
                <div class="text-sm mt-2">${p.name}</div>
            `;
            cardZone.appendChild(cardDiv);
        });

        overlay.appendChild(cardZone);
        document.body.appendChild(overlay);

        // Fade-in + léger zoom-out
        setTimeout(() => (overlay.style.opacity = '1'), 50);

        setTimeout(() => {
            // fondu du fond
            overlay.style.background = 'rgba(0,0,0,0)';
            overlay.style.backdropFilter = 'blur(0px)';

            // déplacement vers table
            cardZone.querySelectorAll('div').forEach((card, i) => {
                card.style.transition = `all ${state.animationSpeed}ms ease-in-out`;
                card.style.transform = `translateY(${window.innerHeight / 2 - 200}px) scale(0.6)`;
                card.style.opacity = '0.8';
            });

            setTimeout(() => {
                overlay.remove();
                resolve();
            }, state.animationSpeed);
        }, 2000);
    });
};

/* ==================== GAME TURN RESOLUTION ==================== */
const resolveTurn = async () => {
    const snap = await database.ref('games/' + state.gameCode).once('value');
    const game = snap.val();
    if (!game) return;

    const plays = game.players
        .filter(p => Number.isInteger(p.playedCard))
        .map(p => ({ pid: p.id, card: p.playedCard, name: p.name }))
        .sort((a, b) => a.card - b.card);

    debugLog('Resolving plays', { plays });

    await animateCinematicReveal(plays);

    for (const play of plays) {
        const validRows = game.rows
            .map((r, i) => ({ i, last: r[r.length - 1], diff: play.card - r[r.length - 1] }))
            .filter(x => x.diff > 0);

        if (!validRows.length) {
            game.waitingForRowChoice = play.pid;
            game.pendingCard = play.card;
            await saveGame(game);
            debugLog(`${play.name} doit choisir une rangée.`);
            return;
        }

        const chosenRow = validRows.reduce((min, cur) => cur.diff < min.diff ? cur : min);
        if (game.rows[chosenRow.i].length === 5) {
            const p = game.players.find(x => x.id === play.pid);
            const penaltyRow = game.rows[chosenRow.i];
            const penaltyPoints = penaltyRow.reduce((s, c) => s + calculateHeads(c), 0);
            p.score += penaltyPoints;
            game.rows[chosenRow.i] = [play.card];
        } else {
            game.rows[chosenRow.i].push(play.card);
        }

        const p = game.players.find(x => x.id === play.pid);
        p.playedCard = null;
    }

    game.turnResolved = false;
    game.waitingForRowChoice = null;
    game.pendingCard = null;
    await saveGame(game);
};

/* ==================== PLAYER ACTIONS ==================== */
const playCard = async (card) => {
    const p = state.game.players.find(x => x.id === state.playerId);
    if (!p || Number.isInteger(p.playedCard)) return;
    p.playedCard = card;
    p.hand = p.hand.filter(c => c !== card);
    await saveGame(state.game);
    render();
};

const chooseRow = async (rowIndex) => {
    const snap = await database.ref('games/' + state.gameCode).once('value');
    const game = snap.val();
    const p = game.players.find(x => x.id === state.playerId);
    const penaltyRow = game.rows[rowIndex];
    const penaltyPoints = penaltyRow.reduce((s, c) => s + calculateHeads(c), 0);
    p.score += penaltyPoints;
    game.rows[rowIndex] = [game.pendingCard];
    p.playedCard = null;
    game.waitingForRowChoice = null;
    game.pendingCard = null;
    await saveGame(game);
    await resolveTurn();
};
