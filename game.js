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
            case 'REVEAL_CARDS':
                animateRevealCards(anim.data, resolve);
                break;
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
                debugLog('Unknown animation type, skipping', anim.type);
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

// 🎬 Animation fluide : les cartes du reveal glissent vers leur vraie rangée
const animateCardsToTable = (plays, container, callback) => {
    const overlay = document.getElementById('flying-cards-overlay') || document.body;

    // On cherche toutes les lignes de la table déjà rendues
    const rows = Array.from(document.querySelectorAll('[id^="row-"]'));
    if (!rows.length) {
        console.warn('animateCardsToTable: aucune rangée trouvée');
        callback();
        return;
    }

    
    // On crée des copies animées des cartes du reveal
    const clones = Array.from(container.children).map((cardWrapper, i) => {
        const clone = cardWrapper.cloneNode(true);
        const rect = cardWrapper.getBoundingClientRect();

        clone.style.cssText = `
            position: fixed;
            left: ${rect.left}px;
            top: ${rect.top}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            z-index: 9999;
            transition: all 1.2s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: none;
            transform-origin: center center;
        `;
        overlay.appendChild(clone);
        return clone;
    });

    // Supprime le conteneur du reveal (le fond sombre)
    container.parentElement.remove();

    // Pour chaque carte, déterminer la rangée cible
    clones.forEach((clone, i) => {
        const play = plays[i];
        if (!play || !Number.isInteger(play.card)) return;

        // Trouver la rangée où la carte va être placée (celle dont le dernier nombre est inférieur au sien)
        let chosenRow = null;
        let minDiff = Infinity;

        rows.forEach((row, idx) => {
            const cards = Array.from(row.querySelectorAll('div[class*="w-12"]'));
            if (!cards.length) return;

            const lastCard = parseInt(cards[cards.length - 1].textContent.trim(), 10);
            const diff = play.card - lastCard;

            if (diff > 0 && diff < minDiff) {
                minDiff = diff;
                chosenRow = row;
            }
        });

        // Si aucune rangée valide (carte inférieure à toutes) → on la dirige vers la rangée 0 visuellement
        if (!chosenRow) chosenRow = rows[0];

        // Calcule la position finale de la carte dans la rangée
        const targetRect = chosenRow.getBoundingClientRect();
        const offsetX = targetRect.left + (chosenRow.querySelectorAll('div[class*="w-12"]').length * 50);
        const offsetY = targetRect.top + targetRect.height / 2 - 50;

        // Animation fluide
        setTimeout(() => {
            clone.style.left = `${offsetX}px`;
            clone.style.top = `${offsetY}px`;
            clone.style.transform = 'scale(0.55) rotate(0deg)';
            clone.style.opacity = '0.95';
        }, 150 * i);
    });

    // 🧹 Nettoyage progressif
    setTimeout(() => {
        clones.forEach((c, i) => {
            setTimeout(() => c.remove(), i * 100);
        });
        debugLog('Reveal animation complete and synced for all players (rows targeted)');
        callback();
    }, 2300 + plays.length * 150);
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

        // 🟢 NOUVEAU : si la partie passe en "playing", tout le monde affiche l'écran de jeu
        if (data.status === 'playing' && state.screen !== 'game') {
            debugLog('Switching to game screen (Firebase status playing)');
            state.screen = 'game';
            if (typeof render === 'function') render();
        }

        // 🔄 S’abonner aux animations globales une fois que la partie démarre
        if (data.status === 'playing' && !state.subscribedAnimations) {
            subscribeToAnimations(code);
            state.subscribedAnimations = true;
        }

        // 🧩 Seul l'hôte déclenche la résolution du tour
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

        // 🔁 Met à jour l'affichage local
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

    // 💡 Étape 1 : révéler les cartes avant toute décision
    if (state.enableAnimations && plays.length > 0) {
        await database.ref('animations/' + state.gameCode).set({
            type: 'REVEAL_CARDS',
            plays,
            timestamp: Date.now()
        });
    }

    // 🕒 Étape 1.5 : pause d’1 seconde pour laisser la révélation visible
    await new Promise(r => setTimeout(r, 1000));

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

            // ⏳ Pause d'une seconde avant de permettre le choix au joueur concerné
            await new Promise(r => setTimeout(r, 1000));

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
