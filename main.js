/* ==================== MAIN APP INITIALIZATION ==================== */

// Gestion des interactions UI
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

    // Double-click pour confirmer
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
    state.invitePending = false; // écran "Rejoindre" manuel
    render();
};

window.backToHome = () => {
    state.screen = 'home';
    state.invitePending = false;
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

// Exposition des fonctions globales
window.createGame = createGame;
window.joinGame = joinGame;
window.toggleReady = toggleReady;
window.startGame = startGame;
window.playCard = playCard;
window.chooseRow = chooseRow;
window.leaveGame = leaveGame;
window.copyLink = copyLink;

// ==================== INITIALISATION ==================== //

document.addEventListener('DOMContentLoaded', () => {
    debugLog('App initialized', { isMobile: state.isMobile });

    // Détection d’un lien d’invitation
    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get('join');

    if (joinCode) {
        state.joinCode = joinCode.toUpperCase();
        state.screen = 'join';
        state.invitePending = true; // ✅ indique qu’on vient d’une invitation
        debugLog('Join code detected in URL', { joinCode: state.joinCode });

        // Nettoyer l’URL (retirer ?join=)
        setTimeout(() => {
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }, 500);
    } else {
        state.invitePending = false;
    }

    // Premier rendu
    render();

    // Détection du redimensionnement (mobile / desktop)
    window.addEventListener('resize', () => {
        const wasMobile = state.isMobile;
        state.isMobile = window.innerWidth < 768;
        if (wasMobile !== state.isMobile) {
            debugLog('Mobile state changed', { isMobile: state.isMobile });
            if (state.isMobile) state.showDebug = false;
            render();
        }
    });

    console.log('✅ 6 qui prend! ready to play');
});
