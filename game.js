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
    debugLogs: [],
    showDebug: false,
    isMobile: /Mobi|Android/i.test(navigator.userAgent)
};

let gameRef = null;

const debugLog = (msg, data=null) => {
    const time = new Date().toLocaleTimeString();
    state.debugLogs.push({ time, msg, data: data ? JSON.stringify(data) : null });
    if (!state.isMobile) console.log(`[${time}] ${msg}`, data || '');
    if (state.debugLogs.length > 50) state.debugLogs.shift();
};

const generateGameCode = () => Math.random().toString(36).substring(2,8).toUpperCase();
const calculateHeads = (card) => {
    if(card === 55) return 7;
    if(card % 11 === 0) return 5;
    if(card % 10 === 0) return 3;
    if(card % 5 === 0) return 2;
    return 1;
};
const getCardColor = (card) => card<=26?'bg-blue-400':card<=52?'bg-green-400':card<=78?'bg-yellow-400':'bg-red-400';
const shuffleDeck = () => {
    const deck = Array.from({length:104},(_,i)=>i+1);
    for(let i=deck.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [deck[i],deck[j]]=[deck[j],deck[i]];
    }
    return deck;
};

const saveGame = async (data) => {
    if(!database) return;
    data.waitingForRowChoice ??= null;
    data.pendingCard ??= null;
    await database.ref('games/' + state.gameCode).set(data);
    state.game = data;
};

const subscribeToGame = (code) => {
    if(!database) return;
    if(gameRef) gameRef.off();
    gameRef = database.ref('games/' + code);
    gameRef.on('value', snap=>{
        const data = snap.val();
        if(!data) return;
        const oldStatus = state.game?.status || null;
        state.game = data;

        if(data.status==='playing') state.screen='game';
        const allPlayed = data.players.every(p=>p.playedCard!==null);
        if(data.status==='playing' && !data.turnResolved && oldStatus==='playing' && allPlayed) resolveTurn();
        render();
    });
};

const createGame = async () => {
    if(!state.playerName.trim() || !database) { alert('Entrez un pseudo !'); return; }
    const code = generateGameCode();
    const pid = Math.random().toString(36).substring(7);
    state.gameCode=code; state.playerId=pid;
    const gameData={
        code, status:'waiting', hostId:pid, players:[{id:pid,name:state.playerName,score:0,ready:false,hand:[],playedCard:null}],
        rows:[], round:0, chat:[], currentTurn:0, maxRounds:6, turnResolved:false, waitingForRowChoice:null, pendingCard:null
    };
    await saveGame(gameData);
    subscribeToGame(code);
    state.screen='lobby';
    render();
};

const joinGame = async () => {
    if(!state.playerName.trim() || !state.joinCode.trim() || !database) { alert('Entrez pseudo et code !'); return; }
    const snap = await database.ref('games/'+state.joinCode.toUpperCase()).once('value');
    const game = snap.val();
    if(!game){ alert('Partie introuvable !'); return; }
    if(game.status!=='waiting'){ alert('Partie déjà commencée !'); return; }
    const pid = Math.random().toString(36).substring(7);
    game.players.push({id:pid,name:state.playerName,score:0,ready:false,hand:[],playedCard:null});
    state.gameCode=state.joinCode.toUpperCase(); state.playerId=pid;
    await saveGame(game);
    subscribeToGame(state.gameCode);
    state.screen='lobby';
    render();
};

const toggleReady = async () => {
    const p = state.game.players.find(x=>x.id===state.playerId);
    p.ready = !p.ready;
    await saveGame(state.game);
};

const startGame = async () => {
    if(state.game.hostId!==state.playerId || state.game.players.length<2) return;
    if(!state.game.players.every(p=>p.ready)){ alert('Tous doivent être prêts !'); return; }
    const deck = shuffleDeck();
    state.game.rows=[[deck[0]],[deck[1]],[deck[2]],[deck[3]]];
    deck.splice(0,4);
    state.game.players.forEach(p=>p.hand=deck.splice(0,10).sort((a,b)=>a-b),p.playedCard=null);
    state.game.status='playing'; state.game.round=1; state.game.currentTurn=1;
    state.game.turnResolved=false; state.game.waitingForRowChoice=null; state.game.pendingCard=null;
    await saveGame(state.game);
    render();
};

const canPlayCard = () => state.game?.status==='playing' && state.game?.players.find(p=>p.id===state.playerId)?.playedCard===null;

const playCard = async (card) => {
    if(!canPlayCard()) return;
    const p = state.game.players.find(x=>x.id===state.playerId);
    p.playedCard=card;
    p.hand=p.hand.filter(c=>c!==card);
    state.selectedCard=null;
    await saveGame(state.game);
};

const resolveTurn = async () => {
    if(!state.game) return;
    const game = JSON.parse(JSON.stringify(state.game));
    game.turnResolved=true;
    const plays = game.players.map(p=>({pid:p.id,card:p.playedCard})).sort((a,b)=>a.card-b.card);

    for(const play of plays){
        const validRows = game.rows.map((r,i)=>({i,last:r[r.length-1],diff:play.card-r[r.length-1]})).filter(x=>x.diff>0);
        if(!validRows.length){
            game.waitingForRowChoice=play.pid;
            game.pendingCard=play.card;
            game.turnResolved=false;
            await saveGame(game);
            return;
        }
    }
    await resolveAllPlays(game);
};

const resolveAllPlays = async (game) => {
    const plays = game.players.filter(p=>p.playedCard!==null).map(p=>({pid:p.id,card:p.playedCard})).sort((a,b)=>a.card-b.card);
    for(const play of plays){
        const p = game.players.find(x=>x.id===play.pid);
        const validRows = game.rows.map((r,i)=>({i,last:r[r.length-1],diff:play.card-r[r.length-1]})).filter(x=>x.diff>0);
        if(!validRows.length){
            game.waitingForRowChoice=play.pid;
            game.pendingCard=play.card;
            game.turnResolved=false;
            await saveGame(game);
            return;
        }
        const chosenRow = validRows.reduce((min,cur)=>cur.diff<min.diff?cur:min);
        if(game.rows[chosenRow.i].length===5){
            p.score+=game.rows[chosenRow.i].reduce((s,c)=>s+calculateHeads(c),0);
            game.rows[chosenRow.i]=[play.card];
        } else game.rows[chosenRow.i].push(play.card);
        p.playedCard=null;
    }
    game.turnResolved=false; game.waitingForRowChoice=null; game.pendingCard=null;
    game.currentTurn++;
    if(game.currentTurn>10){
        game.round++;
        if(game.round>game.maxRounds) game.status='finished';
        else{
            const deck=shuffleDeck();
            game.rows=[[deck[0]],[deck[1]],[deck[2]],[deck[3]]]; deck.splice(0,4);
            game.players.forEach(p=>p.hand=deck.splice(0,10).sort((a,b)=>a-b));
            game.currentTurn=1;
        }
    }
    await saveGame(game);
};
