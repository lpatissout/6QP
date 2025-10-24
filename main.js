/* ==================== MAIN APP INITIALIZATION ==================== */

// CORRECTION : Gérer les interactions UI qui n'existaient pas dans game.js

window.handleCardClick = (card) => {
    const p = state.game?.players.find(x => x.id === state.playerId);
    if (!p) {
        console.warn('handleCardClick: player not found');
        return;
    }
    if (hasPlayed(p)) {
        console.warn('handleCardClick: already played');
        return;
    }

    // Double-click to confirm
    if (state.selectedCard === card) {
        playCard(card);
    } else {
        state.selectedCard = card;
        debugLog('Card selected', { player: p.name, card });
        render();
    }
};

window.showJoinScreen = () => {
    state.screen = 'join';
    render();
};

window.backToHome = () => {
    state.screen = 'home';
    render();
};

window.toggleDebug = () => {
    state.showDebug = !state.showDebug;
    debugLog('Debug panel toggled', { showDebug: state.showDebug });
    render();
};

window.clearDebugLogs = () => {
    state.debugLogs = [];
    console.log('Debug logs cleared');
    render();
};

// CORRECTION : Exposer les fonctions game.js au contexte global pour onclick
window.createGame = createGame;
window.joinGame = joinGame;
window.toggleReady = toggleReady;
window.startGame = startGame;
window.playCard = playCard;
window.chooseRow = chooseRow;
window.leaveGame = leaveGame;
window.copyLink = copyLink;

// CORRECTION : Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    debugLog('App initialized', { isMobile: state.isMobile });

    // Check for join code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get('join');
    
    if (joinCode) {
        state.joinCode = joinCode.toUpperCase();
        state.screen = 'join';
        debugLog('Join code detected in URL', { joinCode: state.joinCode });
    }

    // Initial render
    render();

    // Handle window resize for mobile detection
    window.addEventListener('resize', () => {
        const wasMobile = state.isMobile;
        state.isMobile = window.innerWidth < 768;
        
        if (wasMobile !== state.isMobile) {
            debugLog('Mobile state changed', { isMobile: state.isMobile });
            if (state.isMobile) {
                state.showDebug = false;
            }
            render();
        }
    });

    console.log('✅ 6 qui prend! ready to play');
});
