// Fichier: script.js

// --- Fonctions utilitaires pour le jeu ---

function getBullHeads(cardNumber) {
    if (cardNumber % 11 === 0) { // Doubles (11, 22, 33...)
        return 5;
    } else if (cardNumber % 10 === 0) { // Multiples de 10 (10, 20, 30...)
        return 3;
    } else if (cardNumber % 5 === 0) { // Multiples de 5 (5, 15, 25...)
        return 2;
    } else { // Toutes les autres cartes
        return 1;
    }
}

function createCardElement(cardNumber) {
    const bullHeads = getBullHeads(cardNumber);

    const cardElement = document.createElement('div');
    cardElement.classList.add('card');
    cardElement.classList.add(`card--bulls-${bullHeads}`); // Ajoute la classe de style spécifique

    // Grande icône de tête de bœuf en fond
    const largeBullIcon = document.createElement('div');
    largeBullIcon.classList.add('card-bull-icon');
    cardElement.appendChild(largeBullIcon);

    // Numéro principal de la carte
    const numberElement = document.createElement('span');
    numberElement.classList.add('card-number');
    numberElement.textContent = cardNumber;
    cardElement.appendChild(numberElement);

    // Petites têtes de bœuf pour les points (en haut)
    const pointsTop = document.createElement('div');
    pointsTop.classList.add('card-points-top');
    for (let i = 0; i < bullHeads; i++) {
        const bullPoint = document.createElement('span');
        bullPoint.classList.add('bull-point');
        pointsTop.appendChild(bullPoint);
    }
    cardElement.appendChild(pointsTop);

    // Pour simuler les points du bas, on peut dupliquer ou ajuster selon l'original.
    // L'image 1 (carte 22) a des points en bas. Les autres n'en ont pas ou moins.
    // Pour l'instant, je ne mets les points qu'en haut pour simplifier et correspondre à la majorité.
    // Si tu veux les points en bas pour les cartes à 5 têtes, tu devras ajouter une logique ici.

    return cardElement;
}


// --- Logique du jeu (simplifiée pour l'exemple) ---

const gameBoard = document.getElementById('game-board');
const playerHandDiv = document.getElementById('player-hand');
const playCardButton = document.getElementById('play-card-button');

let playerHand = [];
let selectedHandCard = null;

// Initialisation de quelques cartes pour le plateau de jeu (exemple)
function initializeGameBoard() {
    gameBoard.innerHTML = ''; // Nettoyer le message "Chargement du jeu..."
    // Ajoutons quelques cartes d'exemple sur le plateau
    gameBoard.appendChild(createCardElement(1));
    gameBoard.appendChild(createCardElement(5));
    gameBoard.appendChild(createCardElement(10));
    gameBoard.appendChild(createCardElement(11));
    gameBoard.appendChild(createCardElement(25));
    gameBoard.appendChild(createCardElement(40));
    gameBoard.appendChild(createCardElement(52));
    gameBoard.appendChild(createCardElement(55)); // Exemple de carte double
}

// Distribution de cartes au joueur (exemple)
function dealPlayerHand() {
    playerHand = [22, 34, 45, 60, 77, 81]; // Exemples de cartes
    playerHandDiv.innerHTML = '<h2>Votre main</h2>'; // Nettoyer
    playerHand.forEach(cardNumber => {
        const cardElement = createCardElement(cardNumber);
        cardElement.addEventListener('click', () => selectCard(cardElement, cardNumber));
        playerHandDiv.appendChild(cardElement);
    });
}

// Sélectionner une carte dans la main
function selectCard(cardElement, cardNumber) {
    // Désélectionner la carte précédente si elle existe
    if (selectedHandCard) {
        selectedHandCard.element.classList.remove('selected');
    }
    
    // Sélectionner la nouvelle carte
    cardElement.classList.add('selected');
    selectedHandCard = { element: cardElement, number: cardNumber };
    console.log(`Carte ${cardNumber} sélectionnée.`);
}

// Jouer la carte sélectionnée
playCardButton.addEventListener('click', () => {
    if (selectedHandCard) {
        console.log(`Vous avez joué la carte ${selectedHandCard.number}.`);
        // Ici tu ajouterais la logique réelle du jeu pour placer la carte
        // Pour l'exemple, on l'ajoute juste au plateau et on la retire de la main
        gameBoard.appendChild(createCardElement(selectedHandCard.number));
        selectedHandCard.element.remove();
        
        // Mettre à jour la main du joueur (retirer la carte jouée)
        playerHand = playerHand.filter(num => num !== selectedHandCard.number);
        selectedHandCard = null; // Réinitialiser la sélection
    } else {
        alert('Veuillez sélectionner une carte à jouer.');
    }
});


// --- Lancement du jeu ---
document.addEventListener('DOMContentLoaded', () => {
    initializeGameBoard();
    dealPlayerHand();
});
