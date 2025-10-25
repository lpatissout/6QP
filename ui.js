/* ==================== UI RENDER ==================== */
function render() {
    const app = document.getElementById('app');
    if (!app) return;

    if (state.screen === 'home') {
        app.innerHTML = `
            <div class="p-8 text-center">
                <h1 class="text-4xl font-bold mb-6">6 qui prend!</h1>
                <input id="nameInput" class="border p-2 rounded" placeholder="Votre pseudo" />
                <button onclick="state.playerName=document.getElementById('nameInput').value; createGame();" class="bg-green-500 text-white px-4 py-2 rounded ml-2">Créer</button>
                <div class="mt-4">
                    <input id="joinCode" class="border p-2 rounded" placeholder="Code de partie" />
                    <button onclick="state.playerName=document.getElementById('nameInput').value; state.joinCode=document.getElementById('joinCode').value; joinGame();" class="bg-blue-500 text-white px-4 py-2 rounded ml-2">Rejoindre</button>
                </div>
            </div>`;
        return;
    }

    if (state.screen === 'lobby') {
        app.innerHTML = `
            <div class="p-6">
                <h2 class="text-2xl font-bold mb-4">Salle d’attente (${state.gameCode})</h2>
                <ul class="mb-4">
                    ${state.game.players.map(p => `<li>${p.name} ${p.ready ? '✅' : '⏳'}</li>`).join('')}
                </ul>
                <button onclick="toggleReady()" class="bg-yellow-500 text-white px-4 py-2 rounded">Prêt</button>
                ${state.playerId === state.game.hostId ? `<button onclick="startGame()" class="bg-green-500 text-white px-4 py-2 rounded ml-2">Lancer</button>` : ''}
            </div>`;
        return;
    }

    if (state.screen === 'game') {
        const game = state.game;
        if (!game) return;

        const rowsHTML = game.rows
            .map((r, i) => `
                <div id="row-${i}" class="flex gap-2 mb-4 justify-center">
                    ${r.map(c => `<div class="${getCardColor(c)} text-white w-12 h-16 flex items-center justify-center rounded">${c}</div>`).join('')}
                </div>`).join('');

        const player = game.players.find(p => p.id === state.playerId);

        app.innerHTML = `
            <div class="p-4 text-center">
                <h2 class="text-2xl font-bold mb-4">Manche ${game.round}</h2>
                <div id="table" class="mb-6">${rowsHTML}</div>
                <div class="flex justify-center gap-2">
                    ${player.hand.map(c => `
                        <button onclick="playCard(${c})" class="${getCardColor(c)} text-white px-3 py-2 rounded">${c}</button>
                    `).join('')}
                </div>
            </div>`;
    }
}
