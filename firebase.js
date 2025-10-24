// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC2YfNviAE_jDD0wT7TmfZBeOaKqjJdJuQ",
  authDomain: "quiprend-879a6.firebaseapp.com",
  databaseURL: "https://quiprend-879a6-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "quiprend-879a6",
  storageBucket: "quiprend-879a6.firebasestorage.app",
  messagingSenderId: "476103541469",
  appId: "1:476103541469:web:3a0ac76f9bde94b1745134"
};

let database = null;

try {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    console.log('✅ Firebase OK');
} catch (e) {
    alert('Erreur Firebase: ' + e.message);
}

// Sauvegarde d’une partie
const saveGame = async (game) => {
    if (!database) return;
    await database.ref('games/' + game.code).set(game);
};

// Récupération d’une partie
const getGame = async (code) => {
    if (!database) return null;
    const snap = await database.ref('games/' + code).once('value');
    return snap.val();
};
