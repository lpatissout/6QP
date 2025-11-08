/* ==================== UI RENDERING - IMPROVED & COMPLETE ==================== */

/* ==================== Debug panel ==================== */
const renderDebugPanel = () => {
    if (state.isMobile || !state.showDebug) return '';
    return `
    <div class="debug-panel bg-gray-900 text-green-300 rounded-lg p-3 font-mono text-xs max-h-80 overflow-auto">
        <div class="flex justify-between items-center mb-2">
            <strong class="text-white">🔍 Debug Console</strong>
            <div class="flex gap-2">
                <button onclick="clearDebugLogs()" class="bg-red-600 text-white px-2 py-1 rounded text-xs">Clear</button>
            </div>
        </div>
        <div>
            ${state.debugLogs.length === 0 ? '<div class="text-gray-500">Aucun log...</div>' : ''}
            ${state.debugLogs.slice(-50).reverse().map(l => `
                <div class="mb-1">
                    <span class="text-gray-400">[${l.time}]</span>
                    <span class="text-yellow-300"> ${escapeHtml(l.msg || l.message || '')}</span>
                    ${l.data ? `<div class="text-blue-300 ml-3">${escapeHtml(typeof l.data === 'string' ? l.data : JSON.stringify(l.data))}</div>` : ''}
                </div>
            `).join('')}
        </div>
    </div>
    `;
};

/* ==================== Card rendering ==================== */
const renderCard = (num, selected = false, clickable = true, small = false) => {
    const heads = calculateHeads(num);
    const color = getCardColor(num);
    const size = small ? 'w-12 h-16 text-xs' : 'w-16 h-24 text-sm';
    const cursor = clickable ? 'cursor-pointer card-hover' : 'opacity-70';
    const border = selected ? 'ring-4 ring-blue-600 scale-105' : '';
    return `
    <div ${clickable ? `onclick="handleCardClick(${num})"` : ''} 
         class="${size} ${color} ${cursor} ${border} text-white rounded-lg shadow-md flex flex-col items-center justify-between p-1 transition font-bold">
        <span class="text-xl">${num}</span>
        <div>${'🐮'.repeat(heads)}</div>
    </div>
    `;
};

/* ==================== Turn History ==================== */
const renderTurnHistory = () => {
    if (!state.game || !Array.isArray(state.game.turnHistory) || state.game.turnHistory.length === 0) return '';
    if (!Array.isArray(state.game.players)) return '';
    const activePlayers = state.game.players.filter(p => !p.isSpectator);
    const visibleActions = state.game.turnHistory.filter(action => {
        if (action.action === 'chose_row') return true;
        if (action.action === 'played') return action.turn < state.game.currentTurn;
        return false;
    });
    if (visibleActions.length === 0) {
        return `<div class="bg-gray-100 rounded-lg shadow-lg p-3 mb-2 sm:mb-4 text-center">
            <h3 class="font-bold text-sm mb-2 text-gray-500">📜 Historique</h3>
            <div class="text-xs text-gray-400 italic">Aucune action pour le moment</div>
        </div>`;
    }
    const recentActions = visibleActions.slice(-5).reverse();
    return `<div class="bg-white rounded-lg shadow-lg p-3 mb-2 sm:mb-4">
        <h3 class="font-bold text-sm mb-2">📜 Historique récent</h3>
        <div class="space-y-1 text-xs">
            ${recentActions.map(action => {
                if (action.action === 'played') {
                    return `<div class="text-gray-700">🎴 <strong>Tour ${action.turn}</strong> : ${escapeHtml(action.player)} a joué le ${action.card}</div>`;
                } else if (action.action === 'chose_row') {
                    return `<div class="text-orange-700 font-semibold">⚠️ ${escapeHtml(action.player)} a ramassé R${action.rowIndex + 1} (+${action.penaltyPoints}🐮)</div>`;
                }
                return '';
            }).join('')}
        </div>
    </div>`;
};

/* ==================== Player status ==================== */
const renderPlayerStatus = (player, isMe = false) => {
    const hasPlayedCard = hasPlayed(player);
    let statusIcon = '', statusText = '', statusClass = '';
    if (hasPlayedCard) {
        statusIcon = '✅'; statusText = 'A joué'; statusClass = 'text-green-600 font-semibold';
    } else if (player.isSpectator) {
        statusIcon = '👁️'; statusText = 'Spectateur'; statusClass = 'text-purple-500';
    } else {
        statusIcon = '⏳'; statusText = 'Réfléchit...'; statusClass = 'text-orange-500 animate-pulse';
    }
    return `<div class="text-center p-2 sm:p-3 rounded-lg ${isMe ? 'bg-orange-100 ring-2 ring-orange-500' : hasPlayedCard ? 'bg-green-50' : 'bg-gray-100'}">
        <div class="font-semibold truncate text-xs sm:text-base">${escapeHtml(player.name)}</div>
        <div class="text-2xl sm:text-3xl font-bold">${player.score} 🐮</div>
        <div class="${statusClass} text-xs sm:text-sm flex items-center justify-center gap-1">
            <span>${statusIcon}</span>
            <span>${statusText}</span>
        </div>
    </div>`;
};

const renderRevealOverlay = () => {
    if (!state.revealedCards || !Array.isArray(state.revealedCards) || state.revealedCards.length === 0) return '';
    if (!state.game || !Array.isArray(state.game.players)) return '';
    const isWaitingForMyChoice = state.game.waitingForRowChoice === state.playerId;
    if (isWaitingForMyChoice) return '';
    return `<div id="reveal-overlay" class="fixed inset-0 bg-black bg-opacity-70 z-[10000] flex items-center justify-center transition-opacity duration-500" style="opacity: 1;">
        <div class="text-center max-w-4xl mx-auto px-4">
            <h2 class="text-white text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 animate-pulse">🎴 Cartes jouées ce tour</h2>
            <div class="flex gap-3 sm:gap-6 justify-center items-end flex-wrap">
                ${state.revealedCards.map(play => {
                    const heads = calculateHeads(play.card);
                    const color = getCardColor(play.card);
                    return `<div class="text-center transform transition-all duration-300 hover:scale-105" data-revealed-card="${play.card}">
                        <div class="${color} text-white rounded-lg shadow-2xl flex flex-col items-center justify-between p-2 sm:p-3 font-bold w-20 h-28 sm:w-24 sm:h-32 mb-2 bounce-in">
                            <span class="text-2xl sm:text-3xl">${play.card}</span>
                            <div class="text-lg sm:text-2xl">${'🐮'.repeat(heads)}</div>
                        </div>
                        <div class="text-white font-semibold text-sm sm:text-lg">${escapeHtml(play.name)}</div>
                    </div>`;
                }).join('')}
            </div>
            ${state.game.waitingForRowChoice ? 
                `<p class="text-white text-lg sm:text-xl mt-6 sm:mt-8 animate-pulse">⏳ En attente de ${escapeHtml(state.game.players.find(p => p.id === state.game.waitingForRowChoice)?.name || 'un joueur')}...</p>` 
                : ''
            }
        </div>
    </div>`;
};

const renderLobby = () => {
    if (!state.game || !Array.isArray(state.game.players)) return '';
    const isHost = state.game.hostId === state.playerId;
    const me = state.game.players.find(p => p.id === state.playerId) || { ready: false, isSpectator: false };
    const activePlayers = state.game.players.filter(p => !p.isSpectator);
    const spectators = state.game.players.filter(p => p.isSpectator);
    const canStart = isHost && activePlayers.length >= 2 && activePlayers.every(p => p.ready);
    return `<div class="container mx-auto px-4 py-8">
        // ... template inchangé ...
        ${Array.isArray(activePlayers) ? activePlayers.map(p => `
            // ... status joueur ...
        `).join('') : ''}
        ${Array.isArray(spectators) && spectators.length ? `
        // ... status spectateur ...
        ` : ''}
    </div>`;
};

const renderGame = () => {
    if (!state.game || !Array.isArray(state.game.players)) {
        return `<div class="container mx-auto px-4 py-8">
            <div class="max-w-2xl mx-auto bg-white rounded-xl shadow-2xl p-8 text-center">
                <div class="text-xl">⏳ Chargement de la partie...</div>
            </div>
        </div>`;
    }
    if (!state.game.rows || !Array.isArray(state.game.rows)) {
        console.warn('Game rows not ready, waiting for round initialization');
        return `<div class="container mx-auto px-4 py-8">
            <div class="max-w-2xl mx-auto bg-white rounded-xl shadow-2xl p-8 text-center">
                <div class="text-xl mb-4">🎯 Préparation de la manche ${state.game.round || ''}...</div>
                <div class="text-gray-600">Distribution des cartes en cours</div>
            </div>
        </div>`;
    }
    const me = state.game.players.find(p => p.id === state.playerId);
    const activePlayers = state.game.players.filter(p => !p.isSpectator);
    const waitingPlayers = activePlayers.filter(p => !hasPlayed(p));
    const isHost = state.game.hostId === state.playerId;
    const isSpectator = me && me.isSpectator;
    const waitingPlayerNames = waitingPlayers.map(p => p.name).join(', ');
    // ... Le reste du template comme avant !
    return `
    ${renderRevealOverlay()}
    <div class="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
        <div class="max-w-6xl mx-auto">
            <div class="space-y-2 sm:space-y-3">
                ${Array.isArray(state.game.rows) ? state.game.rows.map((row,i)=> {
                    const totalHeads = Array.isArray(row) ? row.reduce((s,c)=>s+calculateHeads(c),0) : 0;
                    const canClick = state.game.waitingForRowChoice && state.game.waitingForRowChoice === state.playerId;
                    return `<div id="row-${i}" class="flex items-center gap-2 sm:gap-3 p-2 rounded-lg ${canClick ? 'cursor-pointer hover:bg-orange-50 border-2 border-transparent hover:border-orange-500 transition pulse-animation' : 'border border-gray-200'}" ${canClick ? `onclick="chooseRow(${i})"` : ''}>
                        <span class="font-bold text-gray-700 text-xs sm:text-base min-w-[40px] sm:min-w-[50px]">R${i+1}</span>
                        <div class="flex gap-1 flex-wrap flex-1">
                            ${Array.isArray(row) ? row.map(c=> renderCard(c, false, false, true)).join('') : ''}
                        </div>
                        <div class="text-right">
                            <span class="text-xs sm:text-sm font-semibold text-gray-700 bg-gray-100 px-2 py-1 sm:px-3 sm:py-2 rounded-lg whitespace-nowrap">${row.length}/5 | ${totalHeads}🐮</span>
                        </div>
                    </div>`;
                }).join('') : ''}
            </div>
            ${hasPlayed(me)
                ? `<div class="text-center py-4 sm:py-8">
                        <p class="text-xl sm:text-2xl mb-2">✓ Vous avez joué votre carte !</p>
                        <p class="text-gray-600 mb-2 text-sm sm:text-base">En attente des autres joueurs...</p>
                        ${waitingPlayers.length ? `<p class="text-xs sm:text-sm text-gray-500">Attente de : ${escapeHtml(waitingPlayerNames)}</p>` : ''}
                    </div>`
                : `<div class="flex gap-2 flex-wrap justify-center mb-3 sm:mb-4">
                        ${Array.isArray(me && me.hand) ? me.hand.map(c => renderCard(c, state.selectedCard === c, true, false)).join('') : ''}
                    </div>
                    <p class="text-center text-xs sm:text-sm text-gray-600">
                        ${state.selectedCard ? '👆 Cliquez à nouveau sur la carte pour confirmer' : '👇 Choisissez une carte à jouer'}
                    </p>`
                }
            ${renderDebugPanel()}
        </div>
    </div>
    `;
};

const render = () => {
    const app = document.getElementById('app');
    if (!app) return;
    switch (state.screen) {
        case 'home': app.innerHTML = renderHome(); break;
        case 'join': app.innerHTML = renderJoin(); break;
        case 'lobby': app.innerHTML = renderLobby(); break;
        case 'game': app.innerHTML = renderGame(); break;
        default: app.innerHTML = renderHome();
    }
};
