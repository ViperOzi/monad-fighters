// LocalGameManager - 3 Player Local Multiplayer with Power-ups
export class LocalGameManager {
    constructor(canvas, players, betAmount) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.betAmount = betAmount;
        this.currentRound = 1;
        this.currentWinnings = 0;

        // Multipliers for each round
        this.multipliers = [1.5, 2.0, 2.5, 3.0, 4.0];

        // Callbacks
        this.onStateUpdate = null;
        this.onGameEnd = null;
        this.onRoundWon = null;

        // Input state for 3 players
        this.playerControls = {
            player1: { left: false, right: false, up: false, attack: false },
            player2: { left: false, right: false, up: false, attack: false },
            player3: { left: false, right: false, up: false, attack: false }
        };

        // Power-ups falling from sky
        this.powerups = [];
        this.POWERUP_TYPES = {
            HEALTH: { icon: '❤️', color: '#ef4444', effect: 'Restores 15% health' },
            DAMAGE: { icon: '⚔️', color: '#f59e0b', effect: '+5% damage permanently' },
            STAMINA: { icon: '⚡', color: '#22c55e', effect: '+20% speed, +10% attack speed for 10s' }
        };

        // Game state
        this.state = {
            phase: 'waiting',
            countdown: 3,
            timeLeft: 90,
            platforms: this.generatePlatforms(),
            players: []
        };

        // Initialize 3 human players
        const startPositions = [
            { x: 150, y: 400 },
            { x: 400, y: 400 },
            { x: 650, y: 400 }
        ];

        players.forEach((p, i) => {
            this.state.players.push({
                ...p,
                x: startPositions[i].x,
                y: startPositions[i].y,
                vx: 0,
                vy: 0,
                isAlive: true,
                isBot: false,
                facing: i === 0 ? 'right' : (i === 2 ? 'left' : 'right'),
                health: 100,
                maxHealth: 100,
                damageBonus: 0,        // Permanent damage bonus from pickups
                speedBonus: 0,         // Temporary speed bonus
                attackSpeedBonus: 0,   // Temporary attack speed bonus
                staminaEndTime: 0,     // When stamina buff ends
                isOnGround: false,
                isAttacking: false,
                attackCooldown: 0,
                attackFrame: 0,
                hitCooldown: 0,
                controlScheme: i + 1
            });
        });

        // Player colors
        this.playerColors = ['#ef4444', '#22c55e', '#3b82f6'];

        // Sword settings
        this.SWORD_RANGE = 70;
        this.SWORD_DAMAGE = 10;
        this.ATTACK_DURATION = 20;
        this.ATTACK_COOLDOWN = 35;

        this.gameLoop = null;
        this.timerInterval = null;
        this.powerupInterval = null;

        this.setupKeyboardListeners();
    }

    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            if (this.state.phase !== 'playing') return;

            const key = e.key.toLowerCase();

            // Player 1: WASD + E
            if (key === 'a') this.playerControls.player1.left = true;
            if (key === 'd') this.playerControls.player1.right = true;
            if (key === 'w') this.playerControls.player1.up = true;
            if (key === 'e') this.playerControls.player1.attack = true;

            // Player 2: YGHJ + U
            if (key === 'g') this.playerControls.player2.left = true;
            if (key === 'j') this.playerControls.player2.right = true;
            if (key === 'y') this.playerControls.player2.up = true;
            if (key === 'u') this.playerControls.player2.attack = true;

            // Player 3: Arrows + 1
            if (e.key === 'ArrowLeft') this.playerControls.player3.left = true;
            if (e.key === 'ArrowRight') this.playerControls.player3.right = true;
            if (e.key === 'ArrowUp') this.playerControls.player3.up = true;
            if (key === '1') this.playerControls.player3.attack = true;

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();

            if (key === 'a') this.playerControls.player1.left = false;
            if (key === 'd') this.playerControls.player1.right = false;
            if (key === 'w') this.playerControls.player1.up = false;
            if (key === 'e') this.playerControls.player1.attack = false;

            if (key === 'g') this.playerControls.player2.left = false;
            if (key === 'j') this.playerControls.player2.right = false;
            if (key === 'y') this.playerControls.player2.up = false;
            if (key === 'u') this.playerControls.player2.attack = false;

            if (e.key === 'ArrowLeft') this.playerControls.player3.left = false;
            if (e.key === 'ArrowRight') this.playerControls.player3.right = false;
            if (e.key === 'ArrowUp') this.playerControls.player3.up = false;
            if (key === '1') this.playerControls.player3.attack = false;
        });
    }

    generatePlatforms() {
        return [
            { x: 50, y: 500, width: 700, height: 20 },
            { x: 80, y: 420, width: 150, height: 15 },
            { x: 320, y: 420, width: 160, height: 15 },
            { x: 570, y: 420, width: 150, height: 15 },
            { x: 150, y: 340, width: 180, height: 15 },
            { x: 450, y: 340, width: 180, height: 15 },
            { x: 100, y: 260, width: 200, height: 15 },
            { x: 500, y: 260, width: 200, height: 15 },
            { x: 280, y: 180, width: 240, height: 15 }
        ];
    }

    spawnPowerup() {
        const types = ['HEALTH', 'DAMAGE', 'STAMINA'];
        const type = types[Math.floor(Math.random() * types.length)];
        const x = 100 + Math.random() * 600;

        this.powerups.push({
            type: type,
            x: x,
            y: -30,
            vy: 2,
            size: 30,
            active: true
        });
    }

    start() {
        this.state.phase = 'countdown';
        this.broadcastState();

        const countdownInterval = setInterval(() => {
            this.state.countdown--;
            this.broadcastState();

            if (this.state.countdown <= 0) {
                clearInterval(countdownInterval);
                this.state.phase = 'playing';
                this.startGameLoop();
            }
        }, 1000);
    }

    startGameLoop() {
        const TICK_RATE = 1000 / 60;

        this.gameLoop = setInterval(() => {
            this.processAllInputs();
            this.update();
            this.updatePowerups();
            this.render();
            this.broadcastState();

            const alivePlayers = this.state.players.filter(p => p.isAlive);
            if (alivePlayers.length <= 1 || this.state.timeLeft <= 0) {
                this.endGame(alivePlayers[0]);
            }
        }, TICK_RATE);

        this.timerInterval = setInterval(() => {
            this.state.timeLeft--;
        }, 1000);

        // Spawn power-ups every 5-8 seconds
        this.powerupInterval = setInterval(() => {
            if (this.state.phase === 'playing') {
                this.spawnPowerup();
            }
        }, 5000 + Math.random() * 3000);

        // Spawn initial power-up
        setTimeout(() => this.spawnPowerup(), 2000);
    }

    processAllInputs() {
        const BASE_MOVE_SPEED = 5;
        const JUMP_FORCE = -14;
        const now = Date.now();

        this.state.players.forEach((player, index) => {
            if (!player.isAlive) return;

            // Check if stamina buff is active
            if (player.staminaEndTime > now) {
                player.speedBonus = 0.2;        // +20% speed
                player.attackSpeedBonus = 0.1;  // +10% attack speed
            } else {
                player.speedBonus = 0;
                player.attackSpeedBonus = 0;
            }

            const moveSpeed = BASE_MOVE_SPEED * (1 + player.speedBonus);
            const controls = this.playerControls[`player${index + 1}`];

            if (controls.left) {
                player.vx = -moveSpeed;
                player.facing = 'left';
            } else if (controls.right) {
                player.vx = moveSpeed;
                player.facing = 'right';
            } else {
                player.vx *= 0.7;
            }

            if (controls.up && player.isOnGround) {
                player.vy = JUMP_FORCE;
                player.isOnGround = false;
            }

            const attackCooldownReduction = 1 + player.attackSpeedBonus;
            if (controls.attack && player.attackCooldown <= 0) {
                player.isAttacking = true;
                player.attackFrame = this.ATTACK_DURATION;
                player.attackCooldown = Math.floor(this.ATTACK_COOLDOWN / attackCooldownReduction);
            }
        });
    }

    update() {
        const GRAVITY = 0.6;

        this.state.players.forEach((player, idx) => {
            if (!player.isAlive) return;

            if (player.attackCooldown > 0) player.attackCooldown--;
            if (player.hitCooldown > 0) player.hitCooldown--;
            if (player.attackFrame > 0) player.attackFrame--;
            if (player.attackFrame <= 0) player.isAttacking = false;

            player.vy += GRAVITY;
            player.x += player.vx;
            player.y += player.vy;

            player.isOnGround = false;

            for (const platform of this.state.platforms) {
                if (this.isOnPlatform(player, platform)) {
                    player.y = platform.y - 30;
                    player.vy = 0;
                    player.isOnGround = true;
                }
            }

            if (player.y > 580) {
                player.isAlive = false;
                player.health = 0;
            }

            if (player.x < 0) player.x = 0;
            if (player.x > 780) player.x = 780;

            if (player.isAttacking && player.attackFrame === this.ATTACK_DURATION - 5) {
                this.checkSwordHit(player, idx);
            }
        });
    }

    updatePowerups() {
        this.powerups.forEach(powerup => {
            if (!powerup.active) return;

            // Fall down
            powerup.y += powerup.vy;

            // Check platform collision
            for (const platform of this.state.platforms) {
                if (powerup.y + powerup.size > platform.y &&
                    powerup.y < platform.y + platform.height &&
                    powerup.x > platform.x &&
                    powerup.x < platform.x + platform.width) {
                    powerup.y = platform.y - powerup.size;
                    powerup.vy = 0;
                }
            }

            // Check player collision
            this.state.players.forEach(player => {
                if (!player.isAlive) return;

                const dx = Math.abs(player.x + 10 - powerup.x);
                const dy = Math.abs(player.y + 15 - powerup.y);

                if (dx < 30 && dy < 30 && powerup.active) {
                    this.applyPowerup(player, powerup.type);
                    powerup.active = false;
                }
            });

            // Remove if fell off screen
            if (powerup.y > 600) {
                powerup.active = false;
            }
        });

        // Clean up inactive power-ups
        this.powerups = this.powerups.filter(p => p.active);
    }

    applyPowerup(player, type) {
        switch (type) {
            case 'HEALTH':
                player.health = Math.min(player.maxHealth, player.health + 15);
                break;
            case 'DAMAGE':
                player.damageBonus += 5; // +5% permanent damage
                break;
            case 'STAMINA':
                player.staminaEndTime = Date.now() + 10000; // 10 seconds
                break;
        }
    }

    checkSwordHit(attacker, attackerIdx) {
        this.state.players.forEach((target, targetIdx) => {
            if (attackerIdx === targetIdx || !target.isAlive) return;
            if (target.hitCooldown > 0) return;

            const dx = target.x - attacker.x;
            const dy = target.y - attacker.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const inRange = dist < this.SWORD_RANGE;
            const correctDirection = (attacker.facing === 'right' && dx > 0) ||
                (attacker.facing === 'left' && dx < 0);

            if (inRange && correctDirection && Math.abs(dy) < 40) {
                // Calculate damage with bonus
                const baseDamage = this.SWORD_DAMAGE;
                const bonusDamage = baseDamage * (attacker.damageBonus / 100);
                const totalDamage = Math.floor(baseDamage + bonusDamage);

                target.health -= totalDamage;
                target.hitCooldown = 30;

                const knockbackDir = attacker.facing === 'right' ? 1 : -1;
                target.vx += knockbackDir * 12;
                target.vy -= 6;

                if (target.health <= 0) {
                    target.health = 0;
                    target.isAlive = false;
                }
            }
        });
    }

    isOnPlatform(player, platform) {
        const playerBottom = player.y + 30;
        const wasAbove = player.y + 30 - player.vy <= platform.y + 5;

        return (
            wasAbove &&
            playerBottom >= platform.y &&
            playerBottom <= platform.y + platform.height + 12 &&
            player.x + 20 > platform.x &&
            player.x < platform.x + platform.width &&
            player.vy >= 0
        );
    }

    endGame(winner) {
        this.state.phase = 'ended';

        clearInterval(this.gameLoop);
        clearInterval(this.timerInterval);
        clearInterval(this.powerupInterval);

        if (this.onGameEnd) {
            this.onGameEnd({
                winner: winner,
                winnings: winner ? this.betAmount : 0, // betAmount is total pot
                nextMultiplier: 0
            });
        }
    }

    continueToNextRound() {
        this.state.phase = 'countdown';
        this.state.countdown = 3;
        this.state.timeLeft = 90;
        this.powerups = [];

        const startPositions = [
            { x: 150, y: 400 },
            { x: 400, y: 400 },
            { x: 650, y: 400 }
        ];

        this.state.players.forEach((p, i) => {
            p.x = startPositions[i].x;
            p.y = startPositions[i].y;
            p.vx = 0;
            p.vy = 0;
            p.isAlive = true;
            p.health = 100;
            p.damageBonus = 0;
            p.speedBonus = 0;
            p.attackSpeedBonus = 0;
            p.staminaEndTime = 0;
            p.isAttacking = false;
            p.attackCooldown = 0;
            p.hitCooldown = 0;
        });

        this.start();
    }

    broadcastState() {
        if (this.onStateUpdate) {
            this.onStateUpdate(this.state);
        }
    }

    render() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, width, height);

        this.drawBackground(ctx, width, height);
        this.drawPlatforms(ctx);
        this.drawPowerups(ctx);
        this.drawPlayers(ctx);
        this.drawHealthBars(ctx, width);
        this.drawControlsHint(ctx, width, height);
        this.drawTimer(ctx, width);
        this.drawTitle(ctx, width);
    }

    drawBackground(ctx, width, height) {
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#1a0a2e');
        gradient.addColorStop(0.5, '#2d1b4e');
        gradient.addColorStop(1, '#1a1a3e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        for (let i = 0; i < 60; i++) {
            const x = (i * 13 + 7) % width;
            const y = (i * 19 + 11) % (height * 0.6);
            ctx.beginPath();
            ctx.arc(x, y, Math.random() * 1.5 + 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
        ctx.beginPath();
        ctx.arc(width / 2, height + 200, 500, Math.PI, 0);
        ctx.fill();
    }

    drawPlatforms(ctx) {
        this.state.platforms.forEach(platform => {
            ctx.shadowColor = '#8b5cf6';
            ctx.shadowBlur = 10;

            const gradient = ctx.createLinearGradient(
                platform.x, platform.y,
                platform.x, platform.y + platform.height
            );
            gradient.addColorStop(0, '#6366f1');
            gradient.addColorStop(1, '#4338ca');
            ctx.fillStyle = gradient;
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

            ctx.shadowBlur = 0;
            ctx.fillStyle = '#818cf8';
            ctx.fillRect(platform.x, platform.y, platform.width, 3);
        });
    }

    drawPowerups(ctx) {
        this.powerups.forEach(powerup => {
            if (!powerup.active) return;

            const typeInfo = this.POWERUP_TYPES[powerup.type];

            // Glow
            ctx.shadowColor = typeInfo.color;
            ctx.shadowBlur = 20;

            // Background circle
            ctx.fillStyle = typeInfo.color;
            ctx.beginPath();
            ctx.arc(powerup.x, powerup.y, powerup.size / 2, 0, Math.PI * 2);
            ctx.fill();

            // Icon
            ctx.shadowBlur = 0;
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(typeInfo.icon, powerup.x, powerup.y + 7);
        });
        ctx.shadowBlur = 0;
    }

    drawPlayers(ctx) {
        const now = Date.now();

        this.state.players.forEach((player, index) => {
            if (!player.isAlive) return;

            const color = this.playerColors[index];
            const hasStaminaBuff = player.staminaEndTime > now;

            if (player.hitCooldown > 0 && player.hitCooldown % 6 < 3) {
                return;
            }

            // Extra glow for stamina buff
            if (hasStaminaBuff) {
                ctx.shadowColor = '#22c55e';
                ctx.shadowBlur = 35;
            } else {
                ctx.shadowColor = color;
                ctx.shadowBlur = 25;
            }

            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';

            const x = player.x;
            const y = player.y;

            // Head
            ctx.beginPath();
            ctx.arc(x + 10, y, 12, 0, Math.PI * 2);
            ctx.fill();

            // Eyes
            ctx.fillStyle = 'white';
            const eyeOffset = player.facing === 'right' ? 4 : -4;
            ctx.beginPath();
            ctx.arc(x + 10 + eyeOffset, y - 2, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = color;

            // Body
            ctx.beginPath();
            ctx.moveTo(x + 10, y + 12);
            ctx.lineTo(x + 10, y + 26);
            ctx.stroke();

            // Arms and Sword
            const armDir = player.facing === 'right' ? 1 : -1;

            if (player.isAttacking) {
                const swingProgress = 1 - (player.attackFrame / this.ATTACK_DURATION);

                ctx.beginPath();
                ctx.moveTo(x + 10, y + 15);
                const swordX = x + 10 + (armDir * 22);
                const swordY = y + 5 + swingProgress * 22;
                ctx.lineTo(swordX, swordY);
                ctx.stroke();

                // Sword with damage bonus glow
                const swordColor = player.damageBonus > 0 ? '#ff6b6b' : '#fbbf24';
                ctx.strokeStyle = swordColor;
                ctx.lineWidth = 5;
                ctx.shadowColor = swordColor;
                ctx.shadowBlur = 15 + player.damageBonus;
                ctx.beginPath();
                ctx.moveTo(swordX, swordY);
                ctx.lineTo(swordX + (armDir * 35), swordY + swingProgress * 18 - 12);
                ctx.stroke();

                ctx.strokeStyle = color;
                ctx.lineWidth = 4;
                ctx.shadowColor = color;

                ctx.beginPath();
                ctx.moveTo(x + 10, y + 15);
                ctx.lineTo(x + 10 - (armDir * 10), y + 22);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.moveTo(x + 10, y + 15);
                ctx.lineTo(x + 10 + (armDir * 14), y + 22);
                ctx.stroke();

                ctx.strokeStyle = '#9ca3af';
                ctx.lineWidth = 3;
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.moveTo(x + 10 + (armDir * 14), y + 22);
                ctx.lineTo(x + 10 + (armDir * 14), y + 45);
                ctx.stroke();

                ctx.strokeStyle = color;
                ctx.shadowBlur = 25;
                ctx.shadowColor = color;
                ctx.lineWidth = 4;

                ctx.beginPath();
                ctx.moveTo(x + 10, y + 15);
                ctx.lineTo(x + 10 - (armDir * 12), y + 22);
                ctx.stroke();
            }

            // Legs
            ctx.beginPath();
            ctx.moveTo(x + 10, y + 26);
            ctx.lineTo(x, y + 38);
            ctx.moveTo(x + 10, y + 26);
            ctx.lineTo(x + 20, y + 38);
            ctx.stroke();

            // Player number badge
            ctx.shadowBlur = 0;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x + 10, y - 30, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(index + 1, x + 10, y - 25);

            // Buff indicators
            if (hasStaminaBuff) {
                ctx.fillStyle = '#22c55e';
                ctx.font = '12px Arial';
                ctx.fillText('⚡', x + 25, y - 25);
            }
            if (player.damageBonus > 0) {
                ctx.fillStyle = '#f59e0b';
                ctx.font = '10px Inter';
                ctx.fillText(`+${player.damageBonus}%`, x + 10, y - 42);
            }
        });

        ctx.shadowBlur = 0;
    }

    drawHealthBars(ctx, width) {
        const barWidth = 200;
        const barHeight = 20;
        const now = Date.now();

        const positions = [
            { x: 20, y: 50 },
            { x: width / 2 - barWidth / 2, y: 50 },
            { x: width - barWidth - 20, y: 50 }
        ];

        const controlLabels = ['WASD + E', 'YGHJ + U', '← → + 1'];

        this.state.players.forEach((player, index) => {
            const pos = positions[index];
            const color = this.playerColors[index];
            const hasStaminaBuff = player.staminaEndTime > now;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(pos.x, pos.y, barWidth, barHeight);

            const healthWidth = (player.health / player.maxHealth) * barWidth;
            const healthColor = player.health > 50 ? color :
                player.health > 25 ? '#f59e0b' : '#ef4444';

            ctx.fillStyle = healthColor;
            ctx.fillRect(pos.x, pos.y, healthWidth, barHeight);

            // Stamina buff indicator
            if (hasStaminaBuff) {
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 3;
            } else {
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
            }
            ctx.strokeRect(pos.x, pos.y, barWidth, barHeight);

            ctx.fillStyle = player.isAlive ? 'white' : '#666';
            ctx.font = 'bold 11px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(`${player.name}`, pos.x + barWidth / 2, pos.y - 8);

            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '9px Inter';
            ctx.fillText(controlLabels[index], pos.x + barWidth / 2, pos.y - 20);

            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px Inter';
            ctx.fillText(`${player.health}%`, pos.x + barWidth / 2, pos.y + 15);

            if (!player.isAlive) {
                ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
                ctx.fillRect(pos.x, pos.y, barWidth, barHeight);
                ctx.fillStyle = 'white';
                ctx.font = 'bold 12px Inter';
                ctx.fillText('ELIMINATED', pos.x + barWidth / 2, pos.y + 15);
            }
        });
    }

    drawControlsHint(ctx, width, height) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, height - 30, width, 30);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('❤️ +15% HP  |  ⚔️ +5% DMG (permanent)  |  ⚡ +20% SPD +10% ATK SPD (10s)', width / 2, height - 10);
    }

    drawTimer(ctx, width) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(width / 2 - 40, 5, 80, 35);

        ctx.fillStyle = this.state.timeLeft <= 10 ? '#ef4444' : '#fbbf24';
        ctx.font = 'bold 24px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.state.timeLeft}`, width / 2, 32);
    }

    drawTitle(ctx, width) {
        ctx.fillStyle = '#8b5cf6';
        ctx.font = 'bold 14px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText('⚔️ MONAD BATTLE ⚔️', width / 2, 95);
    }
}
