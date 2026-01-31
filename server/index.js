const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const Matchmaking = require('./game/Matchmaking');
const Tournament = require('./game/Tournament');

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Game state
const matchmaking = new Matchmaking(io);
const tournament = new Tournament(io);

// Connected players
const players = new Map();

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  // Player joins lobby
  socket.on('joinLobby', (data) => {
    const player = {
      id: socket.id,
      name: data.name || `Player_${socket.id.slice(0, 4)}`,
      wallet: data.wallet,
      betAmount: data.betAmount || 0,
      isReady: false,
      isBot: false
    };
    players.set(socket.id, player);
    matchmaking.addPlayer(player);
    
    io.emit('lobbyUpdate', {
      players: Array.from(players.values()),
      waitingCount: matchmaking.getWaitingCount()
    });
  });

  // Player is ready
  socket.on('playerReady', () => {
    const player = players.get(socket.id);
    if (player) {
      player.isReady = true;
      matchmaking.playerReady(socket.id);
    }
  });

  // Game input from player
  socket.on('gameInput', (input) => {
    const player = players.get(socket.id);
    if (player && player.roomId) {
      const room = matchmaking.getRoom(player.roomId);
      if (room) {
        room.handleInput(socket.id, input);
      }
    }
  });

  // Player decision after winning round
  socket.on('roundDecision', (decision) => {
    const player = players.get(socket.id);
    if (player) {
      if (decision === 'cashout') {
        tournament.cashOut(player);
      } else if (decision === 'continue') {
        tournament.continueToNextRound(player);
      }
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    const player = players.get(socket.id);
    if (player) {
      matchmaking.removePlayer(socket.id);
      players.delete(socket.id);
    }
    io.emit('lobbyUpdate', {
      players: Array.from(players.values()),
      waitingCount: matchmaking.getWaitingCount()
    });
  });
});

// API endpoints
app.get('/api/status', (req, res) => {
  res.json({
    playersOnline: players.size,
    activeRooms: matchmaking.getActiveRoomsCount(),
    tournament: tournament.getStatus()
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🎮 Monad Battle Server running on port ${PORT}`);
});
