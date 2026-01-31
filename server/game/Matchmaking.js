const GameRoom = require('./GameRoom');
const BotPlayer = require('./BotPlayer');

class Matchmaking {
    constructor(io) {
        this.io = io;
        this.waitingPlayers = [];
        this.rooms = new Map();
        this.playerRooms = new Map();
        this.roomCounter = 0;
        this.PLAYERS_PER_ROOM = 4;
    }

    addPlayer(player) {
        this.waitingPlayers.push(player);
        this.checkForMatch();
    }

    removePlayer(playerId) {
        this.waitingPlayers = this.waitingPlayers.filter(p => p.id !== playerId);

        const roomId = this.playerRooms.get(playerId);
        if (roomId) {
            const room = this.rooms.get(roomId);
            if (room) {
                room.eliminatePlayer(playerId);
            }
            this.playerRooms.delete(playerId);
        }
    }

    playerReady(playerId) {
        const player = this.waitingPlayers.find(p => p.id === playerId);
        if (player) {
            player.isReady = true;
            this.checkForMatch();
        }
    }

    checkForMatch() {
        const readyPlayers = this.waitingPlayers.filter(p => p.isReady);

        if (readyPlayers.length >= this.PLAYERS_PER_ROOM) {
            // Take first 4 ready players
            const matchPlayers = readyPlayers.slice(0, this.PLAYERS_PER_ROOM);
            this.createRoom(matchPlayers);
        } else if (readyPlayers.length > 0 && readyPlayers.length < this.PLAYERS_PER_ROOM) {
            // Check if we should add bots (after waiting period)
            this.scheduleWithBots(readyPlayers);
        }
    }

    scheduleWithBots(players) {
        // Wait 10 seconds then fill with bots if needed
        setTimeout(() => {
            const stillWaiting = players.filter(p =>
                this.waitingPlayers.find(wp => wp.id === p.id && wp.isReady)
            );

            if (stillWaiting.length > 0 && stillWaiting.length < this.PLAYERS_PER_ROOM) {
                const botsNeeded = this.PLAYERS_PER_ROOM - stillWaiting.length;
                const bots = [];

                for (let i = 0; i < botsNeeded; i++) {
                    bots.push(BotPlayer.create(`Bot_${i + 1}`));
                }

                this.createRoom([...stillWaiting, ...bots]);
            }
        }, 10000);
    }

    createRoom(players) {
        const roomId = `room_${++this.roomCounter}`;

        // Remove from waiting list
        players.forEach(p => {
            if (!p.isBot) {
                this.waitingPlayers = this.waitingPlayers.filter(wp => wp.id !== p.id);
            }
        });

        // Create game room
        const room = new GameRoom(this.io, roomId, players);
        this.rooms.set(roomId, room);

        // Track player rooms
        players.forEach(p => {
            if (!p.isBot) {
                this.playerRooms.set(p.id, roomId);
                p.roomId = roomId;

                // Join socket room
                const socket = this.io.sockets.sockets.get(p.id);
                if (socket) {
                    socket.join(roomId);
                }
            }
        });

        // Notify players
        this.io.to(roomId).emit('matchFound', {
            roomId,
            players: players.map(p => ({
                id: p.id,
                name: p.name,
                isBot: p.isBot
            }))
        });

        // Start game after short delay
        setTimeout(() => {
            room.start();

            // Start bot AI for bot players
            players.filter(p => p.isBot).forEach(bot => {
                BotPlayer.startAI(bot, room);
            });
        }, 2000);

        // Handle game end
        room.onGameEnd = (result) => {
            this.handleGameEnd(roomId, result);
        };

        console.log(`🎮 Room ${roomId} created with ${players.length} players (${players.filter(p => p.isBot).length} bots)`);

        return room;
    }

    handleGameEnd(roomId, result) {
        // Clean up room after delay
        setTimeout(() => {
            this.rooms.delete(roomId);
            result.players.forEach(p => {
                if (!p.isBot) {
                    this.playerRooms.delete(p.id);
                }
            });
        }, 5000);
    }

    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    getWaitingCount() {
        return this.waitingPlayers.length;
    }

    getActiveRoomsCount() {
        return this.rooms.size;
    }
}

module.exports = Matchmaking;
