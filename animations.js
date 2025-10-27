/* ==================== ANIMATION SYSTEM ==================== */

const queueAnimation = (type, data) => {
    if (!state.enableAnimations) {
        state.animationsDisabledReason = 'Animations désactivées par l\'utilisateur';
        debugLog('Animation skipped - disabled', { type });
        return;
    }
    state.animationQueue.push({ type, data, id: Date.now() + Math.random() });
    debugLog('Animation queued', { type, queueLength: state.animationQueue.length, enableAnimations: state.enableAnimations });
};

const processAnimationQueue = async () => {
    if (!state.enableAnimations) {
        state.animationQueue = [];
        return;
    }

    if (state.isAnimating || state.animationQueue.length === 0) return;

    state.isAnimating = true;

    while (state.animationQueue.length > 0) {
        const anim = state.animationQueue.shift();
        await playAnimation(anim);
    }

    state.isAnimating = false;
    debugLog('Animation queue completed');
};

const playAnimation = (anim) => {
    return new Promise((resolve) => {
        debugLog('Playing animation', { type: anim.type });

        switch (anim.type) {
            case 'REVEAL_CARDS':
                animateRevealCards(anim.data, resolve);
                break;
            case 'FADE_OVERLAY':
                animateFadeOverlay(anim.data, resolve);
                break;
            case 'CARD_TO_ROW':
                animateCardToRow(anim.data, resolve);
                break;
            case 'SIXTH_CARD_PENALTY':
                animate6thCardPenalty(anim.data, resolve);
                break;
            case 'WAITING_FOR_CHOICE':
                animateWaitingForChoice(anim.data, resolve);
                break;
            case 'PLAYER_CHOSE_ROW':
                animatePlayerChoseRow(anim.data, resolve);
                break;
            case 'NEW_ROUND':
                animateNewRound(anim.data, resolve);
                break;
            default:
                debugLog('Unknown animation type, skipping', anim.type);
                resolve();
        }
    });
};

/* ==================== HELPER: BANNIÈRES EXPLICATIVES ==================== */

const showExplanationBanner = (title, message, bgColor = 'bg-blue-500', duration = 2000) => {
    const banner = document.createElement('div');
    banner.className = `fixed top-20 left-1/2 transform -translate-x-1/2 ${bgColor} text-white px-6 py-3 rounded-lg shadow-xl z-[10002] max-w-md slide-up`;
    banner.innerHTML = `
        <div class="font-bold text-lg mb-1">${title}</div>
        <div class="text-sm opacity-90">${message}</div>
    `;
    document.body.appendChild(banner);
    
    setTimeout(() => {
        banner.style.opacity = '0';
        banner.style.transform = 'translate(-50%, -20px)';
        setTimeout(() => banner.remove(), 300);
    }, duration);
};

/* ==================== ANIMATIONS INDIVIDUELLES ==================== */

const animateRevealCards = (data, callback) => {
    const { plays } = data;
    
    if (!plays || plays.length === 0) {
        callback();
        return;
    }
    
    state.revealedCards = plays;
    if (typeof render === 'function') render();
    
    setTimeout(() => {
        callback();
    }, ANIMATION_CONSTANTS.REVEAL_DURATION);
};

const animateFadeOverlay = (data, callback) => {
    debugLog('Fading overlay');
    
    const overlay = document.getElementById('reveal-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            state.revealedCards = null;
            if (typeof render === 'function') render();
            callback();
        }, ANIMATION_CONSTANTS.FADE_DURATION);
    } else {
        state.revealedCards = null;
        if (typeof render === 'function') render();
        callback();
    }
};

const animateCardToRow = (data, callback) => {
    const { card, rowIndex, playerName, is6thCard } = data;
    
    debugLog('Animating card to row', { card, rowIndex, playerName, is6thCard });
    
    // Message explicatif
    const targetRow = state.game.rows[rowIndex];
    const lastCard = targetRow[targetRow.length - 1];
    showExplanationBanner(
        `🎴 ${escapeHtml(playerName)} place le ${card}`,
        `La carte va en rangée ${rowIndex + 1} (la plus proche après ${lastCard})`,
        'bg-blue-500',
        1500
    );
    
    const targetRowEl = document.getElementById(`row-${rowIndex}`);
    if (!targetRowEl) {
        debugLog('Target row not found', { rowIndex });
        callback();
        return;
    }

    const overlay = document.getElementById('flying-cards-overlay');
    const color = getCardColor(card);
    
    const flyingCard = document.createElement('div');
    flyingCard.className = `${color} text-white rounded-lg shadow-2xl flex flex-col items-center justify-center font-bold`;
    flyingCard.style.cssText = `
        position: fixed;
        width: 80px;
        height: 112px;
        z-index: 9999;
        pointer-events: none;
        transform-origin: center center;
        opacity: 0;
        transform: scale(0.5) rotate(-10deg);
        transition: all ${state.animationSpeed}ms cubic-bezier(0.4, 0.0, 0.2, 1);
    `;
    flyingCard.innerHTML = `<span class="text-3xl">${card}</span>`;

    overlay.appendChild(flyingCard);

    const startX = window.innerWidth / 2 - 40;
    const startY = window.innerHeight / 2 - 56;
    flyingCard.style.left = startX + 'px';
    flyingCard.style.top = startY + 'px';

    requestAnimationFrame(() => {
        flyingCard.style.opacity = '1';
        flyingCard.style.transform = 'scale(1.1) rotate(0deg)';
    });

    setTimeout(() => {
        const rowCards = targetRowEl.querySelectorAll('.w-12');
        const rectRow = targetRowEl.getBoundingClientRect();
        
        const targetX = is6thCard ? rectRow.left + 100 : rectRow.left + 100 + rowCards.length * 50;
        const targetY = rectRow.top + rectRow.height / 2 - 32;

        flyingCard.style.left = targetX + 'px';
        flyingCard.style.top = targetY + 'px';
        flyingCard.style.width = '48px';
        flyingCard.style.height = '64px';
        flyingCard.style.transform = 'scale(1) rotate(0deg)';

        setTimeout(() => {
            flyingCard.style.opacity = '0';
            flyingCard.style.transform = 'scale(0.8)';
            setTimeout(() => {
                flyingCard.remove();
                if (typeof render === 'function') render();
                callback();
            }, 300);
        }, state.animationSpeed);
    }, 300);
};

const animate6thCardPenalty = (data, callback) => {
    const { card, rowIndex, playerName, penaltyPoints } = data;
    
    debugLog('Animating 6th card penalty', { card, rowIndex, playerName, penaltyPoints });
    
    // AMÉLIORATION: Explication claire
    showExplanationBanner(
        `⚠️ ${escapeHtml(playerName)} place la 6ème carte !`,
        `La carte ${card} force ${escapeHtml(playerName)} à ramasser les 5 cartes de la rangée ${rowIndex + 1}`,
        'bg-orange-600',
        2500
    );
    
    const targetRow = document.getElementById(`row-${rowIndex}`);
    if (!targetRow) {
        callback();
        return;
    }

    const cards = targetRow.querySelectorAll('div[class*="w-12"]');
    const overlay = document.getElementById('flying-cards-overlay');

    // Animation des cartes qui partent
    cards.forEach((cardEl, i) => {
        const clone = cardEl.cloneNode(true);
        const cardRect = cardEl.getBoundingClientRect();
        clone.style.cssText = `
            position: fixed;
            left: ${cardRect.left}px;
            top: ${cardRect.top}px;
            width: ${cardRect.width}px;
            height: ${cardRect.height}px;
            z-index: 9998;
            transition: all 600ms ease-in-out;
        `;
        overlay.appendChild(clone);

        setTimeout(() => {
            const rowRect = targetRow.getBoundingClientRect();
            clone.style.left = (rowRect.left + 80) + 'px';
            clone.style.transform = `translateX(${i * 5}px)`;
        }, 100);

        setTimeout(() => {
            clone.style.opacity = '0';
            clone.style.transform = `translateX(${i * 5}px) scale(0.5)`;
        }, 800);

        setTimeout(() => clone.remove(), 1400);
    });

    // Ajouter la nouvelle carte qui prend la place
    setTimeout(() => {
        const color = getCardColor(card);
        const newCard = document.createElement('div');
        const rowRect = targetRow.getBoundingClientRect();
        
        newCard.className = `${color} text-white rounded-lg shadow-2xl flex flex-col items-center justify-center font-bold`;
        newCard.style.cssText = `
            position: fixed;
            left: ${rowRect.left + 100}px;
            top: ${rowRect.top + 10}px;
            width: 48px;
            height: 64px;
            z-index: 9999;
            opacity: 0;
            transform: scale(1.5);
            transition: all 600ms ease-out;
        `;
        newCard.innerHTML = `<span class="text-2xl">${card}</span>`;
        overlay.appendChild(newCard);
        
        requestAnimationFrame(() => {
            newCard.style.opacity = '1';
            newCard.style.transform = 'scale(1)';
        });
        
        setTimeout(() => {
            newCard.style.opacity = '0';
            setTimeout(() => newCard.remove(), 300);
        }, 1000);
    }, 1200);

    // CORRECTION ERREUR 2: Un seul popup de pénalité
    setTimeout(() => {
        const popup = document.createElement('div');
        popup.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white px-8 py-6 rounded-xl shadow-2xl z-[10001] font-bold text-lg bounce-in';
        popup.innerHTML = `
            <div class="text-center">
                <div class="text-3xl mb-2">⚠️ ${escapeHtml(playerName)} ramasse !</div>
                <div class="text-4xl mt-3 font-black">+${penaltyPoints} 🐮</div>
            </div>
        `;
        document.body.appendChild(popup);

        setTimeout(() => {
            popup.style.opacity = '0';
            setTimeout(() => {
                popup.remove();
                if (typeof render === 'function') render();
                callback();
            }, 500);
        }, ANIMATION_CONSTANTS.PENALTY_DISPLAY_DURATION);
    }, 1500);
};

const animateWaitingForChoice = (data, callback) => {
    const { playerName } = data;
    
    debugLog('Waiting for player choice', { playerName, isMe: state.game.waitingForRowChoice === state.playerId });
    
    if (state.game.waitingForRowChoice === state.playerId) {
        setTimeout(() => {
            debugLog('Clearing revealed cards for player who must choose');
            state.revealedCards = null;
            if (typeof render === 'function') render();
            callback();
        }, 100);
    } else {
        debugLog('Keeping revealed cards for waiting players');
        callback();
    }
};

const animatePlayerChoseRow = (data, callback) => {
    const { card, rowIndex, playerName, penaltyPoints } = data;
    
    // AMÉLIORATION: Explication du choix
    showExplanationBanner(
        `💡 ${escapeHtml(playerName)} choisit la rangée ${rowIndex + 1}`,
        `Carte trop petite (${card}) : ramasse ${penaltyPoints} points de pénalité`,
        'bg-purple-600',
        2500
    );
    
    if (state.revealedCards && state.revealedCards.length > 0) {
        state.revealedCards = state.revealedCards.filter(p => p.card === card);
    }
    
    if (typeof render === 'function') render();
    
    // CORRECTION ERREUR 2: Ne pas afficher de popup ici (déjà dans animate6thCardPenalty)
    // On fait juste le fade de l'overlay
    setTimeout(() => {
        const overlay = document.getElementById('reveal-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                state.revealedCards = null;
                if (typeof render === 'function') render();
                callback();
            }, 500);
        } else {
            state.revealedCards = null;
            if (typeof render === 'function') render();
            callback();
        }
    }, ANIMATION_CONSTANTS.PENALTY_DISPLAY_DURATION);
};

// NOUVEAU: Animation de nouvelle manche
const animateNewRound = (data, callback) => {
    const { round } = data;
    
    const popup = document.createElement('div');
    popup.className = 'fixed inset-0 bg-black bg-opacity-80 z-[10003] flex items-center justify-center';
    popup.innerHTML = `
        <div class="bg-gradient-to-br from-orange-500 to-red-500 text-white px-12 py-10 rounded-2xl shadow-2xl text-center bounce-in">
            <div class="text-6xl mb-4">🎯</div>
            <div class="text-4xl font-black mb-2">Manche ${round}</div>
            <div class="text-xl opacity-90">Nouvelles cartes distribuées !</div>
        </div>
    `;
    document.body.appendChild(popup);
    
    setTimeout(() => {
        popup.style.opacity = '0';
        setTimeout(() => {
            popup.remove();
            if (typeof render === 'function') render();
            callback();
        }, 500);
    }, 2000);
};