/* ==================== UI RENDERING - IMPROVED ==================== */

/* ==================== NOUVEAU: Historique conditionnel ==================== */

const renderTurnHistory = () => {
    if (!state.game.turnHistory || state.game.turnHistory.length === 0) return '';
    
    // ✅ AMÉLIORATION : N'afficher l'historique que si tous les joueurs actifs ont joué
    const activePlayers = state.game.players.filter(p => !p.isSpectator);
    const allPlayersPlayed = activePlayers.every(p => hasPlayed(p));
    
    // ✅ Ou si on est en phase de révélation/résolution
    const isResolving = state.revealedCards !== null || state.game.waitingForRowChoice !== null;
    
    if (!allPlayersPlayed && !isResolving) {
        return `
        <div class="bg-gray-100 rounded-lg shadow-lg p-3 mb-2 sm:mb-4 text-center">
            <h3 class="font-bold text-sm mb-2 text-gray-500">📜 Historique</h3>
            <div class="text-xs text-gray-400 italic">
                🔒 Visible après que tous les joueurs aient joué
            </div>
        </div>
        `;
    }
    
    // ✅ Filtrer pour n'afficher que les actions du tour actuel et des tours précédents résolus
    const currentTurnActions = state.game.turnHistory.filter(action => 
        action.turn < state.game.currentTurn || 
        (action.turn === state.game.currentTurn && allPlayersPlayed)
    );
    
    if (currentTurnActions.length === 0) return '';
    
    const recentActions = currentTurnActions.slice(-5).reverse();
    
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

/* ==================== Indicateurs visuels améliorés ==================== */

const renderPlayerStatus = (player, isMe = false) => {
    const hasPlayedCard = hasPlayed(player);
    
    let statusIcon = '';
    let statusText = '';
    let statusClass = '';
    
    if (hasPlayedCard) {
        statusIcon = '✅';
        statusText = 'A joué';
        statusClass = 'text-green-600 font-semibold';
    } else if (player.isSpectator) {
        statusIcon = '👁️';
        statusText = 'Spectateur';
        statusClass = 'text-purple-500';
    } else {
        statusIcon = '⏳';
        statusText = 'Réfléchit...';
        statusClass = 'text-orange-500 animate-pulse';
    }
    
    return `
        <div class="text-center p-2 sm:p-3 rounded-lg ${isMe ? 'bg-orange-100 ring-2 ring-orange-500' : hasPlayedCard ? 'bg-green-50' : 'bg-gray-100'}">
            <div class="font-semibold truncate text-xs sm:text-base">${escapeHtml(player.name)}</div>
            <div class="text-2xl sm:text-3xl font-bold">${player.score} 🐮</div>
            <div class="${statusClass} text-xs sm:text-sm flex items-center justify-center gap-1">
                <span>${statusIcon}</span>
                <span>${statusText}</span>
            </div>
        </div>
    `;
};

/* ==================== Overlay de révélation amélioré ==================== */

const renderRevealOverlay = () => {
    if (!state.revealedCards || state.revealedCards.length === 0) return '';
    
    const isWaitingForMyChoice = state.game.waitingForRowChoice === state.playerId;
    
    if (isWaitingForMyChoice) return '';
    
    return `
    <div id="reveal-overlay" class="fixed inset-0 bg-black bg-opacity-70 z-[10000] flex items-center justify-center transition-opacity duration-500" style="opacity: 1;">
        <div class="text-center max-w-4xl mx-auto px-4">
            <h2 class="text-white text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 animate-pulse">
                🎴 Cartes jouées ce tour
            </h2>
            <div class="flex gap-3 sm:gap-6 justify-center items-end flex-wrap">
                ${state.revealedCards.map(play => {
                    const heads = calculateHeads(play.card);
                    const color = getCardColor(play.card);
                    return `
                    <div class="text-center transform transition-all duration-300 hover:scale-105" data-revealed-card="${play.card}">
                        <div class="${color} text-white rounded-lg shadow-2xl flex flex-col items-center justify-between p-2 sm:p-3 font-bold w-20 h-28 sm:w-24 sm:h-32 mb-2 bounce-in">
                            <span class="text-2xl sm:text-3xl">${play.card}</span>
                            <div class="text-lg sm:text-2xl">${'🐮'.repeat(heads)}</div>
                        </div>
                        <div class="text-white font-semibold text-sm sm:text-lg">${escapeHtml(play.name)}</div>
                    </div>
                    `;
                }).join('')}
            </div>
            ${state.game.waitingForRowChoice ? 
                `<p class="text-white text-lg sm:text-xl mt-6 sm:mt-8 animate-pulse">⏳ En attente de ${escapeHtml(state.game.players.find(p => p.id === state.game.waitingForRowChoice)?.name || 'un joueur')}...</p>` 
                : ''
            }
        </div>
    </div>
    `;
};

/* ==================== Rendu du jeu avec améliorations ==================== */

const renderGame = () => {
    const me = state.game.players.find(p => p.id === state.playerId);
    const activePlayers = state.game.players.filter(p => !p.isSpectator);
    const waitingPlayers = activePlayers.filter(p => !hasPlayed(p));
    const isHost = state.game.hostId === state.playerId;
    const isSpectator = me && me.isSpectator;
    
    // ✅ Liste des joueurs qui n'ont pas encore joué
    const waitingPlayerNames = waitingPlayers.map(p => p.name).join(', ');

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
                        ${waitingPlayers.length > 0 && !isSpectator ? 
                            `<p class="text-xs text-orange-600 mt-1">⏳ En attente de: ${escapeHtml(waitingPlayerNames)}</p>` 
                            : ''
                        }
                    </div>
                    <div class="flex gap-2">
                        <button onclick="toggleAnimations()" class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg transition text-sm" title="Activer/Désactiver les animations">
                            ${state.enableAnimations ? '🎬' : '⏸️'}
                        </button>
                        <button onclick="leaveGame()" class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg transition text-sm">Quitter</button>
                    </div>
                </div>
            </div>

            <!-- Scores joueurs responsive avec nouveaux indicateurs -->
            <div class="bg-white rounded-lg shadow-lg p-3 sm:p-4 mb-2 sm:mb-4">
                <div class="grid grid-cols-2 sm:grid-cols-${Math.min(activePlayers.length,4)} gap-2 sm:gap-3">
                    ${activePlayers.map(p => renderPlayerStatus(p, p.id === state.playerId)).join('')}
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
                        ? `<div class="text-center py-4 sm:py-8">
                            <p class="text-xl sm:text-2xl mb-2">✓ Vous avez joué votre carte !</p>
                            <p class="text-gray-600 mb-2 text-sm sm:text-base">En attente des autres joueurs...</p>
                            ${waitingPlayers.length ? `<p class="text-xs sm:text-sm text-gray-500">Attente de : ${escapeHtml(waitingPlayerNames)}</p>` : ''}
                        </div>`
                        : `<div class="flex gap-2 flex-wrap justify-center mb-3 sm:mb-4">
                            ${me.hand.map(c => renderCard(c, state.selectedCard === c, true, false)).join('')}
                        </div>
                        <p class="text-center text-xs sm:text-sm text-gray-600">
                            ${state.selectedCard ? '👆 Cliquez à nouveau sur la carte pour confirmer' : '👇 Choisissez une carte à jouer'}
                        </p>`
                    }
                </div>
            `}
        </div>

        ${!state.isMobile ? `<div class="mt-4 max-w-6xl mx-auto">${renderDebugPanel()}</div>` : ''}
    </div>
    `;
};

/* Note: Les autres fonctions de rendu (renderHome, renderJoin, renderLobby, renderCard, renderDebugPanel) 
   restent inchangées et doivent être copiées depuis l'original */