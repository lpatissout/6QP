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
            default:
                debugLog('Unknown animation type, skipping', anim.type);
                resolve();
        }
    });
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
    
    const targetRow = document.getElementById(`row-${rowIndex}`);
    if (!targetRow) {
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
        const rowCards = targetRow.querySelectorAll('.w-12');
        const rectRow = targetRow.getBoundingClientRect();
        
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
    
    const targetRow = document.getElementById(`row-${rowIndex}`);
    if (!targetRow) {
        callback();
        return;
    }

    const cards = targetRow.querySelectorAll('div[class*="w-12"]');
    const overlay = document.getElementById('flying-cards-overlay');

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
            setTimeout(() => popup.remove(), 500);
            if (typeof render === 'function') render();
            callback();
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
    
    if (state.revealedCards && state.revealedCards.length > 0) {
        state.revealedCards = state.revealedCards.filter(p => p.card === card);
    }
    
    if (typeof render === 'function') render();
    
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
        setTimeout(() => popup.remove(), 500);
        
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
