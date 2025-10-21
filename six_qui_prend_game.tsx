import React, { useState, useEffect } from 'react';
import { Users, Play, Copy, Check, MessageCircle, Crown, Wifi, WifiOff } from 'lucide-react';

// Génération d'un code de partie unique
const generateGameCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Calcul des têtes de bœuf
const calculateHeads = (card) => {
  if (card === 55) return 7;
  if (card % 11 === 0) return 5;
  if (card % 10 === 0) return 3;
  if (card % 5 === 0) return 2;
  return 1;
};

// Couleur de carte selon valeur
const getCardColor = (card) => {
  if (card <= 26) return 'bg-blue-400';
  if (card <= 52) return 'bg-green-400';
  if (card <= 78) return 'bg-yellow-400';
  return 'bg-red-400';
};

// Mélange du deck
const shuffleDeck = () => {
  const deck = Array.from({ length: 104 }, (_, i) => i + 1);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

// Composant Carte
const Card = ({ number, selected, onSelect, disabled, small }) => {
  const heads = calculateHeads(number);
  const colorClass = getCardColor(number);
  
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`
        ${small ? 'w-12 h-16 text-xs' : 'w-16 h-24 text-sm'}
        ${colorClass} text-white rounded-lg shadow-md
        flex flex-col items-center justify-between p-1
        transition-all duration-200
        ${selected ? 'ring-4 ring-blue-600 scale-105' : ''}
        ${!disabled && !selected ? 'hover:scale-105 hover:shadow-lg cursor-pointer' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        font-bold relative
      `}
    >
      <span className="text-xl">{number}</span>
      <div className="flex gap-0.5 flex-wrap justify-center">
        {Array.from({ length: heads }).map((_, i) => (
          <span key={i} className="text-xs">🐮</span>
        ))}
      </div>
    </button>
  );
};

// Composant principal
export default function SixQuiPrend() {
  const [screen, setScreen] = useState('home'); // home, lobby, game
  const [gameCode, setGameCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [game, setGame] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [copied, setCopied] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Polling pour synchronisation
  useEffect(() => {
    if (screen === 'lobby' || screen === 'game') {
      const interval = setInterval(async () => {
        await syncGame();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [screen, gameCode]);

  // Synchronisation avec le stockage
  const syncGame = async () => {
    if (!gameCode) return;
    
    try {
      const result = await window.storage.get(`game:${gameCode}`, true);
      if (result) {
        const gameData = JSON.parse(result.value);
        setGame(gameData);
        setLastUpdate(Date.now());
      }
    } catch (error) {
      console.log('Jeu non trouvé');
    }
  };

  // Sauvegarder le jeu
  const saveGame = async (gameData) => {
    await window.storage.set(`game:${gameCode}`, JSON.stringify(gameData), true);
    setGame(gameData);
  };

  // Créer une partie
  const createGame = async () => {
    if (!playerName.trim()) return;
    
    const code = generateGameCode();
    const newPlayerId = Math.random().toString(36).substring(7);
    
    const newGame = {
      code,
      status: 'waiting',
      hostId: newPlayerId,
      players: [{
        id: newPlayerId,
        name: playerName,
        score: 0,
        ready: false,
        connected: true,
        hand: [],
        playedCard: null
      }],
      rows: [],
      round: 0,
      chat: [],
      currentTurn: 0,
      maxRounds: 6
    };

    setGameCode(code);
    setPlayerId(newPlayerId);
    await saveGame(newGame);
    setScreen('lobby');
  };

  // Rejoindre une partie
  const joinGame = async () => {
    if (!playerName.trim() || !joinCode.trim()) return;
    
    try {
      const result = await window.storage.get(`game:${joinCode.toUpperCase()}`, true);
      if (!result) {
        alert('Partie introuvable !');
        return;
      }

      const gameData = JSON.parse(result.value);
      
      if (gameData.status !== 'waiting') {
        alert('La partie a déjà commencé !');
        return;
      }

      if (gameData.players.length >= 10) {
        alert('Partie complète !');
        return;
      }

      const newPlayerId = Math.random().toString(36).substring(7);
      gameData.players.push({
        id: newPlayerId,
        name: playerName,
        score: 0,
        ready: false,
        connected: true,
        hand: [],
        playedCard: null
      });

      setGameCode(joinCode.toUpperCase());
      setPlayerId(newPlayerId);
      await saveGame(gameData);
      setScreen('lobby');
    } catch (error) {
      alert('Erreur lors de la connexion');
    }
  };

  // Marquer comme prêt
  const toggleReady = async () => {
    const player = game.players.find(p => p.id === playerId);
    player.ready = !player.ready;
    await saveGame(game);
  };

  // Démarrer la partie
  const startGame = async () => {
    if (game.hostId !== playerId) return;
    if (game.players.length < 2) {
      alert('Il faut au moins 2 joueurs !');
      return;
    }
    if (!game.players.every(p => p.ready)) {
      alert('Tous les joueurs doivent être prêts !');
      return;
    }

    const deck = shuffleDeck();
    
    // Distribution
    const rows = [
      [deck.shift()],
      [deck.shift()],
      [deck.shift()],
      [deck.shift()]
    ];

    game.players.forEach(player => {
      player.hand = deck.splice(0, 10).sort((a, b) => a - b);
      player.playedCard = null;
    });

    game.status = 'playing';
    game.rows = rows;
    game.round = 1;
    game.currentTurn = 1;

    await saveGame(game);
    setScreen('game');
  };

  // Jouer une carte
  const playCard = async (card) => {
    if (!selectedCard) {
      setSelectedCard(card);
      return;
    }

    const player = game.players.find(p => p.id === playerId);
    if (player.playedCard) return;

    player.playedCard = selectedCard;
    player.hand = player.hand.filter(c => c !== selectedCard);
    
    await saveGame(game);
    setSelectedCard(null);

    // Vérifier si tous ont joué
    if (game.players.every(p => p.playedCard !== null)) {
      setTimeout(() => resolveTurn(), 1000);
    }
  };

  // Résoudre un tour
  const resolveTurn = async () => {
    await syncGame();
    const gameData = game;
    
    // Trier les cartes jouées
    const plays = gameData.players
      .map(p => ({ playerId: p.id, card: p.playedCard }))
      .sort((a, b) => a.card - b.card);

    for (const play of plays) {
      const player = gameData.players.find(p => p.id === play.playerId);
      
      // Trouver où placer la carte
      const validRows = gameData.rows
        .map((row, idx) => ({
          idx,
          last: row[row.length - 1],
          diff: play.card - row[row.length - 1]
        }))
        .filter(r => r.diff > 0);

      if (validRows.length === 0) {
        // Carte trop faible - prendre la première rangée
        const penalty = gameData.rows[0];
        player.score += penalty.reduce((sum, c) => sum + calculateHeads(c), 0);
        gameData.rows[0] = [play.card];
      } else {
        // Placer dans la rangée avec plus petite différence
        const target = validRows.reduce((min, curr) => 
          curr.diff < min.diff ? curr : min
        );
        
        if (gameData.rows[target.idx].length === 5) {
          // 6ème carte - ramasser
          const penalty = gameData.rows[target.idx];
          player.score += penalty.reduce((sum, c) => sum + calculateHeads(c), 0);
          gameData.rows[target.idx] = [play.card];
        } else {
          gameData.rows[target.idx].push(play.card);
        }
      }
      
      player.playedCard = null;
    }

    gameData.currentTurn++;

    // Fin de manche ?
    if (gameData.currentTurn > 10) {
      gameData.round++;
      
      if (gameData.round > gameData.maxRounds) {
        gameData.status = 'finished';
      } else {
        // Nouvelle manche
        const deck = shuffleDeck();
        gameData.rows = [
          [deck.shift()],
          [deck.shift()],
          [deck.shift()],
          [deck.shift()]
        ];
        gameData.players.forEach(player => {
          player.hand = deck.splice(0, 10).sort((a, b) => a - b);
        });
        gameData.currentTurn = 1;
      }
    }

    await saveGame(gameData);
  };

  // Envoyer message
  const sendMessage = async () => {
    if (!chatMessage.trim()) return;
    
    const player = game.players.find(p => p.id === playerId);
    game.chat = game.chat || [];
    game.chat.push({
      player: player.name,
      message: chatMessage,
      time: new Date().toLocaleTimeString()
    });
    
    await saveGame(game);
    setChatMessage('');
  };

  // Copier le lien
  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.href}?join=${gameCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Auto-join depuis URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const join = params.get('join');
    if (join) {
      setJoinCode(join);
    }
  }, []);

  // Écran d'accueil
  if (screen === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-100 to-orange-200 p-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-orange-600 mb-2">🐮 6 qui prend !</h1>
              <p className="text-gray-600">Jouez en ligne avec vos amis</p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Votre pseudo"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                maxLength={15}
              />

              <button
                onClick={createGame}
                disabled={!playerName.trim()}
                className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Play size={20} />
                Créer une partie
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">ou</span>
                </div>
              </div>

              <input
                type="text"
                placeholder="Code de la partie"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none uppercase"
                maxLength={6}
              />

              <button
                onClick={joinGame}
                disabled={!playerName.trim() || !joinCode.trim()}
                className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Users size={20} />
                Rejoindre une partie
              </button>
            </div>

            <div className="mt-8 p-4 bg-orange-50 rounded-lg text-sm text-gray-700">
              <p className="font-semibold mb-2">Comment jouer :</p>
              <ul className="space-y-1 text-xs">
                <li>• Créez ou rejoignez une partie</li>
                <li>• Choisissez une carte secrètement</li>
                <li>• Évitez de ramasser des têtes de bœuf !</li>
                <li>• Le joueur avec le moins de têtes gagne</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Écran lobby
  if (screen === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-100 to-orange-200 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-orange-600 mb-2">Salon d'attente</h2>
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <span className="text-xl font-mono bg-gray-100 px-4 py-2 rounded-lg">{gameCode}</span>
                <button
                  onClick={copyLink}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title="Copier le lien"
                >
                  {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                </button>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {game?.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {player.id === game.hostId && (
                      <Crown size={20} className="text-yellow-500" />
                    )}
                    <span className="font-semibold">{player.name}</span>
                    {player.id === playerId && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Vous</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {player.ready ? (
                      <span className="text-green-500 text-sm font-semibold">✓ Prêt</span>
                    ) : (
                      <span className="text-gray-400 text-sm">En attente...</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <button
                onClick={toggleReady}
                className={`w-full py-3 rounded-lg font-semibold transition ${
                  game?.players.find(p => p.id === playerId)?.ready
                    ? 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {game?.players.find(p => p.id === playerId)?.ready ? 'Annuler' : 'Je suis prêt !'}
              </button>

              {game?.hostId === playerId && (
                <button
                  onClick={startGame}
                  disabled={game.players.length < 2 || !game.players.every(p => p.ready)}
                  className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Démarrer la partie
                </button>
              )}
            </div>

            <div className="mt-6 text-center text-sm text-gray-500">
              {game?.players.length}/10 joueurs • Attendez que tout le monde soit prêt
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Écran de jeu
  if (screen === 'game' && game) {
    const currentPlayer = game.players.find(p => p.id === playerId);
    const allPlayed = game.players.every(p => p.playedCard !== null);

    if (game.status === 'finished') {
      const winner = game.players.reduce((min, p) => p.score < min.score ? p : min);
      
      return (
        <div className="min-h-screen bg-gradient-to-br from-amber-100 to-orange-200 p-8 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
            <h2 className="text-4xl font-bold text-orange-600 mb-6">🏆 Partie terminée !</h2>
            
            <div className="mb-6">
              <p className="text-2xl font-bold text-green-600 mb-2">{winner.name} gagne !</p>
              <p className="text-gray-600">avec {winner.score} têtes de bœuf</p>
            </div>

            <div className="space-y-2 mb-6">
              {game.players.sort((a, b) => a.score - b.score).map((player, idx) => (
                <div key={player.id} className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-semibold">#{idx + 1} {player.name}</span>
                  <span className="text-gray-600">{player.score} 🐮</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setScreen('home');
                setGame(null);
                setGameCode('');
              }}
              className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition"
            >
              Nouvelle partie
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-100 to-orange-200 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg p-4 mb-4 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-orange-600">Manche {game.round}/{game.maxRounds}</h3>
              <p className="text-sm text-gray-600">Tour {game.currentTurn}/10</p>
            </div>
            <button
              onClick={() => setShowChat(!showChat)}
              className="p-2 hover:bg-gray-100 rounded-lg transition relative"
            >
              <MessageCircle size={24} />
              {game.chat?.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {game.chat.length}
                </span>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Zone de jeu principale */}
            <div className="lg:col-span-3 space-y-4">
              {/* Rangées */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h4 className="text-lg font-semibold mb-4 text-gray-700">Rangées</h4>
                <div className="space-y-3">
                  {game.rows.map((row, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="text-sm font-semibold text-gray-500 w-8">#{idx + 1}</span>
                      <div className="flex gap-1 flex-wrap">
                        {row.map((card, cardIdx) => (
                          <Card key={cardIdx} number={card} small disabled />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main du joueur */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-700">Votre main</h4>
                  {allPlayed ? (
                    <span className="text-green-600 font-semibold">✓ En attente des autres...</span>
                  ) : currentPlayer?.playedCard ? (
                    <span className="text-blue-600 font-semibold">Carte jouée : {currentPlayer.playedCard}</span>
                  ) : (
                    <span className="text-orange-600 font-semibold">Choisissez une carte !</span>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap justify-center">
                  {currentPlayer?.hand.map((card) => (
                    <Card
                      key={card}
                      number={card}
                      selected={selectedCard === card}
                      onSelect={() => {
                        if (!currentPlayer.playedCard) {
                          if (selectedCard === card) {
                            playCard(card);
                          } else {
                            setSelectedCard(card);
                          }
                        }
                      }}
                      disabled={currentPlayer.playedCard !== null}
                    />
                  ))}
                </div>
                {selectedCard && !currentPlayer?.playedCard && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => playCard(selectedCard)}
                      className="bg-green-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-600 transition"
                    >
                      Jouer la carte {selectedCard}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Panneau des joueurs */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-lg p-4">
                <h4 className="text-lg font-semibold mb-3 text-gray-700">Joueurs</h4>
                <div className="space-y-2">
                  {game.players.sort((a, b) => a.score - b.score).map((player) => (
                    <div
                      key={player.id}
                      className={`p-3 rounded-lg ${
                        player.id === playerId ? 'bg-blue-50 border-2 border-blue-300' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-1">
                          {player.id === game.hostId && <Crown size={14} className="text-yellow-500" />}
                          <span className="font-semibold text-sm">{player.name}</span>
                        </div>
                        {player.playedCard && <span className="text-green-500 text-xs">✓</span>}
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Score: {player.score} 🐮</span>
                        <span>Cartes: {player.hand.length}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat */}
              {showChat && (
                <div className="bg-white rounded-xl shadow-lg p-4">
                  <h4 className="text-lg font-semibold mb-3 text-gray-700">Chat</h4>
                  <div className="h-40 overflow-y-auto mb-3 space-y-2">
                    {game.chat?.map((msg, idx) => (
                      <div key={idx} className="text-xs">
                        <span className="font-semibold text-blue-600">{msg.player}:</span>{' '}
                        <span className="text-gray-700">{msg.message}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Message..."
                      className="flex-1 px-3 py-2 border rounded-lg text-sm"
                      maxLength={100}
                    />
                    <button
                      onClick={sendMessage}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600"
                    >
                      →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}