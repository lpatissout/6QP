// ⚠️ CONFIGURATION FIREBASE - À VÉRIFIER ⚠️
const firebaseConfig = {
    apiKey: "AIzaSyDSexBnuNNTWaMIpC9drT2zOX-pgcUM99I", // Assurez-vous que cette clé est la bonne
    authDomain: "qui-prend.firebaseapp.com",
    databaseURL: "https://qui-prend-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "qui-prend",
    storageBucket: "qui-prend.firebasestorage.app",
    messagingSenderId: "685422838277",
    appId: "1:685422838277:web:b7cd07ddf2651241a4526c"
};

// Initialisation de Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let gameCode = '';
let playerName = '';
let playerId = '';
let isHost = false;
let isSpectator = false;
let selectedCard = null;

// S'assure que le DOM est complètement chargé avant de manipuler les éléments
document.addEventListener('DOMContentLoaded', () => {

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
            
            if (game.status !== 'waiting') {
                alert('Cette partie a déjà commencé !');
                return;
            }
            
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
                
                if (isHost && playerCount >= 2) {
                    startGameBtn.classList.remove('hidden');
                    // Désactiver si le max est atteint
                    if (playerCount < game.maxPlayers) {
                        startGameBtn.textContent = `Démarrer la partie (${playerCount}/${game.maxPlayers})`;
                        startGameBtn.disabled = false;
                    } else {
                        startGameBtn.textContent = `Démarrer la partie (Complet)`;
                        startGameBtn.disabled = false;
                    }
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
                // Distrbue 10 cartes triées
                const hand = deck.splice(0, cardsPerPlayer).sort((a, b) => a - b);
                updates['games/' + gameCode + '/players/' + id + '/hand'] = hand;
                updates['games/' + gameCode + '/players/' + id + '/penalty'] = 0;
                updates['games/' + gameCode + '/players/' + id + '/selectedCard'] = null;
                updates['games/' + gameCode + '/players/' + id + '/ready'] = false;
            });
            
            // Initialise les 4 rangées
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
            
            // L'hôte vérifie si toutes les cartes ont été jouées pour ce tour
            if (isHost && game.phase === 'selection') {
                const players = game.players || {};
                const readyPlayers = Object.values(players).filter(p => p.ready).length;
                
                // Si tous les joueurs sont prêts, l'hôte lance la résolution
                if (readyPlayers === Object.keys(players).length && readyPlayers > 0) {
                    resolveRound();
                }
            }
        });
    }

    // Mettre à jour l'affichage du jeu
    function updateGameDisplay(game) {
        
        // --- Afficher les rangées ---
        rowsContainer.innerHTML = '';
        (game.rows || []).forEach((row, index) => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'row';
            rowDiv.innerHTML = `<div class="row-label">Rangée ${index + 1}</div>`;
            row.forEach(card => {
                rowDiv.innerHTML += createCardHTML(card);
            });
            rowsContainer.appendChild(rowDiv);
        });
        
        // --- Afficher les cartes révélées ---
        if (game.revealed && game.revealed.length > 0) {
            revealedContainer.classList.remove('hidden');
            revealedCards.innerHTML = '';
            game.revealed.forEach(item => {
                // Utilisation d'un élément div pour afficher le nom du joueur sous la carte
                revealedCards.innerHTML += `<div class="card">${item.card}<div class="card-points">${getCardPoints(item.card)}</div><div style="font-size: 0.7em; margin-top: 5px;">${item.playerName}</div></div>`;
            });
        } else {
            revealedContainer.classList.add('hidden');
        }
        
        // --- Afficher la main du joueur ---
        if (!isSpectator && game.players && game.players[playerId]) {
            const myHand = game.players[playerId].hand || [];
            handCards.innerHTML = '';
            myHand.forEach(card => {
                const cardDiv = document.createElement('div');
                cardDiv.className = 'card';
                
                const cardIsSelected = game.players[playerId].selectedCard === card;
                const otherCardIsSelected = game.players[playerId].selectedCard && !cardIsSelected;
                
                if (cardIsSelected) {
                    cardDiv.classList.add('selected');
                }
                if (otherCardIsSelected || game.players[playerId].ready) {
                    cardDiv.classList.add('disabled');
                }
                
                cardDiv.innerHTML = `${card}<div class="card-points">${getCardPoints(card)}</div>`;
                cardDiv.onclick = () => {
                    if (!otherCardIsSelected && !game.players[playerId].ready) {
                        selectCardToPlay(card);
                    }
                };
                handCards.appendChild(cardDiv);
            });
            
            // Le bouton Jouer est activé si une carte est sélectionnée ET que le joueur n'est pas déjà prêt.
            playCardBtn.disabled = !game.players[playerId].selectedCard || game.players[playerId].ready;
        }
        
        // --- Afficher les scores ---
        scoresContainer.innerHTML = '';
        Object.entries(game.players || {}).forEach(([id, player]) => {
            const scoreDiv = document.createElement('div');
            scoreDiv.className = 'score-item';
            
            let status = '';
            if (player.ready) {
                status = ' ✓'; // Prêt à jouer ou a joué
            } else if (player.selectedCard && game.phase === 'selection') {
                status = ' ⏳'; // Carte sélectionnée, en attente
            }
            
            scoreDiv.innerHTML = `<span>${player.name}${status}</span><span>🐮 ${player.penalty}</span>`;
            scoresContainer.appendChild(scoreDiv);
        });
        
        // --- Mettre à jour le statut du jeu et les boutons ---
        nextRoundBtn.classList.add('hidden');
        newGameBtn.classList.add('hidden');
        
        if (game.phase === 'selection') {
            gameStatus.textContent = 'Sélectionnez une carte à jouer';
        } else if (game.phase === 'resolution') {
            gameStatus.textContent = 'Résolution en cours...';
        } else if (game.phase === 'roundEnd') {
            gameStatus.textContent = `Manche ${game.round} terminée ! ${game.players[playerId]?.hand.length} cartes restantes.`;
            if (isHost) {
                nextRoundBtn.classList.remove('hidden');
            }
        } else if (game.phase === 'gameEnd') {
            const sortedPlayers = Object.values(game.players).sort((a, b) => a.penalty - b.penalty);
            const winner = sortedPlayers[0];
            gameStatus.textContent = `🏆 ${winner.name} gagne avec ${winner.penalty} pénalités !`;
            if (isHost) {
                newGameBtn.classList.remove('hidden');
            }
        }
    }

    // Sélectionner une carte
function selectCardToPlay(card) {
    let newSelectedCard = null;
    
    // Récupérer la carte actuellement sélectionnée par le joueur dans la base de données (si elle existe)
    // NOTE: Pour éviter un appel DB synchrone ici, on se base sur la variable locale selectedCard 
    // qui est mise à jour par l'écoute Firebase (ce qui est la bonne approche asynchrone).
    
    if (selectedCard === card) {
        // Si la carte cliquée est DÉJÀ sélectionnée, on la désélectionne (newSelectedCard reste null)
        selectedCard = null; 
    } else {
        // Sinon, on sélectionne la nouvelle carte
        newSelectedCard = card;
        selectedCard = card;
    }
    
    // Met à jour la base de données avec la nouvelle sélection (ou null si désélectionnée)
    database.ref('games/' + gameCode + '/players/' + playerId + '/selectedCard').set(newSelectedCard);
}
    // Jouer la carte
    playCardBtn.addEventListener('click', () => {
        database.ref('games/' + gameCode + '/players/' + playerId).once('value', (snapshot) => {
            const player = snapshot.val();
            if (player.selectedCard) {
                // Marque le joueur comme prêt pour la résolution
                database.ref('games/' + gameCode + '/players/' + playerId + '/ready').set(true);
            }
        });
    });

    // Résoudre la manche (appelé UNIQUEMENT par l'hôte)
    function resolveRound() {
        database.ref('games/' + gameCode).once('value', (snapshot) => {
            const game = snapshot.val();
            const players = game.players;
            
            // Collecter et trier toutes les cartes jouées
            const playedCards = Object.entries(players)
                .map(([id, p]) => ({
                    playerId: id,
                    playerName: p.name,
                    card: p.selectedCard
                }))
                .filter(p => p.card !== null)
                .sort((a, b) => a.card - b.card);
            
            // Afficher les cartes révélées et passer en phase résolution
            const updates = {};
            updates['games/' + gameCode + '/revealed'] = playedCards;
            updates['games/' + gameCode + '/phase'] = 'resolution';
            
            let rows = [...game.rows];
            
            // Résoudre chaque carte dans l'ordre croissant
            playedCards.forEach(played => {
                const result = placeCard(played.card, rows);
                rows = result.rows;
                
                if (result.penalty > 0) {
                    // Ajoute la pénalité au joueur
                    updates['games/' + gameCode + '/players/' + played.playerId + '/penalty'] = 
                        (players[played.playerId].penalty || 0) + result.penalty;
                }
                
                // Retirer la carte de la main et réinitialiser l'état du joueur
                const newHand = players[played.playerId].hand.filter(c => c !== played.card);
                updates['games/' + gameCode + '/players/' + played.playerId + '/hand'] = newHand;
                updates['games/' + gameCode + '/players/' + played.playerId + '/selectedCard'] = null;
                updates['games/' + gameCode + '/players/' + played.playerId + '/ready'] = false;
            });
            
            updates['games/' + gameCode + '/rows'] = rows;
            
            // Vérifier si la partie est terminée (main vide)
            const firstPlayer = Object.values(players)[0];
            if (firstPlayer.hand.length === 1) { // 1 carte restante = dernière carte jouée
                updates['games/' + gameCode + '/phase'] = 'gameEnd';
            } else {
                updates['games/' + gameCode + '/phase'] = 'roundEnd';
            }
            
            database.ref().update(updates);
        });
    }

    // Manche suivante
    nextRoundBtn.addEventListener('click', () => {
        database.ref('games/' + gameCode).once('value', (snapshot) => {
            const game = snapshot.val();
            const updates = {};
            
            updates['games/' + gameCode + '/phase'] = 'selection';
            updates['games/' + gameCode + '/revealed'] = [];
            updates['games/' + gameCode + '/round'] = (game.round || 0) + 1;
            
            database.ref().update(updates);
        });
        
    });

    // Nouvelle partie (Ré-initialise tout)
    newGameBtn.addEventListener('click', () => {
        initializeGame();
    });

});
