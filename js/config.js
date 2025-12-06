// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC2YfNviAE_jDD0wT7TmfZBeOaKqjJdJuQ",
    authDomain: "quiprend-879a6.firebaseapp.com",
    databaseURL: "https://quiprend-879a6-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "quiprend-879a6",
    storageBucket: "quiprend-879a6.firebasestorage.app",
    messagingSenderId: "476103541469",
    appId: "1:476103541469:web:3a0ac76f9bde94b1745134"
};

// Constantes du jeu
const GAME_CONSTANTS = {
    TOTAL_CARDS: 104,
    CARDS_PER_PLAYER: 10,
    ROWS_COUNT: 4,
    MAX_ROWS_LENGTH: 5, // Avant de ramasser
    MAX_ROUNDS: 6,
    MAX_TURNS_PER_ROUND: 10,
    LOSE_SCORE: 66, // Score de défaite
    CARD_55: 55,
    MULTIPLE_11: 11,
    MULTIPLE_10: 10,
    MULTIPLE_5: 5
};

// Points de pénalité (têtes de bœuf)
const HEADS_POINTS = {
    CARD_55: 7,
    MULTIPLE_11: 5,
    MULTIPLE_10: 3,
    MULTIPLE_5: 2,
    DEFAULT: 1
};

// États de la partie
const GAME_STATUS = {
    WAITING: 'waiting',
    PLAYING: 'playing',
    FINISHED: 'finished'
};

