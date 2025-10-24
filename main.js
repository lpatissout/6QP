document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const join = params.get('join');
    if (join) state.joinCode = join.toUpperCase();

    // Détecter mobile pour UI adaptative et console debug masquée
    state.isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

    // Masquer console debug sur mobile
    if (state.isMobile) console.log = function() {};

    render();
});

// Toggle ready
function toggleReady() {
    const player = state.game.players.find(p=>p.id===state.playerId);
    player.ready = !player.ready;
    saveGame(state.gameCode, state.game);
    render();
}

// Quitter
function leaveGame() {
    state.screen = 'home';
    state.game = null;
    state.gameCode = '';
    render();
}

// Copier lien
function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    state.copied = true;
    render();
}
