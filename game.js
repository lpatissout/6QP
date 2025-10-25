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
    animationSpeed: 800
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

// 💬 Animation : message d'information global
const animateInfoMessage = (data, callback) => {
    const msg = document.createElement('div');
    msg.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-lg text-lg font-bold z-[10000] slide-up';
    msg.textContent = data.text;
    document.body.appendChild(msg);
    setTimeout(() => {
        msg.style.opacity = '0';
        setTimeout(() => msg.remove(), 400);
        callback();
    }, 3500);
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
            case 'INFO_MESSAGE':
                animateInfoMessage(anim.data, resolve);
                break;
            default:
                resolve();
        }
    });
};

/* ==================== NOUVELLES ANIMATIONS ==================== */

// 💫 Animation : carte qui vole jusqu’à la bonne rangée
const animateCardToRow = (data, callback) => {
    const { card, rowIndex, playerName } = data;

    const overlay = document.getElementById('flying-cards-overlay');
    if (!overlay) return callback();

    const flyingCard = document.createElement('div');
    flyingCard.className = `${getCardColor(card)} text-white rounded-lg shadow-2xl flex flex-col items-center justify-between p-2 font-bold`;
    flyingCard.style.cssText = `
        position: fixed;
        width: 64px;
        height: 96px;
        z-index: 9999;
        pointer-events: none;
        transform-origin: center center;
        opacity: 0;
        transform: scale(0.5) rotate(-10deg);
        transition: all ${state.animationSpeed}ms cubic-bezier(0.4, 0.0, 0.2, 1);
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

    requestAnimationFrame(() => {
        flyingCard.style.opacity = '1';
        flyingCard.style.transform = 'scale(1.1) rotate(0deg)';
    });

    setTimeout(() => {
        const targetRow = document.getElementById(`row-${rowIndex}`);
        if (!targetRow) return callback();

        const rowCards = targetRow.querySelectorAll('.w-12');
        const rectRow = targetRow.getBoundingClientRect();
        const targetX = rectRow.left + 100 + rowCards.length * 50;
        const targetY = rectRow.top + rectRow.height / 2 - 48;

        flyingCard.style.left = targetX + 'px';
        flyingCard.style.top = targetY + 'px';
        flyingCard.style.transform = 'scale(0.9) rotate(0deg)';

        setTimeout(() => {
            flyingCard.style.opacity = '0';
            flyingCard.style.transform = 'scale(0.6)';
            setTimeout(() => {
                flyingCard.remove();
                if (typeof render === 'function') render();
                callback();
            }, 300);
        }, state.animationSpeed);
    }, 300);
};

// 🧲 Animation : une rangée est ramassée (elle glisse vers le joueur)
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

// 🃏 Animation : révélation + tri + noms des joueurs
const animateRevealCards = (data, callback) => {
    const { plays } = data;

    const revealZone = document.createElement('div');
    revealZone.className = 'fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-[10000]';
    revealZone.style.opacity = '0';
    revealZone.style.transition = 'opacity 400ms ease';
    revealZone.innerHTML = `
        <div class="text-white text-3xl font-bold mb-6 slide-up">Cartes jouées ce tour :</div>
        <div id="reveal-cards" class="flex gap-6 flex-wrap justify-center items-end max-w-5xl transition-all"></div>
        <div id="reveal-phase-text" class="text-white text-lg mt-6 opacity-0 transition-opacity">🔢 Classement des cartes...</div>
    `;
    document.body.appendChild(revealZone);

    setTimeout(() => (revealZone.style.opacity = '1'), 50);
    const container = document.getElementById('reveal-cards');

    plays.forEach((play, i) => {
        setTimeout(() => {
            const cardWrapper = document.createElement('div');
            cardWrapper.className = 'flex flex-col items-center text-center opacity-0 transform scale-75 transition-all';
            cardWrapper.style.transition = 'all 600ms ease';

            const nameDiv = document.createElement('div');
            nameDiv.className = 'text-white font-semibold mb-2 text-sm md:text-base';
            nameDiv.textContent = play.playerName;

            const cardDiv = document.createElement('div');
            cardDiv.className = `${getCardColor(play.card)} text-white rounded-xl shadow-2xl p-4 font-bold text-center`;
            cardDiv.style.cssText = 'width: 90px;';
            cardDiv.innerHTML = `
                <div class="text-3xl mb-2">${play.card}</div>
                <div class="text-lg mb-2">${'🐮'.repeat(calculateHeads(play.card))}</div>
            `;

            cardWrapper.appendChild(nameDiv);
            cardWrapper.appendChild(cardDiv);
            container.appendChild(cardWrapper);

            requestAnimationFrame(() => {
                cardWrapper.style.opacity = '1';
                cardWrapper.style.transform = 'scale(1)';
            });
        }, i * 250);
    });

    setTimeout(() => {
        const phaseText = document.getElementById('reveal-phase-text');
        if (phaseText) phaseText.style.opacity = '1';
    }, plays.length * 250);

    setTimeout(() => {
        const sorted = [...plays].sort((a, b) => a.card - b.card);
        const wrappers = Array.from(container.children);

        wrappers.forEach((wrap, i) => {
            const sortedIndex = sorted.findIndex(s => s.card === plays[i].card);
            const translateX = (sortedIndex - i) * 110;
            wrap.style.transform = `translateX(${translateX}px) scale(1)`;
        });

        setTimeout(() => {
            container.innerHTML = '';
            sorted.forEach(play => {
                const cardWrapper = document.createElement('div');
                cardWrapper.className = 'flex flex-col items-center text-center';
                cardWrapper.innerHTML = `
                    <div class="text-white font-semibold mb-2 text-sm md:text-base">${escapeHtml(play.playerName)}</div>
                    <div class="${getCardColor(play.card)} text-white rounded-xl shadow-2xl p-4 font-bold text-center" style="width:90px;">
                        <div class="text-3xl mb-2">${play.card}</div>
                        <div class="text-lg mb-2">${'🐮'.repeat(calculateHeads(play.card))}</div>
                    </div>
                `;
                container.appendChild(cardWrapper);
            });
        }, 700);
    }, plays.length * 250 + 600);

    setTimeout(() => {
        revealZone.style.opacity = '0';
        setTimeout(() => {
            revealZone.remove();
            callback();
        }, 400);
    }, plays.length * 250 + 3200);
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

        if (data.status === 'playing' && !state.subscribedAnimations) {
            subscribeToAnimations(code);
            state.subscribedAnimations = true;
        }

        if (state.game.status === 'playing' && !state.game.turnResolved && oldStatus === 'playing') {
            const allPlayed = state.game.players.every(p => hasPlayed(p));
            if (allPlayed) {
                debugLog('All players played -> resolveTurn');
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

/* ==== CORRIGÉ : ajout de async ici ==== */
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
/* ===================================== */

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

    // 💡 Étape 1 : révéler les cartes avant toute décision
    if (state.enableAnimations && plays.length > 0) {
        await database.ref('animations/' + state.gameCode).set({
            type: 'REVEAL_CARDS',
            plays,
            timestamp: Date.now()
        });
    }

    // 💡 Étape 2 : traitement des cartes jouées dans l’ordre
    for (const play of plays) {
        const validRows = game.rows
            .map((r, i) => ({ i, last: r[r.length - 1], diff: play.card - r[r.length - 1] }))
            .filter(x => x.diff > 0);

        // 🟦 CAS SPÉCIAL : carte trop basse → le joueur doit choisir une ligne
        if (!validRows.length) {
            game.waitingForRowChoice = play.pid;
            game.pendingCard = play.card;
            game.turnResolved = false;

            // 🔹 Étape 3 : informer tous les joueurs de la situation
            await database.ref('animations/' + state.gameCode).set({
                type: 'INFO_MESSAGE',
                text: `${play.name} a joué une carte inférieure et doit choisir une rangée.`,
                timestamp: Date.now()
            });

            await saveGame(game);
            debugLog('Player must choose row', { playerId: play.pid, card: play.card });
            return;
        }

        // 🟩 Si le joueur peut jouer normalement → rien à changer ici
        // (le code continue plus bas dans resolveAllPlays)
    }

    // 💡 Étape 4 : toutes les cartes peuvent être placées → on résout normalement
    await resolveAllPlays(game);
};

const resolveAllPlays = async (game) => {
    const plays = game.players
        .filter(p => Number.isInteger(p.playedCard))
        .map(p => ({ pid: p.id, card: p.playedCard, name: p.name, playerName: p.name }))
        .sort((a, b) => a.card - b.card);

    debugLog('resolveAllPlays with animations', { cards: plays.map(p => p.card) });

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
