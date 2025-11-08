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
    const cardBeingPlaced = game.pendingCard; // ✅ Sauvegarder la carte avant de la traiter
    const penaltyRow = [...game.rows[rowIndex]];
    const penaltyPoints = calculatePenaltyPoints(penaltyRow);
    p.score += penaltyPoints;
    
    if (!game.turnHistory) game.turnHistory = [];
    game.turnHistory.push({
        turn: game.currentTurn,
        round: game.round,
        player: p.name,
        card: cardBeingPlaced,
        action: 'chose_row',
        rowIndex: rowIndex,
        penaltyPoints:/* ==================== GAME LOGIC - UTILITIES ==================== */

// IMPORTANT: Ces fonctions sont déjà définies dans state.js
// On les réutilise ici pour éviter les duplications

/* ==================== GAME RULES - PURE LOGIC ==================== */

const resolveTurn = async () => {
    debugLog('resolveTurn called');
    
    const game = await loadGame(state.gameCode);
    
    if (!game) {
        console.warn('resolveTurn: no game');
        return;
    }

    game.turnResolved = true;

    const plays = game.players
        .map(p => ({ pid: p.id, card: p.playedCard, name: p.name }))
        .filter(x => Number.isInteger(x.card))
        .sort((a, b) => a.card - b.card);

    debugLog('Resolving plays', { plays: plays.map(p => `${p.name}:${p.card}`) });

    // Étape 1 : révéler les cartes
    if (state.enableAnimations && plays.length > 0) {
        await publishAnimation(state.gameCode, 'REVEAL_CARDS', { plays });
        await new Promise(r => setTimeout(r, ANIMATION_CONSTANTS.REVEAL_DURATION + 500));
    }

    // Étape 2 : vérifier si quelqu'un doit choisir une rangée
    for (const play of plays) {
        const validRows = findValidRows(play.card, game.rows);

        if (!validRows.length) {
            game.waitingForRowChoice = play.pid;
            game.pendingCard = play.card;
            game.turnResolved = false;

            await publishAnimation(state.gameCode, 'WAITING_FOR_CHOICE', { playerName: play.name });
            await saveGame(game);
            
            debugLog('Player must choose row', { playerId: play.pid, card: play.card });
            return;
        }
    }

    // Étape 3 : faire disparaître l'overlay avant de placer les cartes
    if (state.enableAnimations) {
        await publishAnimation(state.gameCode, 'FADE_OVERLAY', {});
        await new Promise(r => setTimeout(r, ANIMATION_CONSTANTS.FADE_DURATION));
    }

    // Étape 4 : placer les cartes une par une
    await resolveAllPlays(game);
};

// ✅ CORRECTION : Gérer le cas où on doit reprendre après un choix de rangée
const resolveAllPlays = async (game, startFromCard = null) => {
    const plays = game.players
        .filter(p => Number.isInteger(p.playedCard))
        .map(p => ({ pid: p.id, card: p.playedCard, name: p.name, playerName: p.name }))
        .sort((a, b) => a.card - b.card);

    debugLog('resolveAllPlays', { 
        cards: plays.map(p => p.card),
        startFromCard: startFromCard 
    });

    // ✅ Si on reprend après un choix, sauter les cartes déjà traitées
    let startIndex = 0;
    if (startFromCard !== null) {
        startIndex = plays.findIndex(p => p.card > startFromCard);
        if (startIndex === -1) {
            // Toutes les cartes ont été traitées
            debugLog('All cards processed, advancing phase');
            await advanceGamePhase(game);
            return;
        }
        debugLog('Resuming from card index', { startIndex, card: plays[startIndex].card });
    }

    // Traiter les cartes UNE PAR UNE dans l'ordre
    for (let i = startIndex; i < plays.length; i++) {
        const play = plays[i];
        const p = game.players.find(x => x.id === play.pid);
        const validRows = findValidRows(play.card, game.rows);

        // ✅ Si pas de rangées valides, on STOP et on attend
        if (!validRows.length) {
            game.waitingForRowChoice = play.pid;
            game.pendingCard = play.card;
            game.turnResolved = false;
            
            // ✅ Animation d'attente
            if (state.enableAnimations) {
                await publishAnimation(state.gameCode, 'WAITING_FOR_CHOICE', { playerName: p.name });
            }
            
            await saveGame(game);
            
            debugLog('Player must choose during resolve - STOPPING HERE', { player: p.name, card: play.card });
            return; // ✅ IMPORTANT : On s'arrête ici !
        }

        const chosenRow = findBestRow(validRows);
        
        // Vérifier si c'est la 6ème carte AVANT de modifier la rangée
        if (game.rows[chosenRow.i].length === GAME_CONSTANTS.CARDS_PER_ROW_MAX) {
            const penaltyRow = [...game.rows[chosenRow.i]];
            const penaltyPoints = calculatePenaltyPoints(penaltyRow);
            p.score += penaltyPoints;
            
            debugLog('6th card penalty', { 
                player: p.name, 
                row: chosenRow.i, 
                penaltyPoints,
                cards: penaltyRow
            });
            
            if (state.enableAnimations) {
                await publishAnimation(state.gameCode, 'SIXTH_CARD_PENALTY', {
                    card: play.card,
                    rowIndex: chosenRow.i,
                    playerName: p.name,
                    penaltyPoints
                });
                await new Promise(r => setTimeout(r, ANIMATION_CONSTANTS.SIXTH_CARD_ANIMATION_DURATION));
            }
            
            game.rows[chosenRow.i] = [play.card];
        } else {
            // Animation de placement carte par carte
            if (state.enableAnimations) {
                await publishAnimation(state.gameCode, 'CARD_TO_ROW', {
                    card: play.card,
                    rowIndex: chosenRow.i,
                    playerName: p.name,
                    is6thCard: false
                });
                await new Promise(r => setTimeout(r, ANIMATION_CONSTANTS.CARD_FLIGHT_DURATION));
            }
            
            game.rows[chosenRow.i].push(play.card);
            debugLog('Card placed', { player: p.name, card: play.card, row: chosenRow.i });
        }

        p.playedCard = null;
        
        // Sauvegarder après chaque carte pour que tout le monde voit les changements
        await saveGame(game);
        
        // Vérifier si un joueur a atteint 66 points
        if (p.score >= GAME_CONSTANTS.SCORE_LIMIT) {
            game.status = 'finished';
            game.finishReason = 'score_limit';
            debugLog('Game finished - player reached 66 points', { player: p.name, score: p.score });
            await saveGame(game);
            return;
        }
    }

    // ✅ Si on arrive ici, c'est que toutes les cartes ont été placées
    await advanceGamePhase(game);
};

const advanceGamePhase = async (game) => {
    game.currentTurn++;
    
    if (game.currentTurn > GAME_CONSTANTS.CARDS_PER_PLAYER) {
        game.round++;
        
        if (game.round > game.maxRounds) {
            game.status = 'finished';
            game.finishReason = 'rounds_completed';
            debugLog('Game finished - all rounds completed');
        } else {
            // NOUVELLE MANCHE
            const deck = shuffleDeck();
            game.rows = [[deck[0]], [deck[1]], [deck[2]], [deck[3]]];
            deck.splice(0, GAME_CONSTANTS.INITIAL_ROWS);
            
            game.players.forEach(p => {
                // Ne pas distribuer aux spectateurs
                if (!p.isSpectator) {
                    p.hand = deck.splice(0, GAME_CONSTANTS.CARDS_PER_PLAYER).sort((a, b) => a - b);
                }
                p.playedCard = null;
            });
            game.currentTurn = 1;
            debugLog('New round started', { round: game.round });
            
            game.roundJustStarted = true;
            await saveGame(game);
            await new Promise(r => setTimeout(r, 500));
            
            if (state.enableAnimations) {
                await publishAnimation(state.gameCode, 'NEW_ROUND', { 
                    round: game.round,
                    timestamp: Date.now()
                });
                await new Promise(r => setTimeout(r, 2000));
            }
            
            game.roundJustStarted = false;
        }
    }

    game.turnResolved = false;
    game.waitingForRowChoice = null;
    game.pendingCard = null;
    await saveGame(game);
};

const initializeGameRound = (game) => {
    const deck = shuffleDeck();
    
    // Compter uniquement les joueurs non-spectateurs
    const activePlayers = game.players.filter(p => !p.isSpectator);
    const cardsNeeded = GAME_CONSTANTS.INITIAL_ROWS + (activePlayers.length * GAME_CONSTANTS.CARDS_PER_PLAYER);
    
    if (deck.length < cardsNeeded) {
        throw new Error('Pas assez de cartes');
    }

    game.rows = [[deck[0]], [deck[1]], [deck[2]], [deck[3]]];
    deck.splice(0, GAME_CONSTANTS.INITIAL_ROWS);
    
    game.players.forEach(p => {
        if (!p.isSpectator) {
            p.hand = deck.splice(0, GAME_CONSTANTS.CARDS_PER_PLAYER).sort((a, b) => a - b);
        } else {
            p.hand = [];
        }
        p.playedCard = null;
        debugLog('Dealt hand', { player: p.name, handSize: p.hand.length, isSpectator: p.isSpectator });
    });

    game.status = 'playing';
    game.round = 1;
    game.currentTurn = 1;
    game.turnResolved = false;
    game.waitingForRowChoice = null;
    game.pendingCard = null;

    return game;
};
