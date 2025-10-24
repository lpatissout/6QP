document.addEventListener('DOMContentLoaded', () => {
    const p = new URLSearchParams(window.location.search).get('join');
    if (p) state.joinCode = p;
    render();
});

// Création / Join / Leave
const createGame = async () => {
    if (!state.playerName.trim()) return alert('Pseudo requis');
    const pid = Math.random().toString(36).substring(7);
    state.playerId = pid;
    state.gameCode = Math.random().toString(36).substring(2,8).toUpperCase();
    state.game = {
        code: state.gameCode,
        status: 'waiting',
        hostId: pid,
        players:[{id:pid,name:state.playerName,score:0,hand:[],playedCard:null}],
        round: 1,
        maxRounds:6,
        waitingForRowChoice:null
    };
    await saveGame(state.game);
    state.screen='game';
    render();
};

const joinGame = async () => {
    if (!state.playerName.trim() || !state.joinCode.trim()) return alert('Pseudo + code requis');
    const game = await getGame(state.joinCode.toUpperCase());
    if (!game) return alert('Partie introuvable');
    const pid = Math.random().toString(36).substring(7);
    state.playerId=pid;
    state.gameCode=game.code;
    game.players.push({id:pid,name:state.playerName,score:0,hand:[],playedCard:null});
    state.game = game;
    await saveGame(game);
    state.screen='game';
    render();
};
