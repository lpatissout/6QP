/* ==================== MAIN APP INITIALIZATION ==================== */

// Gestionnaires d'événements UI
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
    state.invitePending = false;
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

window.toggleAnimations = () => {
    state.enableAnimations = !state.enableAnimations;
    debugLog('Animations toggled', { enableAnimations: state.enableAnimations });
    
    // Afficher un message de confirmation
    const msg = document.createElement('div');
    msg.className = 'fixed top-4 right-4 bg-purple-600 text-white px-4 py-3 rounded-lg shadow-lg z-[10000] font-semibold slide-up';
    msg.textContent = state.enableAnimations ? '🎬 Animations activées' : '⏭️ Animations désactivées';
    document.body.appendChild(msg);
    
    setTimeout(() => {
        msg.style.opacity = '0';
        setTimeout(() => msg.remove(), 300);
    }, 2000);
    
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
window.restartGame = restartGame;

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', () => {
    debugLog('App initialized', { 
        isMobile: state.isMobile, 
        animationsEnabled: state.enableAnimations 
    });

    // Détection d'un lien d'invitation
    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get('join');

    if (joinCode) {
        state.joinCode = joinCode.toUpperCase();
        state.screen = 'join';
        state.invitePending = true;
        debugLog('Join code detected in URL', { joinCode: state.joinCode });

        // Nettoyer l'URL
        setTimeout(() => {
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }, 500);
    } else {
        state.invitePending = false;
    }

    // Premier rendu
    render();

    // Détection du redimensionnement
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

    console.log('✅ 6 qui prend! ready to play (with animations 🎬)');
    
    // Liaison du bouton "Rejoindre la partie"
    document.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'join-btn') {
            if (!state.playerName || !state.playerName.trim()) {
                alert("Merci d'entrer un pseudo avant de rejoindre.");
                return;
            }
            if (!state.joinCode || !state.joinCode.trim()) {
                alert("Merci de renseigner un code de partie.");
                return;
            }
            joinGame();
        }
    });
});
