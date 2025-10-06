// ⚠️ CONFIGURATION FIREBASE - À GARDER ⚠️
// Ceci est votre configuration Firebase originale.
const firebaseConfig = {
    apiKey: "AIzaSyDSexBnuNNTWaMIpC9drT2zOX-pgcUM99I",
    authDomain: "qui-prend.firebaseapp.com",
    databaseURL: "https://qui-prend-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "qui-prend",
    storageBucket: "qui-prend.firebasestorage.app",
    messagingSenderId: "685422838277",
    appId: "1:685422838277:web:b7cd07ddf2651241a4526c"
};

// Vérifier si Firebase est configuré
if (firebaseConfig.apiKey === "VOTRE_API_KEY") {
    alert("⚠️ Firebase n'est pas encore configuré ! Suivez les instructions du guide pour obtenir vos clés Firebase.");
}

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let gameCode = '';
let playerName = '';
let playerId = '';
let isHost = false;
let isSpectator = false;
let selectedCard = null;

// Éléments DOM
const setupScreen = document.getElementById('setupScreen');
const waitingRoom = document.getElementById('waitingRoom');
const gameScreen = document.getElementById('gameScreen');
const gameMode = document.getElementById('gameMode');
const joinCodeGroup = document.getElementById('joinCodeGroup');
const playerNameGroup = document.getElementById('playerNameGroup');
const numPlayersGroup = document.getElementById('numPlayersGroup');
const startBtn = document.getElementById('startBtn');
const displayGameCode = document.getElementById('displayGameCode');
const playersList = document.getElementById('playersList');
const startGameBtn = document.getElementById('startGameBtn');
const gameStatus = document.getElementById('gameStatus');
const rowsContainer = document.getElementById('rowsContainer');
const revealedContainer = document.getElementById('revealedContainer');
const revealedCards = document.getElementById('revealedCards');
const playerHand = document.getElementById('playerHand');
const handCards = document.getElementById('handCards');
const playCardBtn = document.getElementById('playCardBtn');
const scoresContainer = document.getElementById('scoresContainer');
const nextRoundBtn = document.getElementById('nextRoundBtn');
const newGameBtn = document.getElementById('newGameBtn');
const spectatorBanner = document.getElementById('spectatorBanner');

// Gérer le changement de mode
gameMode.addEventListener('change', () => {
    const mode = gameMode.value;
    joinCodeGroup.classList.toggle('hidden', mode !== 'join');
    playerNameGroup.classList.toggle('hidden', mode === 'spectator');
    numPlayersGroup.classList.toggle('hidden', mode !== 'host');
});

// Bouton continuer
startBtn.addEventListener('click', () => {
    const mode = gameMode.value;
    
    if (mode === 'spectator') {
        const code = prompt('Entrez le code de la partie à observer :');
        if (code) {
            gameCode = code.toUpperCase();
            isSpectator = true;
            joinAsSpectator();
        }
    } else if (mode === 'host') {
        playerName = document.getElementById('playerName').value.trim();
        if (!playerName) {
            alert('Veuillez entrer votre nom !');
            return;
        }
        createGame();
    } else {
        playerName = document.getElementById('playerName').value.trim();
        gameCode = document.getElementById('joinCode').value.trim().toUpperCase();
        if (!playerName || !gameCode) {
            alert('Veuillez entrer votre nom et le code de la partie !');
            return;
        }
        joinGame();
    }
});

// Créer une partie
function createGame() {
    gameCode = generateGameCode();
    playerId = generatePlayerId();
    isHost = true;
    
    const numPlayers = parseInt(document.getElementById('numPlayers').value);
    
    database.ref('games/' + gameCode).set({
        host: playerId,
        maxPlayers: numPlayers,
        status: 'waiting',
        players: {
            [playerId]: {
                name: playerName,
                hand: [],
                penalty: 0,
                selectedCard: null,
                ready: false
            }
        },
        rows: [],
        revealed: [],
        round: 0
    }).then(() => {
        saveSession(gameCode, playerName, playerId, true); // <-- AJOUT PERSISTANCE
        setupScreen.classList.add('hidden');
        waitingRoom.classList.remove('hidden');
        displayGameCode.textContent = gameCode;
        listenToPlayers();
    });
}

// Rejoindre une partie
function joinGame() {
    playerId = generatePlayerId();
    
    database.ref('games/' + gameCode).once('value', (snapshot) => {
        if (!snapshot.exists()) {
            alert('Cette partie n\'existe pas !');
            return;
        }
        
        const game = snapshot.val();
        const playerCount = Object.keys(game.players || {}).length;
        
        if (playerCount >= game.maxPlayers) {
            alert('Cette partie est complète !');
            return;
        }
        
        database.ref('games/' + gameCode + '/players/' + playerId).set({
            name: playerName,
            hand: [],
            penalty: 0,
            selectedCard: null,
            ready: false
        }).then(() => {
            saveSession(gameCode, playerName, playerId, false); // <-- AJOUT PERSISTANCE
            setupScreen.classList.add('hidden');
            waitingRoom.classList.remove('hidden');
            displayGameCode.textContent = gameCode;
            listenToPlayers();
        });
    });
}

// Rejoindre en spectateur
function joinAsSpectator() {
    database.ref('games/' + gameCode).once('value', (snapshot) => {
        if (!snapshot.exists()) {
            alert('Cette partie n\'existe pas !');
            return;
        }
        
        setupScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        spectatorBanner.classList.remove('hidden');
        listenToGame();
    });
}

// Écouter les joueurs dans la salle d'attente
function listenToPlayers() {
    database.ref('games/' + gameCode + '/players').on('value', (snapshot) => {
        const players = snapshot.val() || {};
        playersList.innerHTML = '';
        
        Object.entries(players).forEach(([id, player]) => {
            const li = document.createElement('li');
            li.textContent = player.name + (id === playerId ? ' (Vous)' : '');
            playersList.appendChild(li);
        });
        
        database.ref('games/' + gameCode).once('value', (gameSnapshot) => {
            const game = gameSnapshot.val();
            const playerCount = Object.keys(players).length;
            
            if (isHost && playerCount >= 2 && playerCount <= game.maxPlayers && game.status === 'waiting') {
                startGameBtn.classList.remove('hidden');
            } else if (isHost) {
                startGameBtn.classList.add('hidden');
            }
        });
    });
    
    database.ref('games/' + gameCode + '/status').on('value', (snapshot) => {
        if (snapshot.val() === 'playing') {
            waitingRoom.classList.add('hidden');
            gameScreen.classList.remove('hidden');
            if (!isSpectator) {
                playerHand.classList.remove('hidden');
            }
            // On s'assure d'arrêter l'écoute des joueurs une fois le jeu lancé
            database.ref('games/' + gameCode + '/players').off();
            database.ref('games/' + gameCode + '/status').off();
            listenToGame();
        }
    });
}

// Démarrer la partie
startGameBtn.addEventListener('click', () => {
    initializeGame();
});

// Initialiser le jeu
function initializeGame() {
    const deck = Array.from({length: 104}, (_, i) => i + 1);
    shuffleArray(deck);
    
    database.ref('games/' + gameCode + '/players').once('value', (snapshot) => {
        const players = snapshot.val();
        const playerIds = Object.keys(players);
        const cardsPerPlayer = 10;
        
        const updates = {};
        
        playerIds.forEach((id, index) => {
            // Distribuer 10 cartes triées à chaque joueur
            const hand = deck.splice(0, cardsPerPlayer).sort((a, b) => a - b);
            updates['games/' + gameCode + '/players/' + id + '/hand'] = hand;
            updates['games/' + gameCode + '/players/' + id + '/penalty'] = 0;
            updates['games/' + gameCode + '/players/' + id + '/selectedCard'] = null;
            updates['games/' + gameCode + '/players/' + id + '/ready'] = false;
        });
        
        // Initialiser les 4 rangées
        const initialRows = [
            [deck.shift()],
            [deck.shift()],
            [deck.shift()],
            [deck.shift()]
        ];
        
        updates['games/' + gameCode + '/rows'] = initialRows;
        updates['games/' + gameCode + '/status'] = 'playing';
        updates['games/' + gameCode + '/round'] = 1;
        updates['games/' + gameCode + '/revealed'] = [];
        updates['games/' + gameCode + '/phase'] = 'selection';
        
        database.ref().update(updates);
    });
}

// Écouter l'état du jeu
function listenToGame() {
    database.ref('games/' + gameCode).on('value', (snapshot) => {
        const game = snapshot.val();
        if (!game) return;
        
        updateGameDisplay(game);
    });
}

// Mettre à jour l'affichage du jeu
function updateGameDisplay(game) {
    // Afficher les rangées
    rowsContainer.innerHTML = '';
    (game.rows || []).forEach((row, index) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row';
        rowDiv.innerHTML = `<div class="row-label">Rangée ${index + 1} (${row.length}/5)</div>`;
        row.forEach(card => {
            rowDiv.innerHTML += createCardHTML(card);
        });
        rowsContainer.appendChild(rowDiv);
    });
    
    // Afficher les cartes révélées
    if (game.revealed && game.revealed.length > 0) {
        revealedContainer.classList.remove('hidden');
        revealedCards.innerHTML = '';
        game.revealed.forEach(item => {
            revealedCards.innerHTML += `<div class="card">${item.card}<div class="card-points">${getCardPoints(item.card)}</div><div style="font-size: 0.7em; margin-top: 5px;">${item.playerName}</div></div>`;
        });
    } else {
        revealedContainer.classList.add('hidden');
        revealedCards.innerHTML = ''; // Nettoyer l'affichage
    }
    
    // Afficher la main du joueur
    if (!isSpectator && game.players && game.players[playerId]) {
        const myHand = game.players[playerId].hand || [];
        handCards.innerHTML = '';
        myHand.forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card';
            
            // Logique de sélection/désactivation
            const isSelected = game.players[playerId].selectedCard === card;
            const isReady = game.players[playerId].ready;
            const otherCardSelected = game.players[playerId].selectedCard && !isSelected;

            if (isSelected) {
                cardDiv.classList.add('selected');
            }
            if (isReady || otherCardSelected) {
                cardDiv.classList.add('disabled');
            }

            cardDiv.innerHTML = `${card}<div class="card-points">${getCardPoints(card)}</div>`;
            if (!isReady) { // Le joueur ne peut plus sélectionner s'il est prêt
                cardDiv.onclick = () => selectCardToPlay(card);
            }
            handCards.appendChild(cardDiv);
        });
        
        // Mettre à jour l'état du bouton "Jouer la carte"
        const cardSelected = !!game.players[playerId].selectedCard;
        const playerIsReady = game.players[playerId].ready;
        
        playCardBtn.disabled = !cardSelected || playerIsReady;

        // Mettre à jour le texte du bouton s'il est prêt
        if(playerIsReady) {
            playCardBtn.textContent = 'En attente des autres...';
        } else {
            playCardBtn.textContent = 'Jouer la carte sélectionnée';
        }
    }
    
    // Afficher les scores
    scoresContainer.innerHTML = '';
    Object.entries(game.players || {}).forEach(([id, player]) => {
        const scoreDiv = document.createElement('div');
        scoreDiv.className = 'score-item';
        const status = player.ready ? '✓' : (player.selectedCard ? '⏳' : '');
        scoreDiv.innerHTML = `<span>${player.name} ${status}</span><span>🐮 ${player.penalty}</span>`;
        scoresContainer.appendChild(scoreDiv);
    });
    
    // Mettre à jour le statut
    if (game.phase === 'selection') {
        gameStatus.textContent = `Manche ${game.round}: Sélectionnez une carte à jouer`;
    } else if (game.phase === 'resolution') {
        gameStatus.textContent = 'Résolution en cours...';
    } else if (game.phase === 'roundEnd') {
        gameStatus.textContent = `Fin de manche ${game.round}!`;
        if (isHost) {
            nextRoundBtn.classList.remove('hidden');
        }
    } else if (game.phase === 'gameEnd') {
        // Trouver le gagnant (minimum de pénalités)
        const playersArray = Object.values(game.players);
        const winner = playersArray.reduce((min, p) => p.penalty < min.penalty ? p : min, playersArray[0]);

        gameStatus.textContent = `🏆 Le joueur avec le moins de pénalités est ${winner.name} avec ${winner.penalty} points !`;
        
        if (isHost) {
            nextRoundBtn.classList.add('hidden');
            newGameBtn.classList.remove('hidden');
        }
    }

    // Gérer l'affichage des boutons de fin de partie pour les non-hôtes
    if (!isHost) {
        nextRoundBtn.classList.add('hidden');
        newGameBtn.classList.add('hidden');
    }
}

// Sélectionner une carte
function selectCardToPlay(card) {
    selectedCard = card;
    database.ref('games/' + gameCode + '/players/' + playerId + '/selectedCard').set(card);
}

// Jouer la carte
playCardBtn.addEventListener('click', () => {
    database.ref('games/' + gameCode + '/players/' + playerId).once('value', (snapshot) => {
        const player = snapshot.val();
        if (player.selectedCard && !player.ready) { // Vérifier que le joueur n'est pas déjà prêt
            database.ref('games/' + gameCode + '/players/' + playerId + '/ready').set(true)
                .then(() => {
                    playCardBtn.textContent = 'En attente des autres...'; // Mise à jour immédiate du texte
                    checkAllPlayersReady();
                });
        }
    });
});

// Vérifier si tous les joueurs sont prêts
function checkAllPlayersReady() {
    database.ref('games/' + gameCode + '/players').once('value', (snapshot) => {
        const players = snapshot.val();
        // Filtrer les spectateurs/joueurs sans main si nécessaire, mais ici on compte tous ceux connectés
        const allReady = Object.values(players).every(p => p.ready);
        
        if (allReady && isHost) {
            resolveRound();
        }
    });
}

// Résoudre la manche (seulement l'hôte exécute ceci)
function resolveRound() {
    database.ref('games/' + gameCode).once('value', (snapshot) => {
        const game = snapshot.val();
        const players = game.players;
        
        // Collecter toutes les cartes jouées et les trier (du plus petit au plus grand)
        const playedCards = Object.entries(players)
            .filter(([id, p]) => p.selectedCard !== null) // Ne prendre que les joueurs qui ont joué
            .map(([id, p]) => ({
                playerId: id,
                playerName: p.name,
                card: p.selectedCard
            })).sort((a, b) => a.card - b.card);
        
        // Afficher les cartes révélées et passer en phase de résolution
        database.ref('games/' + gameCode + '/revealed').set(playedCards);
        database.ref('games/' + gameCode + '/phase').set('resolution');
        
        // Traitement des cartes jouées
        let rows = [...game.rows];
        const updates = {};
        
        playedCards.forEach(played => {
            const result = placeCard(played.card, rows);
            rows = result.rows;
            
            // Mettre à jour la pénalité si une rangée a été prise
            if (result.penalty > 0) {
                updates['games/' + gameCode + '/players/' + played.playerId + '/penalty'] = 
                    (players[played.playerId].penalty || 0) + result.penalty;
            }
            
            // Mettre à jour l'état du joueur
            const newHand = players[played.playerId].hand.filter(c => c !== played.card);
            updates['games/' + gameCode + '/players/' + played.playerId + '/hand'] = newHand;
            updates['games/' + gameCode + '/players/' + played.playerId + '/selectedCard'] = null;
            updates['games/' + gameCode + '/players/' + played.playerId + '/ready'] = false;
        });
        
        updates['games/' + gameCode + '/rows'] = rows;
        updates['games/' + gameCode + '/round'] = (game.round || 0) + 1;
        
        // Vérifier si la partie est terminée (main vide pour un joueur)
        const isGameEnd = Object.values(players).some(p => p.hand.length === 1); // La carte jouée est la dernière
        
        if (isGameEnd) {
            updates['games/' + gameCode + '/phase'] = 'gameEnd';
        } else {
            updates['games/' + gameCode + '/phase'] = 'roundEnd';
        }
        
        database.ref().update(updates);
    });
}

// Placer une carte sur les rangées (Logique de jeu corrigée)
function placeCard(card, rows) {
    let bestRow = -1;
    let smallestDiff = Infinity;
    
    // 1. Trouver la meilleure rangée (différence positive minimale)
    rows.forEach((row, index) => {
        const lastCard = row[row.length - 1];
        if (card > lastCard) { // La carte doit être plus grande
            const diff = card - lastCard;
            if (diff < smallestDiff) {
                smallestDiff = diff;
                bestRow = index;
            }
        }
    });
    
    let penalty = 0;
    // On travaille sur une copie des rangées pour éviter les side-effects avant la fin du placement
    const newRows = rows.map(r => [...r]);
    
    if (bestRow === -1) {
        // 2. Carte trop petite : prendre la rangée avec le moins de pénalités
        let minPenalty = Infinity;
        let rowToPick = 0;
        
        // Trouver la rangée avec le score de pénalité le plus faible
        newRows.forEach((row, index) => {
            const currentPenalty = row.reduce((sum, c) => sum + getCardPoints(c), 0);
            if (currentPenalty < minPenalty) {
                minPenalty = currentPenalty;
                rowToPick = index;
            }
        });

        penalty = minPenalty;
        newRows[rowToPick] = [card]; // Remplacer la rangée par la nouvelle carte
    } else if (newRows[bestRow].length === 5) {
        // 3. Rangée pleine (5 cartes) : prendre la rangée
        penalty = newRows[bestRow].reduce((sum, c) => sum + getCardPoints(c), 0);
        newRows[bestRow] = [card]; // Remplacer la rangée par la nouvelle carte
    } else {
        // 4. Ajouter normalement à la rangée
        newRows[bestRow].push(card);
    }
    
    return { rows: newRows, penalty };
}

// Manche suivante
nextRoundBtn.addEventListener('click', () => {
    if (isHost) {
        database.ref('games/' + gameCode + '/phase').set('selection');
        database.ref('games/' + gameCode + '/revealed').set([]);
        nextRoundBtn.classList.add('hidden');
    }
});

// Nouvelle partie
newGameBtn.addEventListener('click', () => {
    if (isHost) {
        initializeGame();
        newGameBtn.classList.add('hidden');
    }
});

// ------------------------------------------------------------------
// --- LOGIQUE DE PERSISTANCE DE SESSION (Pour la correction du rechargement) ---
// ------------------------------------------------------------------

/**
 * Vérifie si une session existe dans le localStorage et la reprend
 */
function checkSessionAndResume() {
    const session = loadSession(); // Utilise la fonction de utils.js

    if (session) {
        gameCode = session.code;
        playerName = session.name;
        playerId = session.id;
        isHost = session.isHost;
        isSpectator = localStorage.getItem('gameMode') === 'spectator';

        // Cacher l'écran de setup
        setupScreen.classList.add('hidden');
        displayGameCode.textContent = gameCode;
        
        // Si c'est un spectateur, on passe directement au jeu
        if (isSpectator) {
             gameScreen.classList.remove('hidden');
             spectatorBanner.classList.remove('hidden');
             listenToGame();
             return;
        }

        // Vérifier le statut actuel du jeu dans Firebase
        database.ref('games/' + gameCode).once('value', (snapshot) => {
            const game = snapshot.val();

            if (!game) {
                 // Si le jeu n'existe plus, on efface la session
                 localStorage.clear();
                 return;
            }

            const status = game.status;
            if (status === 'waiting') {
                waitingRoom.classList.remove('hidden');
                listenToPlayers(); // Reprendre l'écoute des joueurs
            } else if (status === 'playing') {
                gameScreen.classList.remove('hidden');
                playerHand.classList.remove('hidden');
                listenToGame(); // Reprendre l'écoute du jeu
            }
        });
    }
}