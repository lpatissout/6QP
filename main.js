const render = () => {
    const app = document.getElementById('app');
    const me = state.game?.players.find(p=>p.id===state.playerId);
    const showDebugPanel = !isMobile && state.showDebug;

    if(state.screen==='home'){
        app.innerHTML=`...`; // Code écran home
    } else if(state.screen==='lobby'){
        app.innerHTML=`...`; // Code écran lobby
    } else if(state.screen==='game'){
        app.innerHTML=`
        <div class="container mx-auto px-4 py-4">
            <div class="max-w-6xl mx-auto">
                <div class="bg-white rounded-lg shadow-lg p-4 mb-4 flex justify-between items-center">
                    <h2 class="text-2xl font-bold text-orange-600">Manche ${state.game.round}/${state.game.maxRounds} - Tour ${state.game.currentTurn}/10</h2>
                    ${!isMobile ? `<button onclick="state.showDebug=!state.showDebug; render()">🔍 Debug</button>`:''}
                </div>

                ${showDebugPanel? `<div class="bg-gray-900 text-green-400 p-4 font-mono text-xs max-h-96 overflow-y-auto">
                    ${state.debugLogs.map(l=>`<div>[${l.time}] ${l.message} ${l.data?l.data:''}</div>`).join('')}
                </div>`:''}

                <div class="bg-white rounded-lg shadow-lg p-6 mb-4">
                    <h3 class="font-bold mb-4 text-lg">Votre main :</h3>
                    <div class="flex gap-2 flex-wrap justify-center">
                        ${me.hand.map(c=>Card(c,state.selectedCard===c,true,false,false)).join('')}
                    </div>
                    <p class="text-center mt-4 text-sm text-gray-600">${canPlayTurn()?'Cliquez pour jouer':'En attente...'}</p>
                </div>
            </div>
        </div>`;
    }
};

document.addEventListener('DOMContentLoaded', ()=>{
    const p=new URLSearchParams(window.location.search);
    const j=p.get('join');
    if(j) state.joinCode=j;
    render();
});
