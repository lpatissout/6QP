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

const ANIMATION_CONSTANTS = {
  REVEAL_DURATION: 2500,      // Temps pour afficher les cartes révélées
  FADE_DURATION: 500,         // Temps pour faire disparaître l'overlay
  CARD_FLIGHT_DURATION: 800,  // Temps pour que la carte vole vers la rangée
  PENALTY_POPUP_DURATION: 1500, // Temps du popup de pénalité
  BANNER_DURATION: 2000,      // Temps des banners explicatives
  NEW_ROUND_DURATION: 2500,   // Temps du popup de nouvelle manche
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
