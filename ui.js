const app = document.getElementById('app');

const renderDebug = () => {
    if(state.isMobile) return ''; // pas de console sur mobile
    if(!state.showDebug) return '';
    return `
    <div class="absolute top-2 right-2 w-80 max-h-96 overflow-y-auto bg-black text-white text-xs p-2 rounded">
        ${state.debugLogs.map(d=>`[${d.time}] ${d.msg} ${d.data?d.data:''}`).join('<br>')}
    </div>`;
};

const renderHome = () => `
<div class="flex flex-col items-center justify-center min-h-screen gap-4">
    <h1 class="text-3xl font-bold text-orange-700">6 qui prend !</h1>
    <input placeholder="Pseudo" value="${state.playerName}" class="px-2 py-1 border rounded" id="inputName">
    <button onclick="startCreate()" class="bg-green-400 px-4 py-2 rounded">Créer une partie</button>
    <input placeholder="Code Partie" value="${state.joinCode}" class="px-2 py-1 border rounded" id="inputCode">
    <button onclick="startJoin()" class="bg-blue-400 px-4 py-2 rounded">Rejoindre une partie</button>
    ${renderDebug()}
</div>`;

const renderLobby = () => {
    const playersHTML = state.game.players.map(p=>`
        <div class="flex justify-between w-full p-1">
            <span>${p.name}</span>
            <span>${p.ready?'✅':'❌'}</span>
        </div>
    `).join('');
    return `
<div class="flex flex-col items-center min-h-screen p-4 gap-4">
    <h2 class="text-xl font-bold">Lobby ${state.gameCode}</h2>
    <div class="w-64 border p-2">${playersHTML}</div>
    <button onclick="toggleReady()" class="bg-yellow-400 px-4 py-2 rounded">
        ${state.game.players.find(p=>p.id===state.playerId).ready?'Annuler':'Prêt'}
    </button>
    ${state.game.hostId===state.playerId?`<button onclick="startGame()" class="bg-green-500 px-4 py-2 rounded mt-2">Démarrer la partie</button>`:''}
    ${renderDebug()}
</div>`;
};

const renderGame = () => {
    const p = state.game.players.find(p=>p.id===state.playerId);
    const handHTML = p.hand.map(c=>`
        <div onclick="playCardUI(${c})" class="cursor-pointer ${getCardColor(c)} text-white font-bold p-2 m-1 rounded">
            ${c}
        </div>
    `).join('');
    const rowsHTML = state.game.rows.map((row,i)=>`
        <div class="flex gap-1 p-1 border-b" id="row-${i}">
            ${row.map(c=>`<div class="w-8 h-12 ${getCardColor(c)} rounded text-white text-center">${c}</div>`).join('')}
        </div>
    `).join('');

    return `
<div class="flex flex-col min-h-screen p-2">
    <div class="flex justify-between mb-2">
        <div>Joueur: ${p.name} - Score: ${p.score}</div>
        <button onclick="toggleDebug()" class="bg-gray-300 px-2 rounded">Debug</button>
    </div>
    <div class="flex flex-col gap-2">${rowsHTML}</div>
    <h3 class="mt-2 font-bold">Votre main</h3>
    <div class="flex flex-wrap gap-2">${handHTML}</div>
    ${renderDebug()}
</div>`;
};

const toggleDebug = () => state.showDebug = !state.showDebug;

const playCardUI = (card) => {
    if(!canPlayCard()) return;
    state.selectedCard = card;
    playCard(card);
};

const render = () => {
    switch(state.screen){
        case 'home': app.innerHTML=renderHome(); break;
        case 'lobby': app.innerHTML=renderLobby(); break;
        case 'game': app.innerHTML=renderGame(); break;
    }
};
