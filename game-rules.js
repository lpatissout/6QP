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

const resolveAllPlays = async (game) => {
    const plays = game.players
        .filter(p => Number.isInteger(p.playedCard))
        .map(p => ({ pid: p.id, card: p.playedCard, name: p.name, playerName: p.name }))
        .sort((a, b) => a.card - b.card);

    debugLog('resolveAllPlays', { cards: plays.map(p => p.card) });

    // Traiter les cartes UNE PAR UNE dans l'ordre
    for (const play of plays) {
        const p = game.players.find(x => x.id === play.pid);
        const validRows = findValidRows(play.card, game.rows);

        if (!validRows.length) {
            // Le joueur doit choisir une rangée
            game.waitingForRowChoice = play.pid;
            game.pendingCard = play.card;
            game.turnResolved = false;
            await saveGame(game);
            
            debugLog('Player must choose during resolve', { player: p.name, card: play.card });
            return;
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
            // NOUVELLE MANCHE : pas de points attribués ici
            const deck = shuffleDeck();
            game.rows = [[deck[0]], [deck[1]], [deck[2]], [deck[3]]];
            deck.splice(0, GAME_CONSTANTS.INITIAL_ROWS);
            
            game.players.forEach(p => {
                p.hand = deck.splice(0, GAME_CONSTANTS.CARDS_PER_PLAYER).sort((a, b) => a - b);
                p.playedCard = null;
            });
            game.currentTurn = 1;
            debugLog('New round started', { round: game.round, noPointsAdded: true, animationsStillEnabled: state.enableAnimations });
        }
    }

    game.turnResolved = false;
    game.waitingForRowChoice = null;
    game.pendingCard = null;
    await saveGame(game);
};

const initializeGameRound = (game) => {
    const deck = shuffleDeck();
    const cardsNeeded = GAME_CONSTANTS.INITIAL_ROWS + (game.players.length * GAME_CONSTANTS.CARDS_PER_PLAYER);
    
    if (deck.length < cardsNeeded) {
        throw new Error('Pas assez de cartes');
    }

    game.rows = [[deck[0]], [deck[1]], [deck[2]], [deck[3]]];
    deck.splice(0, GAME_CONSTANTS.INITIAL_ROWS);
    
    game.players.forEach(p => {
        p.hand = deck.splice(0, GAME_CONSTANTS.CARDS_PER_PLAYER).sort((a, b) => a - b);
        p.playedCard = null;
        debugLog('Dealt hand', { player: p.name, handSize: p.hand.length });
    });

    game.status = 'playing';
    game.round = 1;
    game.currentTurn = 1;
    game.turnResolved = false;
    game.waitingForRowChoice = null;
    game.pendingCard = null;

    return game;
};
