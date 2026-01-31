class BotPlayer {
    static botCounter = 0;

    static create(name) {
        return {
            id: `bot_${++this.botCounter}_${Date.now()}`,
            name: name || `Bot_${this.botCounter}`,
            wallet: null,
            betAmount: 0,
            isReady: true,
            isBot: true
        };
    }

    static startAI(bot, room) {
        const AI_TICK = 200; // Bot decision every 200ms

        const aiLoop = setInterval(() => {
            if (room.gameState.phase !== 'playing') {
                if (room.gameState.phase === 'ended') {
                    clearInterval(aiLoop);
                }
                return;
            }

            const botState = room.players.get(bot.id);
            if (!botState || !botState.isAlive) {
                clearInterval(aiLoop);
                return;
            }

            const decision = this.makeDecision(botState, room);
            if (decision) {
                room.handleInput(bot.id, decision);
            }
        }, AI_TICK);
    }

    static makeDecision(bot, room) {
        const players = Array.from(room.players.values()).filter(
            p => p.id !== bot.id && p.isAlive
        );

        if (players.length === 0) return null;

        // Find nearest player
        let nearest = null;
        let minDist = Infinity;

        players.forEach(p => {
            const dist = Math.sqrt(
                Math.pow(p.x - bot.x, 2) + Math.pow(p.y - bot.y, 2)
            );
            if (dist < minDist) {
                minDist = dist;
                nearest = p;
            }
        });

        if (!nearest) return null;

        const random = Math.random();

        // If near edge, move away from edge
        if (bot.x < 50) {
            return { type: 'right' };
        }
        if (bot.x > 750) {
            return { type: 'left' };
        }

        // If close to enemy, try to push
        if (minDist < 60) {
            if (random < 0.7) {
                return { type: 'push' };
            }
        }

        // Chase nearest player
        if (nearest.x < bot.x - 30) {
            if (random < 0.3 && nearest.y < bot.y - 50) {
                return { type: 'jump' };
            }
            return { type: 'left' };
        } else if (nearest.x > bot.x + 30) {
            if (random < 0.3 && nearest.y < bot.y - 50) {
                return { type: 'jump' };
            }
            return { type: 'right' };
        }

        // If enemy is above, jump
        if (nearest.y < bot.y - 40 && random < 0.5) {
            return { type: 'jump' };
        }

        // Random movement
        if (random < 0.2) {
            return { type: 'jump' };
        } else if (random < 0.5) {
            return { type: 'left' };
        } else if (random < 0.8) {
            return { type: 'right' };
        }

        return null;
    }
}

module.exports = BotPlayer;
