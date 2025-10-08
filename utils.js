// Fonctions utilitaires
function generateGameCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function generatePlayerId() {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function getCardPoints(card) {
    if (card === 55) return 7;
    if (card % 11 === 0) return 5;
    if (card % 10 === 0) return 3;
    if (card % 5 === 0) return 2;
    return 1;
}

function createCardHTML(card) {
    return `<div class="card">${card}<div class="card-points">${getCardPoints(card)}</div></div>`;
}

/**
 * Place une carte sur le plateau de jeu selon les règles du 6 qui prend.
 * @param {number} card - La carte à placer.
 * @param {Array<Array<number>>} rows - Le tableau 2D des rangées.
 * @returns {{rows: Array<Array<number>>, penalty: number}} - Les nouvelles rangées et la pénalité.
 */
function placeCard(card, rows) {
    let bestRow = -1;
    let smallestDiff = Infinity;
    
    // 1. Trouver la meilleure rangée (carte la plus proche et inférieure)
    rows.forEach((row, index) => {
        const lastCard = row[row.length - 1];
        if (card > lastCard) {
            const diff = card - lastCard;
            if (diff < smallestDiff) {
                smallestDiff = diff;
                bestRow = index;
            }
        }
    });
    
    let penalty = 0;
    const newRows = rows.map(r => [...r]);
    
    if (bestRow === -1) {
        // 2. CAS 1 : Carte trop petite pour toutes les rangées (prend la rangée la moins pénalisante)
        let minPenalty = Infinity;
        let rowToPick = -1;
        
        newRows.forEach((row, index) => {
            const rowPenalty = row.reduce((sum, c) => sum + getCardPoints(c), 0);
            if (rowPenalty < minPenalty) {
                minPenalty = rowPenalty;
                rowToPick = index;
            }
        });
        
        penalty = newRows[rowToPick].reduce((sum, c) => sum + getCardPoints(c), 0);
        newRows[rowToPick] = [card];
    } else if (newRows[bestRow].length === 5) {
        // 3. CAS 2 : Rangée pleine (5 cartes), prendre la rangée
        penalty = newRows[bestRow].reduce((sum, c) => sum + getCardPoints(c), 0);
        newRows[bestRow] = [card];
    } else {
        // 4. CAS 3 : Ajouter à la rangée
        newRows[bestRow].push(card);
    }
    
    return { rows: newRows, penalty };
}
