// UI - Carte
const Card = (num, selected=false, clickable=true, small=false) => {
    const h = calculateHeads(num);
    const col = getCardColor(num);
    const sz = small ? 'w-12 h-16 text-xs' : 'w-16 h-24 text-sm';
    const sel = selected ? 'ring-4 ring-blue-600 scale-105' : '';
    const cursor = clickable ? 'hover:scale-105 cursor-pointer' : 'opacity-50';
    return `<button ${clickable ? `onclick="handleCard(${num})"` : ''} 
        class="${sz} ${col} text-white rounded-lg shadow-md flex flex-col items-center justify-between p-1 transition ${sel} ${cursor} font-bold">
        <span class="text-xl">${num}</span>
        <div>${'🐮'.repeat(h)}</div>
    </button>`;
};

// UI - Render
const render = () => {
    const app = document.getElementById('app');
    const me = state.game?.players?.find(x => x.id === state.playerId);

    if (state.screen === 'home') {
        app.innerHTML = `
            <div class="container mx-auto px-4 py-8">
                <div class="max-w-2xl mx-auto bg-white rounded-xl shadow-2xl p-8 text-center">
                    <h1 class="text-5xl font-bold text-orange-600 mb-4">🐮 6 qui prend !</h1>
                    <input type="text" placeholder="Pseudo" value="${state.playerName}" 
                        oninput="state.playerName=this.value" class="mb-4 w-full px-4 py-3 border rounded"/>
                    <div class="flex gap-2 justify-center">
                        <button onclick="createGame()" class="bg-orange-500 text-white px-4 py-2 rounded">Créer</button>
                        <button onclick="state.screen='join'; render()" class="bg-blue-500 text-white px-4 py-2 rounded">Rejoindre</button>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    if (state.screen === 'join') {
        app.innerHTML = `
            <div class="container mx-auto px-4 py-8">
                <div class="max-w-md mx-auto bg-white rounded-xl shadow-2xl p-8 text-center">
                    <input type="text" placeholder="Code" value="${state.joinCode}" oninput="state.joinCode=this.value" class="mb-4 w-full px-4 py-3 border rounded"/>
                    <button onclick="joinGame()" class="bg-blue-500 text-white px-4 py-2 rounded mb-2">Rejoindre</button>
                    <button onclick="state.screen='home'; render()" class="bg-gray-300 px-4 py-2 rounded">Retour</button>
                </div>
            </div>
        `;
        return;
    }

    if (state.screen === 'game') {
        const debugHTML = !state.isMobile && state.showDebug ? `
            <div class="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs mb-4 max-h-64 overflow-y-auto">
                <h3 class="font-bold mb-2">Debug console</h3>
                ${state.debugLogs.map(l=>`[${l.time}] ${l.msg} ${l.data?JSON.stringify(l.data):''}`).join('<br/>')}
            </div>
        ` : '';

        const handHTML = me && me.hand ? me.hand.map(c => 
            Card(c, state.selectedCard===c, canPlayCard())
        ).join('') : '';

        app.innerHTML = `
            <div class="container mx-auto p-4">
                <div class="flex justify-between mb-4">
                    <h2 class="text-xl font-bold text-orange-600">Round ${state.game.round}/Max</h2>
                    ${!state.isMobile ? `<button onclick="state.showDebug=!state.showDebug; render()" class="bg-purple-500 text-white px-2 py-1 rounded">Debug</button>` : ''}
                </div>
                ${debugHTML}
                <div class="mb-4"><h3 class="font-bold mb-2">Votre main :</h3><div class="flex gap-2 flex-wrap">${handHTML}</div></div>
            </div>
        `;
    }
};

// Carte cliquée
window.handleCard = (c) => {
    if (!canPlayCard()) return;
    if (state.selectedCard === c) playCard(c);
    else { state.selectedCard = c; render(); }
};
