// Système d'animations

const Animations = {
    /**
     * Fait voler une carte vers une rangée
     */
    async flyCardToRow(cardValue, rows) {
        // Trouver la rangée cible
        const rowIndex = findValidRow(cardValue, rows);
        if (rowIndex === -1) return;
        
        // Animation simple : on laisse UI.js gérer l'affichage
        // Les animations CSS seront gérées via les classes Tailwind
        return new Promise(resolve => {
            setTimeout(resolve, 300);
        });
    },
    
    /**
     * Animation de ramassage de cartes
     */
    async collectCards(cards, playerId, heads) {
        // Afficher un message de ramassage
        const player = AppState.game.players.find(p => p.id === playerId);
        if (player) {
            UI.showMessage(`⚠️ ${player.name} ramasse ! +${heads} 🐮`);
        }
        
        // Animation de shake sur la rangée
        const rowElement = document.querySelector(`[data-row-index]`);
        if (rowElement) {
            rowElement.classList.add('animate-pulse', 'ring-4', 'ring-red-500');
            setTimeout(() => {
                rowElement.classList.remove('animate-pulse', 'ring-4', 'ring-red-500');
            }, 1000);
        }
        
        return new Promise(resolve => {
            setTimeout(resolve, 1500);
        });
    },
    
    /**
     * Animation de révélation de carte
     */
    revealCard(cardElement) {
        cardElement.classList.add('animate-bounce');
        setTimeout(() => {
            cardElement.classList.remove('animate-bounce');
        }, 500);
    },
    
    /**
     * Animation de sélection de carte
     */
    selectCard(cardElement) {
        cardElement.classList.add('ring-4', 'ring-orange-500', 'scale-110');
    },
    
    /**
     * Animation de désélection de carte
     */
    deselectCard(cardElement) {
        cardElement.classList.remove('ring-4', 'ring-orange-500', 'scale-110');
    }
};

