// Rendu de l'interface utilisateur

const UI = {
    /**
     * Affiche un écran et cache les autres
     */
    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        const targetScreen = document.getElementById(`screen-${screenName}`);
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
        }
        AppState.currentScreen = screenName;
    },
    
    /**
     * Affiche un message d'erreur
     */
    showError(message) {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
            setTimeout(() => {
                errorDiv.classList.add('hidden');
            }, 5000);
        }
    },
    
    /**
     * Affiche l'écran lobby
     */
    showLobby(gameCode, players, isHost) {
        this.showScreen('lobby');
        
        // Afficher le code
        const codeElement = document.getElementById('lobby-game-code');
        if (codeElement) {
            codeElement.textContent = gameCode;
        }
        
        // Afficher la liste des joueurs
        this.updateLobbyPlayers(players, isHost);
        
        // Afficher/masquer le bouton start
        const startBtn = document.getElementById('btn-start-game');
        if (startBtn) {
            if (isHost && players.length >= 2 && players.every(p => p.ready)) {
                startBtn.classList.remove('hidden');
            } else {
                startBtn.classList.add('hidden');
            }
        }
    },
    
    /**
     * Met à jour la liste des joueurs dans le lobby
     */
    updateLobbyPlayers(players, isHost) {
        const listElement = document.getElementById('lobby-players-list');
        if (!listElement) return;
        
        listElement.innerHTML = '';
        
        // Convertir l'objet Firebase en tableau si nécessaire
        const playersArray = Array.isArray(players) ? players : Object.values(players || {});
        
        playersArray.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
            
            const isPlayerHost = player.id === AppState.game.hostId;
            const isLocalPlayer = player.id === AppState.player.id;
            
            playerDiv.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="font-semibold">${player.name}</span>
                    ${isPlayerHost ? '<span class="text-xs bg-orange-500 text-white px-2 py-1 rounded">Hôte</span>' : ''}
                    ${isLocalPlayer ? '<span class="text-xs bg-blue-500 text-white px-2 py-1 rounded">Vous</span>' : ''}
                </div>
                <div>
                    ${player.ready ? '<span class="text-green-600">✅ Prêt</span>' : '<span class="text-gray-400">⏳ En attente</span>'}
                </div>
            `;
            
            listElement.appendChild(playerDiv);
        });
    },
    
    /**
     * Affiche l'écran de jeu
     */
    showGame() {
        this.showScreen('game');
        this.updateGameUI();
    },
    
    /**
     * Met à jour l'interface de jeu
     */
    updateGameUI() {
        const game = AppState.game;
        
        // Mettre à jour round/turn
        const roundElement = document.getElementById('current-round');
        const turnElement = document.getElementById('current-turn');
        if (roundElement) roundElement.textContent = game.round;
        if (turnElement) turnElement.textContent = game.turn;
        
        // Mettre à jour les scores
        this.updateScores(game.players);
        
        // Mettre à jour les rangées
        this.updateRows(game.rows);
        
        // Mettre à jour la main du joueur
        const localPlayer = StateHelpers.getLocalPlayer();
        if (localPlayer) {
            this.updateHand(localPlayer.hand, localPlayer.playedCard);
        }
        
        // Mettre à jour le statut
        this.updateGameStatus();
    },
    
    /**
     * Met à jour l'affichage des scores
     */
    updateScores(players) {
        const scoresElement = document.getElementById('game-scores');
        if (!scoresElement) return;
        
        scoresElement.innerHTML = '';
        
        // Convertir en tableau si nécessaire
        const playersArray = Array.isArray(players) ? players : Object.values(players || {});
        
        playersArray.forEach(player => {
            const scoreDiv = document.createElement('div');
            const isLocalPlayer = player.id === AppState.player.id;
            scoreDiv.className = `px-4 py-2 rounded-lg ${isLocalPlayer ? 'bg-orange-100 font-bold' : 'bg-gray-100'}`;
            scoreDiv.innerHTML = `
                <span>${player.name}: </span>
                <span class="text-orange-600">${player.score} 🐮</span>
            `;
            scoresElement.appendChild(scoreDiv);
        });
    },
    
    /**
     * Met à jour l'affichage des rangées
     */
    updateRows(rows) {
        const rowsElement = document.getElementById('game-rows');
        if (!rowsElement) return;
        
        rowsElement.innerHTML = '';
        
        rows.forEach((row, index) => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'bg-gray-50 rounded-lg p-4';
            rowDiv.setAttribute('data-row-index', index);
            
            const rowTitle = document.createElement('h4');
            rowTitle.className = 'text-sm font-semibold mb-2 text-gray-600';
            rowTitle.textContent = `Rangée ${index + 1}`;
            rowDiv.appendChild(rowTitle);
            
            const cardsDiv = document.createElement('div');
            cardsDiv.className = 'flex gap-2 flex-wrap';
            
            row.forEach(card => {
                const cardElement = this.createCardElement(card, false);
                cardsDiv.appendChild(cardElement);
            });
            
            rowDiv.appendChild(cardsDiv);
            rowsElement.appendChild(rowDiv);
        });
    },
    
    /**
     * Met à jour l'affichage de la main du joueur
     */
    updateHand(hand, playedCard) {
    const handElement = document.getElementById('player-hand');
    if (!handElement) return;
    
    handElement.innerHTML = '';
    
    if (!hand || hand.length === 0) {
        handElement.innerHTML = '<p class="text-gray-500">Aucune carte</p>';
        return;
    }
    
    // ✅ CORRECTION : Vérifier strictement si le joueur a joué
    const hasAlreadyPlayed = playedCard !== null && 
                             playedCard !== undefined && 
                             typeof playedCard === 'number';
    
    hand.forEach(card => {
        const cardElement = this.createCardElement(card, true);
        
        // Si c'est la carte sélectionnée
        if (AppState.selectedCard === card && !hasAlreadyPlayed) {
            cardElement.classList.add('ring-4', 'ring-orange-500', 'scale-110');
        }
        
        // ✅ CORRECTION : Event listener sans condition bloquante
        if (!hasAlreadyPlayed) {
            cardElement.addEventListener('click', () => {
                this.selectCard(card);
            });
            cardElement.classList.add('cursor-pointer', 'hover:scale-105');
        } else {
            // Si le joueur a déjà joué, griser toutes les cartes
            cardElement.classList.add('opacity-50', 'cursor-not-allowed');
        }
        
        handElement.appendChild(cardElement);
    });
    
    // ✅ NOUVEAU : Bouton de confirmation
    if (AppState.selectedCard && !hasAlreadyPlayed) {
        const confirmBtn = document.createElement('button');
        confirmBtn.id = 'btn-confirm-card';
        confirmBtn.className = 'mt-6 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-lg transition-colors shadow-lg text-lg';
        confirmBtn.innerHTML = `🎯 Jouer la carte <span class="font-black">${AppState.selectedCard}</span>`;
        confirmBtn.addEventListener('click', () => {
            this.confirmCardSelection(AppState.selectedCard);
        });
        handElement.appendChild(confirmBtn);
    }
},
    
    /**
     * Crée un élément de carte
     */
    createCardElement(cardNumber, clickable = false) {
        const cardDiv = document.createElement('div');
        const heads = calculateHeads(cardNumber);
        const colorClass = getCardColorClass(cardNumber);
        
        cardDiv.className = `relative ${colorClass} text-white font-bold rounded-lg shadow-md transition-all cursor-pointer`;
        cardDiv.style.width = '80px';
        cardDiv.style.height = '120px';
        cardDiv.style.minWidth = '80px';
        
        if (clickable) {
            cardDiv.classList.add('hover:scale-105', 'hover:shadow-lg');
        }
        
        cardDiv.innerHTML = `
            <div class="absolute inset-0 flex flex-col items-center justify-center p-2">
                <div class="text-2xl font-bold">${cardNumber}</div>
                <div class="text-sm mt-2">${'🐮'.repeat(heads)}</div>
                <div class="text-xs mt-1">${heads} tête${heads > 1 ? 's' : ''}</div>
            </div>
        `;
        
        return cardDiv;
    },
    
    /**
     * Sélectionne une carte
     */
    selectCard(card) {
    const localPlayer = StateHelpers.getLocalPlayer();
    if (!localPlayer) return;
    
    // ✅ Vérifier qu'on n'a pas déjà joué
    const hasPlayed = localPlayer.playedCard !== null && 
                     localPlayer.playedCard !== undefined && 
                     typeof localPlayer.playedCard === 'number';
    
    if (hasPlayed) {
        console.warn('⚠️ Vous avez déjà joué une carte');
        return;
    }
    
    // Sélectionner la carte
    AppState.selectedCard = card;
    console.log('🎯 Carte sélectionnée:', card);
    
    // Rafraîchir l'affichage
    this.updateHand(localPlayer.hand, localPlayer.playedCard);
    this.updateGameStatus();
},
    
    /**
     * Confirme la sélection d'une carte
     * ✅ CORRECTION : Vérifications strictes + mise à jour complète de l'UI
     */
    async confirmCardSelection(card) {
        const localPlayer = StateHelpers.getLocalPlayer();
        if (!localPlayer) {
            UI.showError('Joueur introuvable');
            return;
        }
        
        // ✅ CORRECTION : Vérification stricte avec type checking
        const hasPlayed = localPlayer.playedCard !== null && 
                         localPlayer.playedCard !== undefined && 
                         typeof localPlayer.playedCard === 'number';
        
        if (hasPlayed) {
            console.warn('⚠️ Carte déjà jouée');
            UI.showError('Vous avez déjà joué votre carte pour ce tour');
            AppState.selectedCard = null;
            this.updateHand(localPlayer.hand, localPlayer.playedCard);
            return;
        }
        
        // Vérifier que la carte est toujours dans la main
        if (!localPlayer.hand || !localPlayer.hand.includes(card)) {
            UI.showError('Cette carte n\'est plus dans votre main');
            AppState.selectedCard = null;
            this.updateHand(localPlayer.hand, localPlayer.playedCard);
            return;
        }
        
        try {
            console.log('✅ Confirmation de la carte:', card);
            
            // Désactiver le bouton pendant l'envoi
            const confirmBtn = document.getElementById('btn-confirm-card');
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.textContent = '⏳ Envoi...';
            }
            
            await playCard(AppState.game.code, AppState.player.id, card);
            AppState.selectedCard = null;
            
            // ✅ CORRECTION : Rafraîchir complètement l'UI
            this.updateGameUI();
            
        } catch (error) {
            console.error('❌ Erreur confirmation carte:', error);
            UI.showError(error.message || 'Erreur lors de la sélection de la carte');
            
            // Réactiver le bouton en cas d'erreur
            const confirmBtn = document.getElementById('btn-confirm-card');
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = `🎯 Jouer la carte <span class="font-black">${card}</span>`;
            }
        }
    },
    
    /**
     * Met à jour le statut du jeu
     */
    updateGameStatus() {
    const statusElement = document.getElementById('game-status');
    if (!statusElement) return;
    
    const localPlayer = StateHelpers.getLocalPlayer();
    if (!localPlayer) {
        statusElement.innerHTML = '<span class="text-gray-500">⏳ Chargement...</span>';
        return;
    }
    
    // ✅ CORRECTION : Vérification stricte avec type checking
    const hasPlayedCard = localPlayer.playedCard !== null && 
                         localPlayer.playedCard !== undefined && 
                         typeof localPlayer.playedCard === 'number';
    
    if (hasPlayedCard) {
        statusElement.innerHTML = '<span class="text-green-600 text-lg font-semibold">✅ Vous avez joué votre carte</span>';
        
        // Afficher qui attend encore
        const waitingPlayers = AppState.game.players.filter(p => {
            const pHasPlayed = p.playedCard !== null && 
                              p.playedCard !== undefined && 
                              typeof p.playedCard === 'number';
            return !pHasPlayed && p.id !== AppState.player.id;
        });
        
        if (waitingPlayers.length > 0) {
            const names = waitingPlayers.map(p => p.name).join(', ');
            statusElement.innerHTML += `<br><span class="text-gray-600">⏳ En attente de : ${names}</span>`;
        } else {
            statusElement.innerHTML += `<br><span class="text-blue-600 animate-pulse">⚡ Résolution du tour...</span>`;
        }
    } else {
        // Messages selon l'état de sélection
        if (AppState.selectedCard) {
            statusElement.innerHTML = '<span class="text-orange-600 text-lg font-semibold animate-pulse">👇 Cliquez sur "Jouer la carte" pour confirmer</span>';
        } else {
            statusElement.innerHTML = '<span class="text-orange-600 text-lg">🎯 Sélectionnez une carte à jouer</span>';
        }
    }
},
    
    /**
     * Affiche la zone de révélation
     */
    showRevealZone(playedCards) {
        const revealZone = document.getElementById('reveal-zone');
        const revealedCards = document.getElementById('revealed-cards');
        
        if (!revealZone || !revealedCards) return;
        
        revealZone.classList.remove('hidden');
        revealedCards.innerHTML = '';
        
        playedCards.forEach(({ playerName, card }) => {
            const cardElement = this.createCardElement(card, false);
            cardElement.innerHTML = `
                <div class="absolute inset-0 flex flex-col items-center justify-center p-2">
                    <div class="text-xs mb-1">${playerName}</div>
                    <div class="text-2xl font-bold">${card}</div>
                    <div class="text-sm mt-2">${'🐮'.repeat(calculateHeads(card))}</div>
                </div>
            `;
            Animations.revealCard(cardElement);
            revealedCards.appendChild(cardElement);
        });
    },
    
    /**
     * Cache la zone de révélation
     */
    hideRevealZone() {
        const revealZone = document.getElementById('reveal-zone');
        if (revealZone) {
            revealZone.classList.add('hidden');
        }
    },
    
    /**
     * Affiche le modal de choix de rangée
     */
    showRowChoiceModal(rows, cardValue) {
        const modal = document.getElementById('row-choice-modal');
        const options = document.getElementById('row-choice-options');
        
        if (!modal || !options) return;
        
        modal.classList.remove('hidden');
        options.innerHTML = '';
        
        rows.forEach((row, index) => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-200 transition-colors';
            rowDiv.setAttribute('data-row-index', index);
            
            const heads = calculateTotalHeads(row);
            
            rowDiv.innerHTML = `
                <div class="text-center">
                    <div class="font-semibold mb-2">Rangée ${index + 1}</div>
                    <div class="text-sm text-gray-600 mb-2">${row.length} carte${row.length > 1 ? 's' : ''}</div>
                    <div class="text-orange-600 font-bold">${heads} 🐮</div>
                </div>
            `;
            
            rowDiv.addEventListener('click', () => {
                handleRowChoice(index, cardValue);
            });
            
            options.appendChild(rowDiv);
        });
    },
    
    /**
     * Cache le modal de choix de rangée
     */
    hideRowChoiceModal() {
        const modal = document.getElementById('row-choice-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },
    
    /**
     * Affiche l'écran de fin
     */
    showEndScreen(sortedPlayers, winner) {
        this.showScreen('end');
        
        const rankingElement = document.getElementById('end-ranking');
        if (!rankingElement) return;
        
        rankingElement.innerHTML = '';
        
        const medals = ['🥇', '🥈', '🥉'];
        
        sortedPlayers.forEach((player, index) => {
            const playerDiv = document.createElement('div');
            playerDiv.className = `flex items-center justify-between p-4 rounded-lg ${
                player.id === winner.id ? 'bg-orange-100 border-2 border-orange-500' : 'bg-gray-50'
            }`;
            
            playerDiv.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="text-2xl">${medals[index] || `${index + 1}.`}</span>
                    <span class="font-semibold text-lg">${player.name}</span>
                    ${player.id === winner.id ? '<span class="text-orange-600 font-bold">🏆 Gagnant !</span>' : ''}
                </div>
                <div class="text-xl font-bold text-orange-600">${player.score} 🐮</div>
            `;
            
            rankingElement.appendChild(playerDiv);
        });
        
        // Afficher le bouton rejouer si hôte
        const replayBtn = document.getElementById('btn-replay');
        if (replayBtn && StateHelpers.isHost()) {
            replayBtn.classList.remove('hidden');
        }
    },
    
    /**
     * Affiche un message temporaire
     */
    showMessage(message) {
        // Créer un toast message
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
};

