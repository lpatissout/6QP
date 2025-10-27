/* ==================== UI RENDERING ==================== */

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

/* ==================== NOUVEAU: Historique des actions ==================== */

const renderTurnHistory = () => {
    if (!state.game.turnHistory || state.game.turnHistory.length === 0) return '';
    
    const recentActions = state.game.turnHistory.slice(-5).reverse();
    
    return `
    <div class="bg-white rounded-lg shadow-lg p-3 mb-2 sm:mb-4">
        <h3 class="font-bold text-sm mb-2">📜 Historique récent</h3>
        <div class="space-y-1 text-xs">
            ${recentActions.map(action => {
                if (action.action === 'played') {
                    return `<div class="text-gray-700">🎴 ${escapeHtml(action.player)} a joué le ${action.card}</div>`;
                } else if (action.action === 'chose_row') {
                    return `<div class="text-orange-700">⚠️ ${escapeHtml(action.player)} a ramassé R${action.rowIndex + 1} (+${action.penaltyPoints}🐮)</div>`;
                }
                return '';
            }).join('')}
        </div>
    </div>
    `;
};

/* ==================== Overlay de révélation des cartes ==================== */

const renderRevealOverlay = () => {
    if (!state.revealedCards || state.revealedCards.length === 0) return '';
    
    const isWaitingForMyChoice = state.game.waitingForRowChoice === state.playerId;
    
    // Si c'est à moi de choisir, on n'affiche PAS l'overlay
    if (isWaitingForMyChoice) return '';
    
    return `
    <div id="reveal-overlay" class="fixed inset-0 bg-black bg-opacity-70 z-[10000] flex items-center justify-center transition-opacity duration-500" style="opacity: 1;">
        <div class="text-center">
            <h2 class="text-white text-3xl font-bold mb-8 animate-pulse">
                🎴 Cartes jouées ce tour
            </h2>
            <div class="flex gap-6 justify-center items-end flex-wrap">
                ${state.revealedCards.map(play => {
                    const heads = calculateHeads(play.card);
                    const color = getCardColor(play.card);
                    return `
                    <div class="text-center transform transition-all duration-300 hover:scale-105" data-revealed-card="${play.card}">
                        <div class="${color} text-white rounded-lg shadow-2xl flex flex-col items-center justify-between p-3 font-bold w-24 h-32 mb-2 bounce-in">
                            <span class="text-3xl">${play.card}</span>
                            <div class="text-2xl">${'🐮'.repeat(heads)}</div>
                        </div>
                        <div class="text-white font-semibold text-lg">${escapeHtml(play.name)}</div>
                    </div>
                    `;
                }).join('')}
            </div>
            ${state.game.waitingForRowChoice ? 
                `<p class="text-white text-xl mt-8 animate-pulse">⏳ En attente de ${escapeHtml(state.game.players.find(p => p.id === state.game.waitingForRowChoice)?.name || 'un joueur')}...</p>` 
                : ''
            }
        </div>
    </div>
    `;
};

/* ==================== Screens ==================== */

const renderHome = () => `
    <div class="container mx-auto px-4 py-8">
        <div class="max-w-2xl mx-auto bg-white rounded-xl shadow-2xl p-8">
            <h1 class="text-4xl font-bold text-center mb-2 text-orange-600">🐮 6 qui prend !</h1>
            <p class="text-center text-gray-600 mb-6">Jeu de cartes multijoueur en ligne</p>

            <div class="mb-4">
                <label class="block text-sm font-semibold mb-2">Votre pseudo</label>
                <input 
                    type="text" 
                    id="inputName"
                    value="${escapeHtml(state.playerName || '')}" 
                    oninput="state.playerName = this.value" 
                    class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" 
                    placeholder="Entrez votre nom"
                />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button onclick="createGame()" class="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition">
                    🎮 Créer une partie
                </button>
                <button onclick="showJoinScreen()" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition">
                    🔗 Rejoindre
                </button>
            </div>

            <div class="bg-amber-50 p-4 rounded-lg text-sm text-gray-700">
                <h3 class="font-bold mb-2">📖 Règles rapides :</h3>
                <ul class="list-disc pl-5 space-y-1">
                    <li>Chaque joueur joue 1 carte par tour</li>
                    <li>Les cartes sont placées dans l'ordre croissant</li>
                    <li>Si vous êtes le 6ème d'une rangée, vous ramassez les 5 cartes</li>
                    <li>Le joueur avec le moins de points gagne !</li>
                </ul>
            </div>
        </div>

        <div class="mt-4 max-w-2xl mx-auto">
            ${renderDebugPanel()}
        </div>
    </div>
`;

const renderJoin = () => `
    <div class="container mx-auto px-4 py-8">
        <div class="max-w-md mx-auto bg-white rounded-xl shadow-2xl p-8">
            <h2 class="text-2xl font-bold text-center mb-6">Rejoindre une partie</h2>

            <div class="mb-4">
                <label class="block text-sm font-semibold mb-2">Votre pseudo</label>
                <input
                    type="text"
                    id="inputName"
                    value="${escapeHtml(state.playerName || '')}"
                    oninput="state.playerName = this.value"
                    class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Entrez votre nom"
                />
            </div>

            <div class="mb-4">
                <label class="block text-sm font-semibold mb-2">Code de la partie</label>
                <input
                    type="text"
                    id="inputCode"
                    value="${escapeHtml(state.joinCode || '')}"
                    oninput="state.joinCode = this.value.toUpperCase()"
                    class="w-full px-4 py-2 border rounded-lg uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: ABC123"
                    maxlength="6"
                    ${state.invitePending ? 'readonly' : ''}
                />
                ${state.invitePending ? '<div class="text-sm text-gray-500 mt-2">Vous avez été invité – vérifiez votre pseudo puis cliquez sur Rejoindre.</div>' : ''}
            </div>

            <button
                id="join-btn"
                class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg mb-3 transition"
            >
                🎮 Rejoindre comme joueur
            </button>
            
            <button
                onclick="joinAsSpectator()"
                class="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 rounded-lg mb-3 transition"
            >
                👁️ Rejoindre comme spectateur
            </button>

            <button
                onclick="backToHome()"
                class="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-lg transition"
            >
                Retour
            </button>
            
            <div class="mt-4 bg-purple-50 p-3 rounded-lg text-xs text-gray-700">
                <strong>Mode spectateur :</strong> Vous pourrez observer la partie et voir toutes les animations, mais ne recevrez pas de cartes.
            </div>
        </div>

        <div class="mt-4 max-w-md mx-auto">
            ${renderDebugPanel()}
        </div>
    </div>
`;

const renderLobby = () => {
    const isHost = state.game.hostId === state.playerId;
    const me = state.game.players.find(p => p.id === state.playerId) || { ready: false, isSpectator: false };
    const activePlayers = state.game.players.filter(p => !p.isSpectator);
    const spectators = state.game.players.filter(p => p.isSpectator);
    const canStart = isHost && activePlayers.length >= 2 && activePlayers.every(p => p.ready);

    return `
    <div class="container mx-auto px-4 py-8">
        <div class="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl p-6">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-orange-600">Salon d'attente</h2>
                <div class="flex gap-2">
                    <button onclick="copyLink()" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition">
                        ${state.copied ? '✓ Copié !' : '📋 Copier le lien'}
                    </button>
                    <button onclick="leaveGame()" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition">Quitter</button>
                </div>
            </div>

            <div class="mb-6 bg-amber-50 p-4 rounded-lg">
                <div class="flex justify-between items-center">
                    <div>
                        <small class="text-gray-600">Code de la partie</small>
                        <div class="text-2xl font-bold">${escapeHtml(state.gameCode)}</div>
                    </div>
                    <div class="text-right">
                        <small class="text-gray-500">Joueurs actifs</small>
                        <div class="text-2xl font-bold">${activePlayers.length}</div>
                    </div>
                </div>
            </div>

            <h3 class="font-bold mb-3">🎮 Joueurs</h3>
            <div class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                ${activePlayers.map(p => `
                    <div class="bg-gray-100 p-4 rounded-lg flex justify-between items-center ${p.id === state.playerId ? 'ring-2 ring-orange-500' : ''}">
                        <div>
                            <div class="font-semibold text-lg">${escapeHtml(p.name)}</div>
                            ${p.id === state.game.hostId ? '<span class="text-xs bg-orange-500 text-white px-2 py-1 rounded-full">Hôte</span>' : ''}
                        </div>
                        <div class="text-3xl">${p.ready ? '✅' : '⏳'}</div>
                    </div>
                `).join('')}
            </div>
            
            ${spectators.length > 0 ? `
                <h3 class="font-bold mb-3">👁️ Spectateurs (${spectators.length})</h3>
                <div class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                    ${spectators.map(p => `
                        <div class="bg-purple-50 p-3 rounded-lg flex justify-between items-center ${p.id === state.playerId ? 'ring-2 ring-purple-500' : ''}">
                            <div class="font-semibold">${escapeHtml(p.name)}</div>
                            <div class="text-2xl">👁️</div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            <div class="flex gap-3">
                ${!me.isSpectator ? `
                    <button onclick="toggleReady()" class="flex-1 ${me.ready ? 'bg-gray-300 hover:bg-gray-400' : 'bg-green-500 hover:bg-green-600 text-white'} font-bold py-3 rounded-lg transition">
                        ${me.ready ? 'Pas prêt' : 'Je suis prêt !'}
                    </button>
                ` : '<div class="flex-1 bg-purple-100 p-3 rounded-lg text-center text-gray-600">En attente du lancement...</div>'}
                ${isHost && !me.isSpectator ? `<button onclick="startGame()" class="flex-1 ${canStart ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'} font-bold py-3 rounded-lg transition" ${!canStart ? 'disabled' : ''}>🚀 Lancer la partie</button>` : ''}
            </div>

            ${isHost && !canStart ? '<p class="text-sm text-red-500 mt-3 text-center">Tous les joueurs doivent être prêts (minimum 2 joueurs)</p>' : ''}
        </div>

        <div class="mt-4 max-w-4xl mx-auto">
            ${renderDebugPanel()}
        </div>
    </div>
    `;
};

const renderGame = () => {
    const me = state.game.players.find(p => p.id === state.playerId);
    const activePlayers = state.game.players.filter(p => !p.isSpectator);
    const waitingPlayers = activePlayers.filter(p => !hasPlayed(p)).map(p => p.name);
    const isHost = state.game.hostId === state.playerId;
    const isSpectator = me && me.isSpectator;

    if (state.game.status === 'finished') {
        const winner = activePlayers.reduce((min, p) => p.score < min.score ? p : min);
        const finishMessage = state.game.finishReason === 'score_limit' 
            ? `🎯 ${escapeHtml(winner.name)} a atteint 66 points !`
            : `🏁 Fin des ${state.game.maxRounds} manches !`;
        
        return `
        <div class="container mx-auto px-4 py-8">
            <div class="max-w-2xl mx-auto bg-white rounded-xl shadow-2xl p-8 text-center">
                <h1 class="text-4xl font-bold text-green-600 mb-4">🎉 Partie terminée !</h1>
                <p class="text-lg text-gray-600 mb-4">${finishMessage}</p>
                <h2 class="text-2xl mb-6">🏆 ${escapeHtml(winner.name)} gagne avec ${winner.score} points !</h2>
                <div class="space-y-2 mb-6">
                    ${activePlayers.sort((a,b)=>a.score-b.score).map((p,i)=>`
                        <div class="bg-gray-100 p-4 rounded-lg flex justify-between items-center">
                            <div class="flex items-center gap-3"><span class="text-2xl">${i===0 ? '🥇' : i===1 ? '🥈' : i===2 ? '🥉' : `${i+1}.`}</span><span class="font-bold">${escapeHtml(p.name)}</span></div>
                            <span class="font-bold text-xl">${p.score} 🐮</span>
                        </div>
                    `).join('')}
                </div>
                <div class="flex gap-3 justify-center">
                    ${isHost && !isSpectator ? `<button onclick="restartGame()" class="bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-lg">🔄 Rejouer</button>` : ''}
                    <button onclick="leaveGame()" class="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-lg">🏠 Retour à l'accueil</button>
                </div>
                ${!isHost ? '<p class="text-sm text-gray-500 mt-4">En attente que l\'hôte relance la partie...</p>' : ''}
            </div>
            <div class="mt-4 max-w-2xl mx-auto">${renderDebugPanel()}</div>
        </div>
        `;
    }

    return `
    ${renderRevealOverlay()}
    
    <div class="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
        <div class="max-w-6xl mx-auto">
            <!-- En-tête responsive -->
            <div class="bg-white rounded-lg shadow-lg p-3 sm:p-4 mb-2 sm:mb-4">
                <div class="flex flex-col sm:flex-row justify-between items-center gap-2">
                    <div class="text-center sm:text-left">
                        <h2 class="text-lg sm:text-xl font-bold text-orange-600">
                            Manche ${state.game.round}/${state.game.maxRounds} - Tour ${state.game.currentTurn}/10
                            ${isSpectator ? ' 👁️ <span class="text-sm text-purple-600">(Spectateur)</span>' : ''}
                        </h2>
                        <p class="text-xs sm:text-sm text-gray-600">Code: ${escapeHtml(state.gameCode)}</p>
                    </div>
                    <button onclick="leaveGame()" class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg transition text-sm">Quitter</button>
                </div>
            </div>

            <!-- Scores joueurs responsive -->
            <div class="bg-white rounded-lg shadow-lg p-3 sm:p-4 mb-2 sm:mb-4">
                <div class="grid grid-cols-2 sm:grid-cols-${Math.min(activePlayers.length,4)} gap-2 sm:gap-3">
                    ${activePlayers.map(p => `
                        <div class="text-center p-2 sm:p-3 rounded-lg ${p.id === state.playerId ? 'bg-orange-100 ring-2 ring-orange-500' : 'bg-gray-100'}">
                            <div class="font-semibold truncate text-xs sm:text-base">${escapeHtml(p.name)}</div>
                            <div class="text-2xl sm:text-3xl font-bold">${p.score} 🐮</div>
                            ${hasPlayed(p) ? '<div class="text-green-500 text-xs sm:text-sm font-semibold">✓ Joué</div>' : '<div class="text-gray-400 text-xs sm:text-sm">En attente...</div>'}
                        </div>
                    `).join('')}
                </div>
            </div>

            ${renderTurnHistory()}

            <!-- Rangées responsive -->
            <div class="bg-white rounded-lg shadow-lg p-3 sm:p-6 mb-2 sm:mb-4">
                <h3 class="font-bold mb-3 sm:mb-4 text-base sm:text-lg">Rangées de cartes :</h3>

                ${state.game.waitingForRowChoice && state.game.waitingForRowChoice === state.playerId
                    ? `<div class="bg-orange-100 border-2 border-orange-500 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 text-center font-bold text-orange-700 animate-pulse text-sm sm:text-base">
                        ⚠️ Votre carte (${state.game.pendingCard}) est trop petite ! Choisissez une rangée à ramasser :
                        <div class="text-xs mt-2 text-orange-600">💡 Astuce : Choisissez la rangée avec le moins de points, ou celle qui pourrait piéger un adversaire</div>
                    </div>`
                    : state.game.waitingForRowChoice ? `<div class="bg-blue-100 border-2 border-blue-500 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 text-center font-bold text-blue-700 text-sm sm:text-base">⏳ ${escapeHtml(state.game.players.find(p=>p.id===state.game.waitingForRowChoice)?.name||'Un joueur')} doit choisir une rangée...</div>` : ''
                }

                <div class="space-y-2 sm:space-y-3">
                    ${state.game.rows.map((row,i)=> {
                        const totalHeads = row.reduce((s,c)=>s+calculateHeads(c),0);
                        const canClick = state.game.waitingForRowChoice && state.game.waitingForRowChoice === state.playerId;
                        
                        // Analyse stratégique si le joueur doit choisir
                        let strategicInfo = '';
                        if (canClick) {
                            const analysis = analyzeRowChoice(i, state.game.pendingCard);
                            const isMinimum = state.game.rows.every((r, idx) => {
                                const otherPoints = r.reduce((s,c)=>s+calculateHeads(c),0);
                                return idx === i || totalHeads <= otherPoints;
                            });
                            
                            strategicInfo = `
                                <div class="text-xs mt-1 ${isMinimum ? 'text-green-700 font-semibold' : 'text-gray-600'}">
                                    ${isMinimum ? '✅ Meilleur choix (min. points)' : ''}
                                    ${analysis.strategicAdvice ? `<br>🎯 ${analysis.strategicAdvice}` : ''}
                                </div>
                            `;
                        }
                        
                        return `
                        <div id="row-${i}" class="flex items-center gap-2 sm:gap-3 p-2 rounded-lg ${canClick ? 'cursor-pointer hover:bg-orange-50 border-2 border-transparent hover:border-orange-500 transition pulse-animation' : 'border border-gray-200'}" ${canClick ? `onclick="chooseRow(${i})"` : ''}>
                            <span class="font-bold text-gray-700 text-xs sm:text-base min-w-[40px] sm:min-w-[50px]">R${i+1}</span>
                            <div class="flex gap-1 flex-wrap flex-1">
                                ${row.map(c=> renderCard(c, false, false, true)).join('')}
                            </div>
                            <div class="text-right">
                                <span class="text-xs sm:text-sm font-semibold text-gray-700 bg-gray-100 px-2 py-1 sm:px-3 sm:py-2 rounded-lg whitespace-nowrap">${row.length}/5 | ${totalHeads}🐮</span>
                                ${strategicInfo}
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Main du joueur responsive -->
            ${isSpectator ? `
                <div class="bg-purple-50 rounded-lg shadow-lg p-3 sm:p-6 text-center">
                    <h3 class="font-bold mb-2 text-base sm:text-lg">👁️ Mode spectateur</h3>
                    <p class="text-sm text-gray-600">Vous observez la partie. Profitez du spectacle ! 🍿</p>
                </div>
            ` : `
                <div class="bg-white rounded-lg shadow-lg p-3 sm:p-6">
                    <h3 class="font-bold mb-3 sm:mb-4 text-base sm:text-lg">Votre main :</h3>
                    ${hasPlayed(me)
                        ? `<div class="text-center py-4 sm:py-8"><p class="text-xl sm:text-2xl mb-2">✓ Vous avez joué votre carte !</p><p class="text-gray-600 mb-2 text-sm sm:text-base">En attente des autres joueurs...</p>${waitingPlayers.length ? `<p class="text-xs sm:text-sm text-gray-500">Attente de : ${escapeHtml(waitingPlayers.join(', '))}</p>` : ''}</div>`
                        : `<div class="flex gap-2 flex-wrap justify-center mb-3 sm:mb-4">${me.hand.map(c => renderCard(c, state.selectedCard === c, true, false)).join('')}</div><p class="text-center text-xs sm:text-sm text-gray-600">${state.selectedCard ? '👆 Cliquez à nouveau sur la carte pour confirmer' : '👇 Choisissez une carte à jouer'}</p>`
                    }
                </div>
            `}
        </div>

        ${!state.isMobile ? `<div class="mt-4 max-w-6xl mx-auto">${renderDebugPanel()}</div>` : ''}
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