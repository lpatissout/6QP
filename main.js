const startCreate = () => {
    state.playerName = document.getElementById('inputName').value.trim();
    createGame();
};

const startJoin = () => {
    state.playerName = document.getElementById('inputName').value.trim();
    state.joinCode = document.getElementById('inputCode').value.trim().toUpperCase();
    joinGame();
};

// Gestion adaptative mobile
window.addEventListener('resize', () => {
    state.isMobile = window.innerWidth < 768;
});

// Auto-rendu
setInterval(render, 300);

// Masque la console si on est sur mobile
if(state.isMobile) state.showDebug = false;
