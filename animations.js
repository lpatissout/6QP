/* ==================== ANIMATION SYSTEM - COMPLETE & CORRECTED ==================== */

// Historique des animations déjà jouées (évite les doublons)
const playedAnimations = new Set();

const queueAnimation = (type, data, animationId) => {
  if (!state.enableAnimations) {
    state.animationsDisabledReason = 'Animations désactivées par l\'utilisateur';
    debugLog('Animation skipped - disabled', { type });
    return;
  }
  
  // ✅ Vérifier si l'animation a déjà été jouée
  if (animationId && playedAnimations.has(animationId)) {
    debugLog('Animation already played, skipping', { type, animationId });
    return;
  }
  
  state.animationQueue.push({ type, data, id: animationId || (Date.now() + Math.random()) });
  debugLog('Animation queued', { type, queueLength: state.animationQueue.length, animationId });
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
    
    // ✅ Marquer comme jouée avant de jouer
    if (anim.id) {
      playedAnimations.add(anim.id);
    }
    
    await playAnimation(anim);
  }
  
  state.isAnimating = false;
  debugLog('Animation queue completed');
};

// ✅ Nettoyer l'historique des animations anciennes (> 1 minute)
const cleanupAnimationHistory = () => {
  const oneMinuteAgo = Date.now() - 60000;
  const toDelete = [];
  
  playedAnimations.forEach(id => {
    // Format: timestamp-random ou juste timestamp
    const timestamp = parseInt(id.toString().split('-')[0]);
    if (timestamp < oneMinuteAgo) {
      toDelete.push(id);
    }
  });
  
  toDelete.forEach(id => playedAnimations.delete(id));
  
  if (toDelete.length > 0) {
    debugLog('Cleaned up old animations', { count: toDelete.length });
  }
};

// ✅ Nettoyer toutes les minutes
setInterval(cleanupAnimationHistory, 60000);

const playAnimation = (anim) => {
  return new Promise((resolve) => {
    debugLog('Playing animation', { type: anim.type, id: anim.id });
    
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

/* ==================== HELPER FUNCTIONS ==================== */

// ✅ HELPER: Get card color based on card number
const getCardColor = (card) => {
  const num = parseInt(card);
  if (num <= 10) return 'bg-blue-500';
  if (num <= 20) return 'bg-green-500';
  if (num <= 30) return 'bg-yellow-500';
  if (num <= 40) return 'bg-red-500';
  return 'bg-purple-500';
};

// ✅ HELPER: Escape HTML to prevent XSS
const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// ✅ HELPER: Ensure overlay exists and return it
const getOverlay = () => {
  let overlay = document.getElementById('flying-cards-overlay');
  if (!overlay) {
    debugLog('Creating missing overlay element');
    overlay = document.createElement('div');
    overlay.id = 'flying-cards-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 5000;
      pointer-events: none;
    `;
    document.body.appendChild(overlay);
  }
  return overlay;
};

// ✅ HELPER: Bannières explicatives
const showExplanationBanner = (title, message, bgColor = 'bg-blue-500', duration = 2000) => {
  const banner = document.createElement('div');
  banner.className = `fixed top-20 left-1/2 ${bgColor} text-white px-6 py-3 rounded-lg shadow-xl z-[10002] max-w-md`;
  banner.style.cssText = `
    transform: translateX(-50%);
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
  `;
  banner.innerHTML = `
    <div class="font-bold text-lg mb-1">${title}</div>
    <div class="text-sm opacity-90">${message}</div>
  `;
  document.body.appendChild(banner);
  
  // Fade in
  requestAnimationFrame(() => {
    banner.style.opacity = '1';
  });
  
  setTimeout(() => {
    banner.style.opacity = '0';
    setTimeout(() => banner.remove(), 300);
  }, duration);
};

/* ==================== INDIVIDUAL ANIMATIONS ==================== */

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
  
  // ✅ Safety check: Ensure rows exist
  if (!state.game || !state.game.rows || !state.game.rows[rowIndex]) {
    debugLog('Invalid row index for animation', { rowIndex });
    callback();
    return;
  }
  
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
    debugLog('Target row element not found', { rowIndex });
    callback();
    return;
  }
  
  const overlay = getOverlay();
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
        callback();
      }, 300);
    }, state.animationSpeed);
  }, 300);
};

const animate6thCardPenalty = (data, callback) => {
  const { card, rowIndex, playerName, penaltyPoints } = data;
  
  debugLog('Animating 6th card penalty', { card, rowIndex, playerName, penaltyPoints });
  
  showExplanationBanner(
    `⚠️ ${escapeHtml(playerName)} place la 6ème carte !`,
    `La carte ${card} force ${escapeHtml(playerName)} à ramasser les 5 cartes de la rangée ${rowIndex + 1}`,
    'bg-orange-600',
    2500
  );
  
  // ✅ Safety check
  if (!state.game || !state.game.rows || !state.game.rows[rowIndex]) {
    debugLog('Invalid row for 6th card penalty', { rowIndex });
    callback();
    return;
  }
  
  const targetRow = document.getElementById(`row-${rowIndex}`);
  if (!targetRow) {
    callback();
    return;
  }
  
  const overlay = getOverlay();
  const color = getCardColor(card);
  
  // 1. Faire apparaître la 6ème carte à sa position finale
  const rowRect = targetRow.getBoundingClientRect();
  const sixthCard = document.createElement('div');
  sixthCard.className = `${color} text-white rounded-lg shadow-2xl flex flex-col items-center justify-center font-bold`;
  sixthCard.style.cssText = `
    position: fixed;
    left: ${window.innerWidth / 2 - 24}px;
    top: ${window.innerHeight / 2 - 32}px;
    width: 48px;
    height: 64px;
    z-index: 10000;
    opacity: 0;
    transform: scale(1.5);
    transition: all 600ms ease-out;
  `;
  sixthCard.innerHTML = `<span class="text-2xl">${card}</span>`;
  overlay.appendChild(sixthCard);
  
  // 2. Animation d'apparition de la 6ème carte
  setTimeout(() => {
    const cards = targetRow.querySelectorAll('div[class*="w-12"]');
    if (cards.length > 0) {
      const lastCardRect = cards[cards.length - 1].getBoundingClientRect();
      sixthCard.style.left = (lastCardRect.right + 2) + 'px';
      sixthCard.style.top = lastCardRect.top + 'px';
    }
    sixthCard.style.opacity = '1';
    sixthCard.style.transform = 'scale(1)';
  }, 100);
  
  // 3. Pause pour montrer la 6ème carte en place (1 seconde)
  setTimeout(() => {
    // 4. Faire disparaître les 5 premières cartes
    const cards = targetRow.querySelectorAll('div[class*="w-12"]');
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
        clone.style.opacity = '0';
        clone.style.transform = 'scale(0.5) translateY(-30px)';
      }, i * 50);
      
      setTimeout(() => clone.remove(), 800);
    });
    
    // 5. Déplacer la 6ème carte vers la gauche (position de 1ère carte)
    setTimeout(() => {
      sixthCard.style.left = (rowRect.left + 100) + 'px';
    }, 300);
    
    // 6. Afficher le popup de pénalité
    setTimeout(() => {
      const popup = document.createElement('div');
      popup.className = 'fixed top-1/2 left-1/2 bg-red-600 text-white px-8 py-6 rounded-xl shadow-2xl z-[10001] font-bold text-lg';
      popup.style.cssText = `
        transform: translate(-50%, -50%) scale(0);
        opacity: 0;
        transition: all 0.3s ease-out;
      `;
      popup.innerHTML = `
        <div class="text-center">
          <div class="text-3xl mb-2">⚠️ ${escapeHtml(playerName)} ramasse !</div>
          <div class="text-4xl mt-3 font-black">+${penaltyPoints} 🐞</div>
        </div>
      `;
      document.body.appendChild(popup);
      
      requestAnimationFrame(() => {
        popup.style.transform = 'translate(-50%, -50%) scale(1)';
        popup.style.opacity = '1';
      });
      
      setTimeout(() => {
        popup.style.opacity = '0';
        setTimeout(() => {
          popup.remove();
          sixthCard.remove();
          if (typeof render === 'function') render();
          callback();
        }, 300);
      }, 1500);
    }, 800);
  }, 1000);
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
  
  debugLog('Animating player chose row (like 6th card)', { card, rowIndex, playerName, penaltyPoints });
  
  showExplanationBanner(
    `⚠️ ${escapeHtml(playerName)} ramasse la rangée ${rowIndex + 1}`,
    `Carte trop petite (${card}) : ramasse ${penaltyPoints} points de pénalité`,
    'bg-purple-600',
    2500
  );
  
  // ✅ Safety check
  if (!state.game || !state.game.rows || !state.game.rows[rowIndex]) {
    debugLog('Invalid row for player chose row', { rowIndex });
    callback();
    return;
  }
  
  const targetRow = document.getElementById(`row-${rowIndex}`);
  if (!targetRow) {
    callback();
    return;
  }
  
  const overlay = getOverlay();
  const color = getCardColor(card);
  
  // 1. Faire apparaître la carte au centre de l'écran
  const flyingCard = document.createElement('div');
  flyingCard.className = `${color} text-white rounded-lg shadow-2xl flex flex-col items-center justify-center font-bold`;
  flyingCard.style.cssText = `
    position: fixed;
    left: ${window.innerWidth / 2 - 24}px;
    top: ${window.innerHeight / 2 - 32}px;
    width: 48px;
    height: 64px;
    z-index: 10000;
    opacity: 0;
    transform: scale(1.5);
    transition: all 600ms ease-out;
  `;
  flyingCard.innerHTML = `<span class="text-2xl">${card}</span>`;
  overlay.appendChild(flyingCard);
  
  // 2. Animation d'apparition et déplacement vers la fin de la rangée
  setTimeout(() => {
    const cards = targetRow.querySelectorAll('div[class*="w-12"]');
    const rowRect = targetRow.getBoundingClientRect();
    
    // Position après la dernière carte
    const targetX = cards.length > 0 
      ? cards[cards.length - 1].getBoundingClientRect().right + 2
      : rowRect.left + 100;
    const targetY = rowRect.top + rowRect.height / 2 - 32;
    
    flyingCard.style.left = targetX + 'px';
    flyingCard.style.top = targetY + 'px';
    flyingCard.style.opacity = '1';
    flyingCard.style.transform = 'scale(1)';
  }, 100);
  
  // 3. Pause pour montrer la carte en place (1 seconde)
  setTimeout(() => {
    // 4. Faire disparaître les autres cartes de la rangée
    const cards = targetRow.querySelectorAll('div[class*="w-12"]');
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
        clone.style.opacity = '0';
        clone.style.transform = 'scale(0.5) translateY(-30px)';
      }, i * 50);
      
      setTimeout(() => clone.remove(), 800);
    });
    
    // 5. Déplacer la carte volante vers la position de première carte
    setTimeout(() => {
      const rowRect = targetRow.getBoundingClientRect();
      flyingCard.style.left = (rowRect.left + 100) + 'px';
    }, 300);
    
    // 6. Afficher le popup de pénalité
    setTimeout(() => {
      const popup = document.createElement('div');
      popup.className = 'fixed top-1/2 left-1/2 bg-purple-600 text-white px-8 py-6 rounded-xl shadow-2xl z-[10001] font-bold text-lg';
      popup.style.cssText = `
        transform: translate(-50%, -50%) scale(0);
        opacity: 0;
        transition: all 0.3s ease-out;
      `;
      popup.innerHTML = `
        <div class="text-center">
          <div class="text-3xl mb-2">⚠️ ${escapeHtml(playerName)} ramasse !</div>
          <div class="text-4xl mt-3 font-black">+${penaltyPoints} 🐞</div>
        </div>
      `;
      document.body.appendChild(popup);
      
      requestAnimationFrame(() => {
        popup.style.transform = 'translate(-50%, -50%) scale(1)';
        popup.style.opacity = '1';
      });
      
      setTimeout(() => {
        popup.style.opacity = '0';
        setTimeout(() => {
          popup.remove();
          flyingCard.remove();
          if (typeof render === 'function') render();
          callback();
        }, 300);
      }, 1500);
    }, 800);
  }, 1000);
};

const animateNewRound = (data, callback) => {
  const { round } = data;
  
  const popup = document.createElement('div');
  popup.className = 'fixed inset-0 bg-black bg-opacity-80 z-[10003] flex items-center justify-center';
  popup.innerHTML = `
    <div class="bg-gradient-to-br from-orange-500 to-red-500 text-white px-12 py-10 rounded-2xl shadow-2xl text-center bounce-in">
      <div class="text-6xl mb-4">\ud83c\udfaf</div>
      <div class="text-4xl font-black mb-2">Manche ${round}</div>
      <div class="text-xl opacity-90">Nouvelles cartes distribuées !</div>
    </div>
  `;
  document.body.appendChild(popup);
  
  setTimeout(() => {
    popup.style.opacity = '0';
    popup.style.transition = 'opacity 0.5s ease-out';
    setTimeout(() => {
      popup.remove();
      if (typeof render === 'function') render();
      callback();
    }, 500);
  }, 2000);
};
