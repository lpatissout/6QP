// Opérations Firebase - CRUD et synchronisation

let firebaseApp = null;
let database = null;

/**
 * Initialise Firebase
 */
function initFirebase() {
    try {
        firebaseApp = firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        console.log('✅ Firebase initialisé');
    } catch (error) {
        console.error('❌ Erreur initialisation Firebase:', error);
    }
}

/**
 * Crée une nouvelle partie dans Firebase
 * @param {string} gameCode - Code de la partie
 * @param {string} hostId - ID de l'hôte
 * @param {string} hostName - Nom de l'hôte
 * @returns {Promise<void>}
 */
async function createGame(gameCode, hostId, hostName) {
    const gameData = {
        code: gameCode,
        status: GAME_STATUS.WAITING,
        hostId: hostId,
        round: 1,
        turn: 1,
        maxRounds: GAME_CONSTANTS.MAX_ROUNDS,
        players: [{
            id: hostId,
            name: hostName,
            score: 0,
            hand: [],
            playedCard: null,
            ready: false
        }],
        rows: [[], [], [], []],
        waitingForChoice: null,
        pendingCard: null
    };
    
    try {
        await database.ref(`games/${gameCode}`).set(gameData);
        console.log('✅ Partie créée:', gameCode);
    } catch (error) {
        console.error('❌ Erreur création partie:', error);
        throw error;
    }
}

/**
 * Rejoint une partie existante
 * @param {string} gameCode - Code de la partie
 * @param {string} playerId - ID du joueur
 * @param {string} playerName - Nom du joueur
 * @returns {Promise<boolean>} - true si succès
 */
async function joinGame(gameCode, playerId, playerName) {
    try {
        const gameRef = database.ref(`games/${gameCode}`);
        const snapshot = await gameRef.once('value');
        
        if (!snapshot.exists()) {
            throw new Error('Partie introuvable');
        }
        
        const game = snapshot.val();
        
        if (game.status !== GAME_STATUS.WAITING) {
            throw new Error('La partie a déjà commencé');
        }
        
        // Convertir les joueurs en tableau si nécessaire
        let playersArray = Array.isArray(game.players) ? game.players : Object.values(game.players || {});
        
        // Vérifier si le joueur n'est pas déjà dans la partie
        if (playersArray.some(p => p.id === playerId)) {
            throw new Error('Vous êtes déjà dans cette partie');
        }
        
        // Ajouter le joueur
        const newPlayer = {
            id: playerId,
            name: playerName,
            score: 0,
            hand: [],
            playedCard: null,
            ready: false
        };
        
        // Si players est un tableau, l'utiliser directement
        if (Array.isArray(game.players)) {
            const updatedPlayers = [...game.players, newPlayer];
            await gameRef.child('players').set(updatedPlayers);
        } else {
            // Sinon, utiliser push
            await gameRef.child('players').push(newPlayer);
        }
        
        console.log('✅ Joueur ajouté à la partie');
        return true;
    } catch (error) {
        console.error('❌ Erreur rejoindre partie:', error);
        throw error;
    }
}

/**
 * Met à jour le statut "ready" d'un joueur
 * @param {string} gameCode - Code de la partie
 * @param {string} playerId - ID du joueur
 * @param {boolean} ready - Statut ready
 */
async function updatePlayerReady(gameCode, playerId, ready) {
    try {
        const playersRef = database.ref(`games/${gameCode}/players`);
        const snapshot = await playersRef.once('value');
        const players = snapshot.val();
        
        if (!players) return;
        
        // Si c'est un tableau
        if (Array.isArray(players)) {
            const playerIndex = players.findIndex(p => p.id === playerId);
            if (playerIndex !== -1) {
                await playersRef.child(`${playerIndex}/ready`).set(ready);
            }
        } else {
            // Si c'est un objet
            const playerKeys = Object.keys(players);
            const playerIndex = playerKeys.findIndex(key => players[key].id === playerId);
            if (playerIndex !== -1) {
                await playersRef.child(`${playerKeys[playerIndex]}/ready`).set(ready);
            }
        }
    } catch (error) {
        console.error('❌ Erreur update ready:', error);
    }
}

/**
 * Démarre la partie (change le statut et distribue les cartes)
 * @param {string} gameCode - Code de la partie
 */
async function startGame(gameCode) {
    try {
        const gameRef = database.ref(`games/${gameCode}`);
        const snapshot = await gameRef.once('value');
        const game = snapshot.val();
        
        // Distribuer les cartes
        const deck = shuffleDeck();
        const playerCount = game.players.length;
        const { rows, hands, remainingDeck } = dealCards(deck, playerCount);
        
        // Mettre à jour les mains des joueurs
        const playersRef = gameRef.child('players');
        const playersSnapshot = await playersRef.once('value');
        const players = playersSnapshot.val();
        
        if (Array.isArray(players)) {
            // Si c'est un tableau
            for (let i = 0; i < players.length; i++) {
                await playersRef.child(`${i}/hand`).set(hands[i]);
            }
        } else {
            // Si c'est un objet
            const playerKeys = Object.keys(players);
            for (let i = 0; i < playerKeys.length; i++) {
                await playersRef.child(`${playerKeys[i]}/hand`).set(hands[i]);
            }
        }
        
        // Mettre à jour la partie
        await gameRef.update({
            status: GAME_STATUS.PLAYING,
            rows: rows,
            round: 1,
            turn: 1,
            deck: remainingDeck
        });
        
        console.log('✅ Partie démarrée');
    } catch (error) {
        console.error('❌ Erreur démarrage partie:', error);
        throw error;
    }
}

/**
 * Joue une carte
 * @param {string} gameCode - Code de la partie
 * @param {string} playerId - ID du joueur
 * @param {number} card - Numéro de la carte
 */
async function playCard(gameCode, playerId, card) {
    try {
        const playersRef = database.ref(`games/${gameCode}/players`);
        const snapshot = await playersRef.once('value');
        const players = snapshot.val();
        
        if (!players) return;
        
        if (Array.isArray(players)) {
            const playerIndex = players.findIndex(p => p.id === playerId);
            if (playerIndex !== -1) {
                const hand = players[playerIndex].hand || [];
                const newHand = hand.filter(c => c !== card);
                await playersRef.child(`${playerIndex}/hand`).set(newHand);
                await playersRef.child(`${playerIndex}/playedCard`).set(card);
            }
        } else {
            const playerKeys = Object.keys(players);
            const playerIndex = playerKeys.findIndex(key => players[key].id === playerId);
            if (playerIndex !== -1) {
                const hand = players[playerKeys[playerIndex]].hand || [];
                const newHand = hand.filter(c => c !== card);
                await playersRef.child(`${playerKeys[playerIndex]}/hand`).set(newHand);
                await playersRef.child(`${playerKeys[playerIndex]}/playedCard`).set(card);
            }
        }
    } catch (error) {
        console.error('❌ Erreur jouer carte:', error);
        throw error;
    }
}

/**
 * Choisit une rangée à ramasser (pour carte trop petite)
 * @param {string} gameCode - Code de la partie
 * @param {string} playerId - ID du joueur
 * @param {number} rowIndex - Index de la rangée
 */
async function chooseRowToCollect(gameCode, playerId, rowIndex) {
    try {
        const gameRef = database.ref(`games/${gameCode}`);
        await gameRef.update({
            waitingForChoice: null,
            pendingCard: null
        });
        
        // La logique de ramassage sera gérée dans game-flow.js
        // via l'écoute des changements
    } catch (error) {
        console.error('❌ Erreur choix rangée:', error);
        throw error;
    }
}

/**
 * Écoute les changements d'une partie en temps réel
 * @param {string} gameCode - Code de la partie
 * @param {Function} callback - Fonction appelée à chaque changement
 * @returns {Function} - Fonction pour détacher l'écoute
 */
function listenToGame(gameCode, callback) {
    const gameRef = database.ref(`games/${gameCode}`);
    
    const listener = gameRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            const game = snapshot.val();
            callback(game);
        }
    });
    
    // Retourner une fonction pour détacher l'écoute
    return () => {
        gameRef.off('value', listener);
    };
}

/**
 * Quitte une partie
 * @param {string} gameCode - Code de la partie
 * @param {string} playerId - ID du joueur
 */
async function leaveGame(gameCode, playerId) {
    try {
        const playersRef = database.ref(`games/${gameCode}/players`);
        const snapshot = await playersRef.once('value');
        const players = snapshot.val();
        
        if (!players) return;
        
        if (Array.isArray(players)) {
            const playerIndex = players.findIndex(p => p.id === playerId);
            if (playerIndex !== -1) {
                const updatedPlayers = players.filter((_, i) => i !== playerIndex);
                await playersRef.set(updatedPlayers);
                
                // Si c'était l'hôte, transférer l'hôte au premier joueur restant
                if (updatedPlayers.length > 0) {
                    const gameRef = database.ref(`games/${gameCode}`);
                    const gameSnapshot = await gameRef.once('value');
                    const game = gameSnapshot.val();
                    
                    if (game.hostId === playerId) {
                        await gameRef.child('hostId').set(updatedPlayers[0].id);
                    }
                }
            }
        } else {
            const playerKeys = Object.keys(players);
            const playerToRemove = playerKeys.find(key => players[key].id === playerId);
            
            if (playerToRemove) {
                await playersRef.child(playerToRemove).remove();
                
                // Si c'était l'hôte, transférer l'hôte au premier joueur restant
                const gameRef = database.ref(`games/${gameCode}`);
                const gameSnapshot = await gameRef.once('value');
                const game = gameSnapshot.val();
                
                if (game.hostId === playerId && playerKeys.length > 1) {
                    const remainingKeys = playerKeys.filter(k => k !== playerToRemove);
                    if (remainingKeys.length > 0) {
                        const newHostId = players[remainingKeys[0]].id;
                        await gameRef.child('hostId').set(newHostId);
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ Erreur quitter partie:', error);
    }
}

/**
 * Met à jour les rangées et scores après résolution d'un tour
 * @param {string} gameCode - Code de la partie
 * @param {Object} updates - Objet avec les mises à jour
 */
async function updateGameState(gameCode, updates) {
    try {
        const gameRef = database.ref(`games/${gameCode}`);
        await gameRef.update(updates);
    } catch (error) {
        console.error('❌ Erreur mise à jour état:', error);
        throw error;
    }
}

