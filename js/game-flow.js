// Orchestration des tours et phases du jeu

let gameFlowState = {
    isProcessing: false,
    animationQueue: []
};

/**
 * Gère le déroulement d'un tour complet
 */
async function processTurn() {
    if (gameFlowState.isProcessing) return;
    
    const game = AppState.game;
    const players = game.players;
    
    // ✅ CORRECTION : Vérification stricte avec type checking
    const allPlayed = players.every(p => StateHelpers.hasPlayerPlayed(p));
    
    if (!allPlayed) {
        return;
    }
    
    // Si on attend un choix de rangée, ne pas traiter
    if (game.waitingForChoice && game.waitingForChoice !== AppState.player.id) {
        return;
    }
    
    gameFlowState.isProcessing = true;
    
    try {
        // Phase de révélation (seulement si pas déjà révélée)
        const revealZone = document.getElementById('reveal-zone');
        if (!revealZone || revealZone.classList.contains('hidden')) {
            await revealCards();
            
            // Attendre un peu pour que les joueurs voient
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Phase de résolution - placer les cartes dans l'ordre
        await resolveTurn();
        
        // ✅ CORRECTION : Vérification stricte si toutes les cartes ont été placées
        const allCardsPlaced = players.every(p => {
            // Vérifier si la carte a été retirée de la main (placée)
            const localPlayer = StateHelpers.getLocalPlayer();
            if (p.id === AppState.player.id && localPlayer) {
                // Pour le joueur local, vérifier que la carte n'est plus dans la main
                const hasPlayed = StateHelpers.hasPlayerPlayed(localPlayer);
                return hasPlayed && !localPlayer.hand.includes(p.playedCard);
            }
            // Pour les autres joueurs, vérification stricte
            return StateHelpers.hasPlayerPlayed(p);
        });
        
        if (allCardsPlaced && !game.waitingForChoice) {
            // Réinitialiser les cartes jouées
            await resetPlayedCards();
            
            // Cacher la zone de révélation
            UI.hideRevealZone();
            
            // Vérifier fin de tour/manche/partie
            await checkTurnEnd();
        }
        
    } catch (error) {
        console.error('❌ Erreur processTurn:', error);
    } finally {
        gameFlowState.isProcessing = false;
    }
}

/**
 * Révèle toutes les cartes jouées
 */
async function revealCards() {
    const game = AppState.game;
    const players = game.players;
    
    // ✅ CORRECTION : Vérification stricte
    const playedCards = players
        .filter(p => StateHelpers.hasPlayerPlayed(p))
        .map(p => ({
            playerId: p.id,
            playerName: p.name,
            card: p.playedCard
        }));
    
    // Afficher la zone de révélation
    UI.showRevealZone(playedCards);
}

/**
 * Résout un tour en plaçant les cartes dans l'ordre
 */
async function resolveTurn() {
    const game = AppState.game;
    const players = game.players;
    
    // ✅ CORRECTION : Récupérer toutes les cartes jouées avec vérification stricte
    const playedCards = players
        .filter(p => StateHelpers.hasPlayerPlayed(p))
        .map(p => ({
            playerId: p.id,
            playerName: p.name,
            card: p.playedCard
        }));
    
    // Trier par ordre croissant
    const sortedCards = sortPlayedCards(playedCards);
    
    // Placer chaque carte une par une
    let currentRows = [...game.rows];
    
    for (const playedCard of sortedCards) {
        const cardValue = playedCard.card;
        const playerId = playedCard.playerId;
        
        // Animation de vol de carte
        await Animations.flyCardToRow(cardValue, currentRows);
        
        // Trouver la rangée appropriée
        const rowIndex = findValidRow(cardValue, currentRows);
        
        if (rowIndex === -1) {
            // Carte trop petite - le joueur doit choisir une rangée
            if (playerId === AppState.player.id) {
                // C'est le joueur local qui doit choisir
                UI.showRowChoiceModal(currentRows, cardValue);
                // Attendre le choix - la fonction handleRowChoice continuera le processus
                return;
            } else {
                // Attendre que le joueur choisisse - on met à jour l'état
                // et on attendra que le choix soit fait (géré par l'écoute Firebase)
                await updateGameState(AppState.game.code, {
                    waitingForChoice: playerId,
                    pendingCard: cardValue
                });
                // On ne peut pas continuer tant que le choix n'est pas fait
                // Le processus reprendra quand le joueur aura choisi
                return;
            }
        }
        
        // Placer la carte
        const result = placeCardInRow(cardValue, rowIndex, currentRows);
        currentRows = result.newRows;
        
        // Si des cartes ont été ramassées (6ème carte)
        if (result.collectedCards.length > 0) {
            const player = players.find(p => p.id === playerId);
            if (player) {
                const newScore = player.score + result.collectedHeads;
                
                // Animation de ramassage
                await Animations.collectCards(result.collectedCards, playerId, result.collectedHeads);
                
                // Mettre à jour le score
                await updatePlayerScore(AppState.game.code, playerId, newScore);
            }
        }
        
        // Mettre à jour les rangées dans Firebase
        await updateGameState(AppState.game.code, {
            rows: currentRows
        });
        
        // Petite pause entre chaque placement
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Mettre à jour l'état local
    AppState.game.rows = currentRows;
}

/**
 * Réinitialise les cartes jouées pour le prochain tour
 */
async function resetPlayedCards() {
    try {
        const playersRef = database.ref(`games/${AppState.game.code}/players`);
        const snapshot = await playersRef.once('value');
        const players = snapshot.val();
        
        if (!players) return;
        
        if (Array.isArray(players)) {
            for (let i = 0; i < players.length; i++) {
                await playersRef.child(`${i}/playedCard`).set(null);
            }
        } else {
            const playerKeys = Object.keys(players);
            for (const key of playerKeys) {
                await playersRef.child(`${key}/playedCard`).set(null);
            }
        }
    } catch (error) {
        console.error('❌ Erreur reset played cards:', error);
    }
}

/**
 * Vérifie la fin de tour/manche/partie
 */
async function checkTurnEnd() {
    const game = AppState.game;
    
    // Vérifier fin de partie
    const endCheck = checkGameEnd(game.players, game.round);
    if (endCheck.finished) {
        await endGame(endCheck);
        return;
    }
    
    // Vérifier fin de manche (10 tours)
    if (game.turn >= GAME_CONSTANTS.MAX_TURNS_PER_ROUND) {
        await endRound();
        return;
    }
    
    // Sinon, passer au tour suivant
    await updateGameState(AppState.game.code, {
        turn: game.turn + 1
    });
}

/**
 * Gère la fin d'une manche
 */
async function endRound() {
    const game = AppState.game;
    
    // Afficher message de fin de manche
    UI.showMessage(`🎯 Fin de la manche ${game.round}/${GAME_CONSTANTS.MAX_ROUNDS}`);
    
    // Attendre un peu
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Vérifier si c'est la dernière manche
    if (game.round >= GAME_CONSTANTS.MAX_ROUNDS) {
        const endCheck = checkGameEnd(game.players, game.round);
        await endGame(endCheck);
        return;
    }
    
    // Démarrer une nouvelle manche
    await startNewRound();
}

/**
 * Démarre une nouvelle manche
 */
async function startNewRound() {
    const game = AppState.game;
    const playerCount = game.players.length;
    
    // Redistribuer les cartes
    const deck = shuffleDeck();
    const { rows, hands, remainingDeck } = dealCards(deck, playerCount);
    
    // Mettre à jour les mains des joueurs
    const playersRef = database.ref(`games/${AppState.game.code}/players`);
    const playersSnapshot = await playersRef.once('value');
    const players = playersSnapshot.val();
    
    if (Array.isArray(players)) {
        for (let i = 0; i < players.length; i++) {
            await playersRef.child(`${i}/hand`).set(hands[i]);
            await playersRef.child(`${i}/playedCard`).set(null);
        }
    } else {
        const playerKeys = Object.keys(players);
        for (let i = 0; i < playerKeys.length; i++) {
            await playersRef.child(`${playerKeys[i]}/hand`).set(hands[i]);
            await playersRef.child(`${playerKeys[i]}/playedCard`).set(null);
        }
    }
    
    // Mettre à jour la partie
    await updateGameState(AppState.game.code, {
        round: game.round + 1,
        turn: 1,
        rows: rows,
        deck: remainingDeck
    });
}

/**
 * Gère la fin de partie
 */
async function endGame(endCheck) {
    const game = AppState.game;
    
    // Mettre à jour le statut
    await updateGameState(AppState.game.code, {
        status: GAME_STATUS.FINISHED
    });
    
    // Trier les joueurs par score
    const sortedPlayers = [...game.players].sort((a, b) => a.score - b.score);
    
    // Afficher l'écran de fin
    UI.showEndScreen(sortedPlayers, endCheck.winner);
}

/**
 * Met à jour le score d'un joueur
 */
async function updatePlayerScore(gameCode, playerId, newScore) {
    try {
        const playersRef = database.ref(`games/${gameCode}/players`);
        const snapshot = await playersRef.once('value');
        const players = snapshot.val();
        
        if (!players) return;
        
        if (Array.isArray(players)) {
            const playerIndex = players.findIndex(p => p.id === playerId);
            if (playerIndex !== -1) {
                await playersRef.child(`${playerIndex}/score`).set(newScore);
            }
        } else {
            const playerKeys = Object.keys(players);
            const playerIndex = playerKeys.findIndex(key => players[key].id === playerId);
            if (playerIndex !== -1) {
                await playersRef.child(`${playerKeys[playerIndex]}/score`).set(newScore);
            }
        }
    } catch (error) {
        console.error('❌ Erreur update score:', error);
    }
}

/**
 * Gère le choix d'une rangée pour une carte trop petite
 */
async function handleRowChoice(rowIndex, cardValue) {
    const game = AppState.game;
    const playerId = AppState.player.id;
    
    // Placer la carte dans la rangée choisie
    const result = placeCardInRow(cardValue, rowIndex, game.rows);
    
    // Calculer les points de la rangée ramassée
    const collectedHeads = calculateTotalHeads(result.collectedCards);
    const player = game.players.find(p => p.id === playerId);
    const newScore = (player?.score || 0) + collectedHeads;
    
    // Animation
    await Animations.collectCards(result.collectedCards, playerId, collectedHeads);
    
    // Mettre à jour Firebase
    await updateGameState(AppState.game.code, {
        rows: result.newRows,
        waitingForChoice: null,
        pendingCard: null
    });
    
    await updatePlayerScore(AppState.game.code, playerId, newScore);
    
    // Cacher le modal
    UI.hideRowChoiceModal();
    
    // Réinitialiser le flag de traitement pour permettre de continuer
    gameFlowState.isProcessing = false;
    
    // Continuer le traitement du tour
    await processTurn();
}

