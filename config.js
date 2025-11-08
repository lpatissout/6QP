/* ==================== CONFIGURATION ==================== */

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
    MAX_ROUNDS: 6,
    CARDS_PER_PLAYER: 10,
    INITIAL_ROWS: 4,
    CARDS_PER_ROW_MAX: 5,
    SCORE_LIMIT: 66,
    TOTAL_CARDS: 104
};

// Constantes d'animation
const ANIMATION_CONSTANTS = {
    REVEAL_DURATION: 2000,
    FADE_DURATION: 500,
    CARD_FLIGHT_DURATION: 1200,
    PENALTY_DISPLAY_DURATION: 2000,
    SIXTH_CARD_ANIMATION_DURATION: 3500
};

// Initialisation Firebase
let database = null;

try {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    console.log('✅ Firebase initialized successfully');
} catch (e) {
    console.error('❌ Firebase initialization error:', e);
    alert('Erreur Firebase: ' + e.message);
}
