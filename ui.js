function render() {
    const app = document.getElementById('app');

    // HOME
    if (state.screen === 'home') {
        app.innerHTML = `
        <div class="container mx-auto px-4 py-8">
            <div class="max-w-2xl mx-auto bg-white rounded-xl shadow-2xl p-8">
                <h1 class="text-5xl font-bold text-center mb-2 text-orange-600">🐮 6 qui prend !</h1>
                <input type="text" placeholder="Votre pseudo" value="${state.playerName}" oninput="state.playerName=this.value"
                    class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg mb-4">
                <button onclick="createGame()" class="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg mb-2">Créer une partie</button>
                <button onclick="state.screen='join'; render()" class="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg">Rejoindre</button>
            </div>
        </div>`;
        return;
    }

    // JOIN
    if (state.screen === 'join') {
        app.innerHTML = `
        <div class="container mx-auto px-4 py-8">
            <div class="max-w-md mx-auto bg-white rounded-xl shadow-2xl p-8">
                <input type="text" placeholder="Code de la partie" value="${state.joinCode}" oninput="state.joinCode=this.value.toUpperCase()"
                    class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg mb-4">
                <button onclick="joinGame()" class="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg mb-2">Rejoindre</button>
                <button onclick="state.screen='home'; render()" class="w-full bg-gray-300 py-3 rounded-lg">Retour</button>
            </div>
        </div>`;
        return;
    }

    // LOBBY
    if (state.screen === 'lobby') {
        const isHost = state.game.hostId === state.playerId;
        const canStart = isHost && state.game.players.length >= 2 && state.game.players.every(p=>p.ready);
        app.innerHTML = `
        <div class="container mx-auto px-4 py-8">
            <h2 class="text-3xl font-bold text-orange-600 mb-4">Salon d'attente</h2>
            <div class="mb-4">Code : ${state.gameCode}</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                ${state.game.players.map(p=>`<div class="bg-gray-100 p-2 rounded">${p.name} ${p.id===state.game.hostId?'(Hôte)':''} ${p.ready?'✅':'⏳'}</div>`).join('')}
            </div>
            <div class="flex gap-2">
                <button onclick="toggleReady()" class="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded">${state.game.players.find(x=>x.id===state.playerId).ready?'Pas prêt':'Je suis prêt !'}</button>
                ${isHost?`<button onclick="startGame()" ${!canStart?'disabled':''} class="flex-1 bg-orange-500 text-white py-2 rounded ${!canStart?'opacity-50 cursor-not-allowed':''}">Lancer la partie</button>`:''}
            </div>
        </div>`;
        return;
    }

    // GAME
    if (state.screen === 'game') {
        app.innerHTML = `<h2 class="text-2xl font-bold text-center mb-4 text-orange-600">Jeu en cours</h2>
        <div class="flex flex-wrap justify-center gap-2 mb-4">
            ${state.game.deck.map(c=>`<div class="card bg-white border p-4 rounded shadow" onclick="playCard(${c})">${c}</div>`).join('')}
        </div>`;
    }
}
