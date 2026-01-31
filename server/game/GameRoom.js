class GameRoom {
    constructor(io, roomId, players) {
        this.io = io;
        this.roomId = roomId;
        this.players = new Map();
        this.gameState = {
            phase: 'waiting', // waiting, countdown, playing, ended
            countdown: 3,
            timeLeft: 60,
            platforms: this.generatePlatforms(),
            eliminatedPlayers: []
        };

        // Initialize players with positions
        players.forEach((player, index) => {
            const startPositions = [
                { x: 100, y: 400 },
                { x: 300, y: 400 },
                { x: 500, y: 400 },
                { x: 700, y: 400 }
            ];

            this.players.set(player.id, {
                ...player,
                x: startPositions[index].x,
                y: startPositions[index].y,
                vx: 0,
                vy: 0,
                isAlive: true,
                facing: 'right',
                isPushing: false
            });
        });

        this.gameLoop = null;
        this.onGameEnd = null;
    }

    generatePlatforms() {
        // Skyscraper-style platforms with stairs
        return [
            // Ground floor
            { x: 0, y: 500, width: 800, height: 20 },
            // Level 1
            { x: 50, y: 420, width: 200, height: 15 },
            { x: 350, y: 420, width: 200, height: 15 },
            { x: 600, y: 420, width: 180, height: 15 },
            // Level 2
            { x: 150, y: 340, width: 200, height: 15 },
            { x: 450, y: 340, width: 200, height: 15 },
            // Level 3
            { x: 100, y: 260, width: 250, height: 15 },
            { x: 400, y: 260, width: 250, height: 15 },
            // Top level
            { x: 250, y: 180, width: 300, height: 15 },
            // Stairs (small platforms)
            { x: 250, y: 380, width: 50, height: 10 },
            { x: 550, y: 380, width: 50, height: 10 },
            { x: 350, y: 300, width: 50, height: 10 },
            { x: 350, y: 220, width: 50, height: 10 }
        ];
    }

    start() {
        this.gameState.phase = 'countdown';
        this.broadcastState();

        // Countdown
        const countdownInterval = setInterval(() => {
            this.gameState.countdown--;
            this.broadcastState();

            if (this.gameState.countdown <= 0) {
                clearInterval(countdownInterval);
                this.gameState.phase = 'playing';
                this.startGameLoop();
            }
        }, 1000);
    }

    startGameLoop() {
        const TICK_RATE = 1000 / 30; // 30 FPS

        this.gameLoop = setInterval(() => {
            this.update();
            this.broadcastState();

            // Check win condition
            const alivePlayers = Array.from(this.players.values()).filter(p => p.isAlive);
            if (alivePlayers.length <= 1 || this.gameState.timeLeft <= 0) {
                this.endGame(alivePlayers[0]);
            }
        }, TICK_RATE);

        // Game timer
        const timerInterval = setInterval(() => {
            this.gameState.timeLeft--;
            if (this.gameState.timeLeft <= 0 || this.gameState.phase === 'ended') {
                clearInterval(timerInterval);
            }
        }, 1000);
    }

    update() {
        const GRAVITY = 0.5;
        const FRICTION = 0.9;
        const PUSH_FORCE = 15;

        this.players.forEach((player, id) => {
            if (!player.isAlive) return;

            // Apply gravity
            player.vy += GRAVITY;

            // Apply friction
            player.vx *= FRICTION;

            // Update position
            player.x += player.vx;
            player.y += player.vy;

            // Platform collision
            let onPlatform = false;
            for (const platform of this.gameState.platforms) {
                if (this.isOnPlatform(player, platform)) {
                    player.y = platform.y - 30; // Player height
                    player.vy = 0;
                    onPlatform = true;
                }
            }

            // Check if player fell off
            if (player.y > 600) {
                this.eliminatePlayer(id);
            }

            // Boundary check
            if (player.x < 0) player.x = 0;
            if (player.x > 780) player.x = 780;

            // Handle push collision with other players
            if (player.isPushing) {
                this.players.forEach((other, otherId) => {
                    if (otherId !== id && other.isAlive) {
                        const dx = other.x - player.x;
                        const dy = other.y - player.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist < 50) { // Push range
                            const pushDir = player.facing === 'right' ? 1 : -1;
                            other.vx += pushDir * PUSH_FORCE;
                            other.vy -= 5; // Slight upward push
                        }
                    }
                });
                player.isPushing = false;
            }
        });
    }

    isOnPlatform(player, platform) {
        const playerBottom = player.y + 30;
        const wasAbove = player.y + 30 - player.vy <= platform.y;

        return (
            wasAbove &&
            playerBottom >= platform.y &&
            playerBottom <= platform.y + platform.height + 10 &&
            player.x + 20 > platform.x &&
            player.x < platform.x + platform.width &&
            player.vy >= 0
        );
    }

    handleInput(playerId, input) {
        const player = this.players.get(playerId);
        if (!player || !player.isAlive || this.gameState.phase !== 'playing') return;

        const MOVE_SPEED = 5;
        const JUMP_FORCE = -12;

        switch (input.type) {
            case 'left':
                player.vx = -MOVE_SPEED;
                player.facing = 'left';
                break;
            case 'right':
                player.vx = MOVE_SPEED;
                player.facing = 'right';
                break;
            case 'jump':
                if (player.vy === 0) { // Only jump if on ground
                    player.vy = JUMP_FORCE;
                }
                break;
            case 'push':
                player.isPushing = true;
                break;
        }
    }

    eliminatePlayer(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            player.isAlive = false;
            this.gameState.eliminatedPlayers.push({
                id: playerId,
                name: player.name,
                time: Date.now()
            });

            this.io.to(playerId).emit('eliminated', {
                message: 'You fell! Better luck next time.'
            });
        }
    }

    endGame(winner) {
        this.gameState.phase = 'ended';
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
        }

        const result = {
            roomId: this.roomId,
            winner: winner ? { id: winner.id, name: winner.name } : null,
            eliminated: this.gameState.eliminatedPlayers,
            players: Array.from(this.players.values())
        };

        this.io.to(this.roomId).emit('gameEnded', result);

        if (this.onGameEnd) {
            this.onGameEnd(result);
        }
    }

    broadcastState() {
        const state = {
            phase: this.gameState.phase,
            countdown: this.gameState.countdown,
            timeLeft: this.gameState.timeLeft,
            platforms: this.gameState.platforms,
            players: Array.from(this.players.values()).map(p => ({
                id: p.id,
                name: p.name,
                x: p.x,
                y: p.y,
                vx: p.vx,
                vy: p.vy,
                isAlive: p.isAlive,
                facing: p.facing,
                isBot: p.isBot
            }))
        };

        this.io.to(this.roomId).emit('gameState', state);
    }

    addPlayerToRoom(socket) {
        socket.join(this.roomId);
    }
}

module.exports = GameRoom;
