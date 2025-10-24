const firebaseConfig = {
    apiKey: "AIzaSyC2YfNviAE_jDD0wT7TmfZBeOaKqjJdJuQ",
    authDomain: "879a6.firebaseapp.com",
    databaseURL: "https://quiprend-879a6-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "quiprend-879a6",
    storageBucket: "quiprend-879a6.firebasestorage.app",
    messagingSenderId: "476103541469",
    appId: "1:476103541469:web:3a0ac76f9bde94b1745134"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

function saveGame(gameCode, data) {
    return db.ref(`games/${gameCode}`).set(data).catch(err => console.error("Firebase save error", err));
}

function getGame(gameCode, callback) {
    db.ref(`games/${gameCode}`).on('value', snapshot => {
        callback(snapshot.val());
    });
}
