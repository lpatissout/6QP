// Point d'entrée et initialisation

// Générer un ID unique pour le joueur
function generatePlayerId() {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Initialisation du jeu 6 qui prend !');
    
    // Initialiser Firebase
    initFirebase();
    
    // Vérifier si on doit rejoindre une partie via URL
    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get('join');
    if (joinCode) {
        document.getElementById('game-code').value = joinCode.toUpperCase();
    }
    
    // Générer un ID pour le joueur
    AppState.player.id = generatePlayerId();
    
    // Événements de l'écran Home
    setupHomeScreen();
    
    // Événements de l'écran Lobby
    setupLobbyScreen();
    
    // Événements de l'écran Game
    setupGameScreen();
    
    // Événements de l'écran End
    setupEndScreen();
    
    console.log('✅ Interface initialisée');
});

/**
 * Configure les événements de l'écran Home
 */
function setupHomeScreen() {
    const createBtn = document.getElementById('btn-create-game');
    const joinBtn = document.getElementById('btn-join-game');
    const playerNameInput = document.getElementById('player-name');
    const gameCodeInput = document.getElementById('game-code');
    
    // Entrée sur le champ nom
    playerNameInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            createBtn?.click();
        }
    });
    
    // Entrée sur le champ code
    gameCodeInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinBtn?.click();
        }
    });
    
    // Créer une partie
    createBtn?.addEventListener('click', async () => {
        const playerName = playerNameInput?.value.trim();
        if (!playerName) {
            UI.showError('Veuillez entrer un pseudo');
            return;
        }
        
        AppState.player.name = playerName;
        
        try {
            const gameCode = generateGameCode();
            await createGame(gameCode, AppState.player.id, playerName);
            
            AppState.game.code = gameCode;
            AppState.game.hostId = AppState.player.id;
            
            // Écouter les changements
            startListeningToGame(gameCode);
            
            // Afficher le lobby
            UI.showLobby(gameCode, [{
                id: AppState.player.id,
                name: playerName,
                ready: false
            }], true);
        } catch (error) {
            console.error('❌ Erreur création partie:', error);
            UI.showError('Erreur lors de la création de la partie');
        }
    });
    
    // Rejoindre une partie
    joinBtn?.addEventListener('click', async () => {
        const playerName = playerNameInput?.value.trim();
        const gameCode = gameCodeInput?.value.trim().toUpperCase();
        
        if (!playerName) {
            UI.showError('Veuillez entrer un pseudo');
            return;
        }
        
        if (!gameCode || gameCode.length !== 6) {
            UI.showError('Code de partie invalide (6 caractères requis)');
            return;
        }
        
        AppState.player.name = playerName;
        
        try {
            await joinGame(gameCode, AppState.player.id, playerName);
            
            AppState.game.code = gameCode;
            
            // Écouter les changements
            startListeningToGame(gameCode);
        } catch (error) {
            console.error('❌ Erreur rejoindre partie:', error);
            UI.showError(error.message || 'Erreur lors de la connexion à la partie');
        }
    });
}

/**
 * Configure les événements de l'écran Lobby
 */
function setupLobbyScreen() {
    const readyBtn = document.getElementById('btn-ready');
    const startBtn = document.getElementById('btn-start-game');
    const leaveBtn = document.getElementById('btn-leave-lobby');
    const copyBtn = document.getElementById('btn-copy-link');
    
    // Bouton Prêt
    readyBtn?.addEventListener('click', async () => {
        try {
            const newReadyState = !AppState.isReady;
            await updatePlayerReady(AppState.game.code, AppState.player.id, newReadyState);
            AppState.isReady = newReadyState;
            
            if (newReadyState) {
                readyBtn.textContent = '❌ Annuler';
                readyBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
                readyBtn.classList.add('bg-gray-500', 'hover:bg-gray-600');
            } else {
                readyBtn.textContent = '✅ Je suis prêt !';
                readyBtn.classList.remove('bg-gray-500', 'hover:bg-gray-600');
                readyBtn.classList.add('bg-green-500', 'hover:bg-green-600');
            }
        } catch (error) {
            console.error('❌ Erreur update ready:', error);
        }
    });
    
    // Bouton Lancer
    startBtn?.addEventListener('click', async () => {
        try {
            await startGame(AppState.game.code);
        } catch (error) {
            console.error('❌ Erreur démarrage:', error);
            UI.showError('Erreur lors du démarrage de la partie');
        }
    });
    
    // Bouton Quitter
    leaveBtn?.addEventListener('click', async () => {
        try {
            await leaveGame(AppState.game.code, AppState.player.id);
            StateHelpers.reset();
            UI.showScreen('home');
            
            // Détacher l'écoute
            if (AppState.firebaseRefs.gameListener) {
                AppState.firebaseRefs.gameListener();
            }
        } catch (error) {
            console.error('❌ Erreur quitter:', error);
        }
    });
    
    // Bouton Copier lien
    copyBtn?.addEventListener('click', () => {
        const gameCode = AppState.game.code;
        const link = `${window.location.origin}${window.location.pathname}?join=${gameCode}`;
        
        navigator.clipboard.writeText(link).then(() => {
            copyBtn.textContent = '✅ Copié !';
            setTimeout(() => {
                copyBtn.textContent = '📋 Copier';
            }, 2000);
        }).catch(() => {
            // Fallback pour navigateurs sans clipboard API
            const textarea = document.createElement('textarea');
            textarea.value = link;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            copyBtn.textContent = '✅ Copié !';
            setTimeout(() => {
                copyBtn.textContent = '📋 Copier';
            }, 2000);
        });
    });
}

/**
 * Configure les événements de l'écran Game
 */
function setupGameScreen() {
    const leaveBtn = document.getElementById('btn-leave-game');
    
    leaveBtn?.addEventListener('click', async () => {
        if (confirm('Êtes-vous sûr de vouloir quitter la partie ?')) {
            try {
                await leaveGame(AppState.game.code, AppState.player.id);
                StateHelpers.reset();
                UI.showScreen('home');
                
                // Détacher l'écoute
                if (AppState.firebaseRefs.gameListener) {
                    AppState.firebaseRefs.gameListener();
                }
            } catch (error) {
                console.error('❌ Erreur quitter:', error);
            }
        }
    });
}

/**
 * Configure les événements de l'écran End
 */
function setupEndScreen() {
    const replayBtn = document.getElementById('btn-replay');
    const leaveBtn = document.getElementById('btn-leave-end');
    
    replayBtn?.addEventListener('click', async () => {
        // Réinitialiser la partie
        try {
            const gameCode = AppState.game.code;
            await updateGameState(gameCode, {
                status: GAME_STATUS.WAITING,
                round: 1,
                turn: 1,
                rows: [[], [], [], []],
                waitingForChoice: null,
                pendingCard: null
            });
            
            // Réinitialiser les joueurs
            const playersRef = database.ref(`games/${gameCode}/players`);
            const snapshot = await playersRef.once('value');
            const players = snapshot.val();
            
            if (Array.isArray(players)) {
                for (let i = 0; i < players.length; i++) {
                    await playersRef.child(`${i}/score`).set(0);
                    await playersRef.child(`${i}/hand`).set([]);
                    await playersRef.child(`${i}/playedCard`).set(null);
                    await playersRef.child(`${i}/ready`).set(false);
                }
            } else {
                const playerKeys = Object.keys(players);
                for (const key of playerKeys) {
                    await playersRef.child(`${key}/score`).set(0);
                    await playersRef.child(`${key}/hand`).set([]);
                    await playersRef.child(`${key}/playedCard`).set(null);
                    await playersRef.child(`${key}/ready`).set(false);
                }
            }
            
            // Retourner au lobby
            UI.showLobby(gameCode, Object.values(players), StateHelpers.isHost());
        } catch (error) {
            console.error('❌ Erreur rejouer:', error);
        }
    });
    
    leaveBtn?.addEventListener('click', async () => {
        try {
            await leaveGame(AppState.game.code, AppState.player.id);
            StateHelpers.reset();
            UI.showScreen('home');
            
            // Détacher l'écoute
            if (AppState.firebaseRefs.gameListener) {
                AppState.firebaseRefs.gameListener();
            }
        } catch (error) {
            console.error('❌ Erreur quitter:', error);
        }
    });
}

/**
 * Démarre l'écoute des changements de la partie
 */
function startListeningToGame(gameCode) {
    // Détacher l'ancienne écoute si elle existe
    if (AppState.firebaseRefs.gameListener) {
        AppState.firebaseRefs.gameListener();
    }
    
    // Démarrer la nouvelle écoute
    AppState.firebaseRefs.gameListener = listenToGame(gameCode, (gameData) => {
        // Convertir les joueurs en tableau si nécessaire
        if (gameData.players && !Array.isArray(gameData.players)) {
            gameData.players = Object.values(gameData.players);
        }
        
        // Mettre à jour l'état
        AppState.game = {
            ...AppState.game,
            ...gameData,
            players: gameData.players || []
        };
        
        // Mettre à jour l'UI selon le statut
        if (gameData.status === GAME_STATUS.WAITING) {
            UI.showLobby(gameCode, gameData.players, StateHelpers.isHost());
        } else if (gameData.status === GAME_STATUS.PLAYING) {
            UI.showGame();
            UI.updateGameUI();
            
            // Traiter le tour si nécessaire
            processTurn();
        } else if (gameData.status === GAME_STATUS.FINISHED) {
            // L'écran de fin sera affiché par game-flow.js
        }
        
        // Gérer le choix de rangée forcé
        if (gameData.waitingForChoice === AppState.player.id && gameData.pendingCard) {
            const rows = gameData.rows || [[], [], [], []];
            UI.showRowChoiceModal(rows, gameData.pendingCard);
        }
    });
}

