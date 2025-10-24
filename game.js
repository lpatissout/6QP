let state = {
    screen: 'home',
    gameCode: '',
    playerName: '',
    joinCode: '',
    game: null,
    playerId: null,
    selectedCard: null,
    chatMessage: '',
    showChat: false,
    copied: false,
    waitingForRowChoice: false,
    debugLogs: [],
    showDebug: false
};

let gameRef = null;

// UTILS
const debugLog = (msg, data=null) => {
    const timestamp = new Date().toLocaleTimeString();
    state.debugLogs.push({time: timestamp, message: msg, data: data ? JSON.stringify(data) : null});
    if (state.debugLogs.length>50) state.debugLogs.shift();
    console.log(`[${timestamp}] ${msg}`, data||'');
};

const generateGameCode = () => Math.random().toString(36).substring(2,8).toUpperCase();
const calculateHeads = (card) => {
    if(card===55) return 7;
    if(card%11===0) return 5;
    if(card%10===0) return 3;
    if(card%5===0) return 2;
    return 1;
};
const getCardColor = (card) => {
    if(card<=26) return 'bg-blue-400';
    if(card<=52) return 'bg-green-400';
    if(card<=78) return 'bg-yellow-400';
    return 'bg-red-400';
};
const shuffleDeck = () => {
    const deck = Array.from({length:104},(_,i)=>i+1);
    for(let i=deck.length-1;i>0;i--){
        const j = Math.floor(Math.random()*(i+1));
        [deck[i],deck[j]]=[deck[j],deck[i]];
    }
    return deck;
};

// FONCTIONS GAME
const saveGame = async (data) => {
    if (!database) return;
    if(data.pendingCard===undefined) data.pendingCard=null;
    if(data.waitingForRowChoice===undefined) data.waitingForRowChoice=null;
    try {
        await database.ref('games/'+state.gameCode).set(data);
        state.game=data;
    } catch(e) {
        debugLog('❌ Erreur lors de la sauvegarde Firebase', e);
    }
};

const subscribeToGame = (code) => {
    if(!database) return;
    if(gameRef) gameRef.off();
    gameRef=database.ref('games/'+code);
    gameRef.on('value', snap=>{
        const data=snap.val();
        if(!data) return;
        const oldStatus=state.game?state.game.status:null;
        state.game=data;
        if(data.status==='playing') state.screen='game';
        render();
    });
};

const createGame = async () => {
    if(!state.playerName.trim()||!database){alert('Entrez un pseudo!'); return;}
    const code=generateGameCode();
    const pid=Math.random().toString(36).substring(7);
    state.gameCode=code; state.playerId=pid;
    const gameData = {
        code, status:'waiting', hostId:pid, players:[{id:pid,name:state.playerName,score:0,ready:false,hand:[],playedCard:null}],
        rows:[], round:0, chat:[], currentTurn:0, maxRounds:6, turnResolved:false,
        waitingForRowChoice:null, pendingCard:null
    };
    await saveGame(gameData);
    subscribeToGame(code);
    state.screen='lobby'; render();
};

const joinGame = async () => {
    if(!state.playerName.trim()||!state.joinCode.trim()||!database){alert('Entrez pseudo et code!'); return;}
    const snap=await database.ref('games/'+state.joinCode.toUpperCase()).once('value');
    const game=snap.val();
    if(!game){alert('Partie introuvable!'); return;}
    if(game.status!=='waiting'){alert('Partie déjà commencée!'); return;}
    const pid=Math.random().toString(36).substring(7);
    game.players.push({id:pid,name:state.playerName,score:0,ready:false,hand:[],playedCard:null});
    state.gameCode=state.joinCode.toUpperCase(); state.playerId=pid;
    await saveGame(game); subscribeToGame(state.gameCode); state.screen='lobby'; render();
};

const toggleReady = async () => {
    const p=state.game.players.find(x=>x.id===state.playerId);
    p.ready=!p.ready;
    await saveGame(state.game);
};

const startGame = async () => {
    if(state.game.hostId!==state.playerId||state.game.players.length<2) return;
    if(!state.game.players.every(p=>p.ready)){alert('Tous doivent être prêts !'); return;}
    const deck=shuffleDeck();
    state.game.rows=[[deck[0]],[deck[1]],[deck[2]],[deck[3]]];
    deck.splice(0,4);
    state.game.players.forEach(p=>{p.hand=deck.splice(0,10).sort((a,b)=>a-b); p.playedCard=null;});
    state.game.status='playing'; state.game.round=1; state.game.currentTurn=1; 
    state.game.turnResolved=false; state.game.waitingForRowChoice=null; state.game.pendingCard=null;
    await saveGame(state.game);
    state.screen='game'; render();
};

// NOUVELLE FONCTION
const canPlayTurn = () => {
    if(!state.game || state.game.status!=='playing') return false;
    const me = state.game.players.find(x=>x.id===state.playerId);
    if(!me || me.playedCard!==null) return false;
    return true;
};

const playCard = async (card) => {
    if(!canPlayTurn()) return;
    const p = state.game.players.find(x=>x.id===state.playerId);
    p.playedCard=card;
    p.hand=p.hand.filter(c=>c!==card);
    await saveGame(state.game);
    state.selectedCard=null;
    render();
};
