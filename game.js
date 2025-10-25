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
    // Système d'animations
    animationQueue: [],
    isAnimating: false,
    enableAnimations: true,
    animationSpeed: 800 // ms par animation
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
            case 'CARD_TO_ROW':
                animateCardToRow(anim.data, resolve);
                break;
            case 'ROW_PENALTY':
                animateRowPenalty(anim.data, resolve);
                break;
            case 'PLAYER_CHOOSE':
                animatePlayerChoice(anim.data, resolve);
                break;
            case 'REVEAL_CARDS':
                animateRevealCards(anim.data, resolve);
                break;
            default:
                resolve();
        }
    });
};

const animateCardToRow = (data, callback) => {
    const { card, rowIndex, playerName } = data;
    
    const overlay = document.getElementById('flying-cards-overlay');
    if (!overlay) {
        callback();
        return;
    }
    
    const flyingCard = document.createElement('div');
    flyingCard.className = `${getCardColor(card)} text-white rounded-lg shadow-2xl flex flex-col items-center justify-between p-2 font-bold`;
    flyingCard.style.cssText = `
        position: fixed;
        width: 64px;
        height: 96px;
        z-index: 9999;
        transition: all ${state.animationSpeed}ms cubic-bezier(0.4, 0.0, 0.2, 1);
        pointer-events: none;
    `;
    flyingCard.innerHTML = `
        <span class="text-xl">${card}</span>
        <div>${'🐮'.repeat(calculateHeads(card))}</div>
        <div class="text-xs mt-1 truncate w-full text-center">${escapeHtml(playerName)}</div>
    `;
    
    overlay.appendChild(flyingCard);
    
    const startX = window.innerWidth / 2 - 32;
    const startY = window.innerHeight / 2 - 48;
    flyingCard.style.left = startX + 'px';
    flyingCard.style.top = startY + 'px';
    flyingCard.style.opacity = '0';
    flyingCard.style.transform = 'scale(0.5) rotate(-10deg)';
    
    flyingCard.offsetHeight;
    
    setTimeout(() => {
        flyingCard.style.opacity = '1';
        flyingCard.style.transform = 'scale(1.2) rotate(0deg)';
    }, 50);
    
    setTimeout(() => {
        const targetRow = document.getElementById(`row-${rowIndex}`);
        if (targetRow) {
            const rect = targetRow.getBoundingClientRect();
            const targetX = rect.right - 80;
            const targetY = rect.top + rect.height / 2 - 48;
            
            flyingCard.style.left = targetX + 'px';
            flyingCard.style.top = targetY + 'px';
            flyingCard.style.transform = 'scale(1) rotate(0deg)';
        }
    }, 400);
    
    setTimeout(() => {
        flyingCard.style.opacity = '0';
        flyingCard.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            flyingCard.remove();
            render();
            callback();
        }, 200);
    }, state.animationSpeed);
};

const animateRowPenalty = (data, callback) => {
    const { rowIndex, playerName, penaltyPoints } = data;
    
    const targetRow = document.getElementById(`row-${rowIndex}`);
    if (!targetRow) {
        callback();
        return;
    }
    
    targetRow.style.transition = 'all 300ms';
    targetRow.style.backgroundColor = '#fee2e2';
    targetRow.style.transform = 'scale(1.05)';
    targetRow.classList.add('shake-animation');
    
    const popup = document.createElement('div');
    popup.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white px-8 py-6 rounded-xl shadow-2xl z-[10000] font-bold text-lg bounce-in';
    popup.innerHTML = `
        <div class="text-center">
            <div class="text-3xl mb-2">⚠️ Pénalité !</div>
            <div class="text-lg">${escapeHtml(playerName)} ramasse</div>
            <div class="text-4xl mt-3 font-black">+${penaltyPoints} 🐮</div>
        </div>
    `;
    document.body.appendChild(popup);
    
    setTimeout(() => {
        const cards = targetRow.querySelectorAll('div[class*="w-12"]');
        cards.forEach((card, i) => {
            setTimeout(() => {
                card.style.transition = 'all 500ms';
                card.style.transform = 'translateY(-100px) rotate(20deg)';
                card.style.opacity = '0';
            }, i * 80);
        });
    }, 800);
    
    setTimeout(() => {
        popup.style.opacity = '0';
        popup.style.transform = 'translate(-50%, -50%) scale(0.8)';
        setTimeout(() => {
            popup.remove();
            targetRow.style.backgroundColor = '';
            targetRow.style.transform = '';
            targetRow.classList.remove('shake-animation');
            render();
            callback();
        }, 300);
    }, state.animationSpeed + 800);
};

const animatePlayerChoice = (data, callback) => {
    const { playerName } = data;
    
    const rows = document.querySelectorAll('[id^="row-"]');
    rows.forEach(row => {
        row.classList.add('pulse-animation');
    });
    
    const msg = document.createElement('div');
    msg.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-6 py-3 rounded-lg shadow-lg z-[10000] font-bold slide-up';
    msg.innerHTML = `⏳ ${escapeHtml(playerName)} choisit une rangée...`;
    document.body.appendChild(msg);
    
    const checkInterval = setInterval(() => {
        if (!state.game.waitingForRowChoice) {
            clearInterval(checkInterval);
            rows.forEach(row => row.classList.remove('pulse-animation'));
            msg.style.opacity = '0';
            setTimeout(() => {
                msg.remove();
                callback();
            }, 300);
        }
    }, 100);
};

const animateRevealCards = (data, callback) => {
    const { plays } = data;
    
    const revealZone = document.createElement('div');
    revealZone.className = 'fixed inset-0 bg-black/90 flex items-center justify-center z-[10000]';
    revealZone.style.opacity = '0';
    revealZone.style.transition = 'opacity 400ms';
    revealZone.innerHTML = `
        <div class="text-center">
            <div class="text-white text-3xl font-bold mb-6 slide-up">Cartes jouées ce tour :</div>
            <div class="flex gap-4 flex-wrap justify-center max-w-4xl" id="reveal-cards"></div>
        </div>
    `;
    document.body.appendChild(revealZone);
    
    setTimeout(() => revealZone.style.opacity = '1', 50);
    
    const container = document.getElementById('reveal-cards');
    
    plays.forEach((play, i) => {
        setTimeout(() => {
            const cardDiv = document.createElement('div');
            cardDiv.className = `${getCardColor(play.card)} text-white rounded-xl shadow-2xl p-4 font-bold text-center bounce-in`;
            cardDiv.style.cssText = 'width: 90px;';
            cardDiv.innerHTML = `
                <div class="text-3xl mb-2">${play.card}</div>
                <div class="text-lg mb-2">${'🐮'.repeat(calculateHeads(play.card))}</div>
                <div class="text-sm truncate">${escapeHtml(play.playerName)}</div>
            `;
            container.appendChild(cardDiv);
        }, i * 250);
    });
    
    setTimeout(() => {
        revealZone.style.opacity = '0';
        setTimeout(() => {
            revealZone.remove();
            callback();
        }, 400);
    }, plays.length * 250 + 2000);
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

        if (data.status === 'playing') {
            state.screen = 'game';
        }

        if (state.game.status === 'playing' && !state.game.turnResolved && oldStatus === 'playing') {
            const allPlayed = state.game.players.every(p => hasPlayed(p));
            if (allPlayed) {
                debugLog('All players played -> resolveTurn');
                await resolveTurn();
            }
        }

        render();
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
    render();
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

    // Animation de la pénalité
    if (state.enableAnimations) {
        queueAnimation('ROW_PENALTY', {
            rowIndex,
            playerName: p.name,
            penaltyPoints
        });
        await processAnimationQueue();
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
    render();
};

const copyLink = () => {
    const link = window.location.origin + window.location.pathname + '?join=' + state.gameCode;
    navigator.clipboard.writeText(link);
    state.copied = true;
    debugLog('Link copied', { link });
    render();
    setTimeout(() => {
        state.copied = false;
        render();
    }, 2000);
};players.push({
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
    render();
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
        render();
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
    render();
};

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

    for (const play of plays) {
        const validRows = game.rows
            .map((r, i) => ({ i, last: r[r.length - 1], diff: play.card - r[r.length - 1] }))
            .filter(x => x.diff > 0);

        if (!validRows.length) {
            game.waitingForRowChoice = play.pid;
            game.pendingCard = play.card;
            game.turnResolved = false;
            await saveGame(game);
            debugLog('Player must choose row', { playerId: play.pid, card: play.card });
            return;
        }
    }

    await resolveAllPlays(game);
};

const resolveAllPlays = async (game) => {
    const plays = game.players
        .filter(p => Number.isInteger(p.playedCard))
        .map(p => ({ pid: p.id, card: p.playedCard, name: p.name, playerName: p.name }))
        .sort((a, b) => a.card - b.card);

    debugLog('resolveAllPlays with animations', { cards: plays.map(p => p.card) });

    // Animation : Révéler toutes les cartes
    if (state.enableAnimations && plays.length > 0) {
        queueAnimation('REVEAL_CARDS', { plays });
        await processAnimationQueue();
    }

    for (const play of plays) {
        const p = game.players.find(x => x.id === play.pid);
        const validRows = game.rows
            .map((r, i) => ({ i, last: r[r.length - 1], diff: play.card - r[r.length - 1] }))
            .filter(x => x.diff > 0);

        if (!validRows.length) {
            game.waitingForRowChoice = play.pid;
            game.pendingCard = play.card;
            game.turnResolved = false;
            await saveGame(game);
            
            if (state.enableAnimations) {
                queueAnimation('PLAYER_CHOOSE', { playerName: p.name });
                await processAnimationQueue();
            }
            
            debugLog('Player must choose during resolve', { player: p.name, card: play.card });
            return;
        }

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
            
            debugLog('6th card penalty', { player: p.name, row: chosenRow.i, penaltyPoints });
            game.rows[chosenRow.i] = [play.card];
        } else {
            if (state.enableAnimations) {
                queueAnimation('CARD_TO_ROW', {
                    card: play.card,
                    rowIndex: chosenRow.i,
                    playerName: p.name
                });
                await processAnimationQueue();
            }
            
            game.rows[chosenRow.i].push(play.card);
            debugLog('Card placed', { player: p.name, card: play.card, row: chosenRow.i });
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

    game.