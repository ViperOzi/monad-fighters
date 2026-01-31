export class Game {
    constructor(canvas, socket) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.socket = socket;
        this.state = null;
        this.myId = socket.id;
        this.animationFrame = null;

        // Colors for players
        this.playerColors = [
            '#8b5cf6', // Purple
            '#06b6d4', // Cyan
            '#f59e0b', // Orange
            '#10b981'  // Green
        ];
    }

    start() {
        this.render();
    }

    updateState(state) {
        this.state = state;
    }

    render() {
        this.animationFrame = requestAnimationFrame(() => this.render());

        if (!this.state) return;

        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear canvas
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, width, height);

        // Draw background (city skyline)
        this.drawBackground(ctx, width, height);

        // Draw platforms
        this.drawPlatforms(ctx);

        // Draw players
        this.drawPlayers(ctx);

        // Draw danger zone indicator
        this.drawDangerZone(ctx, width, height);
    }

    drawBackground(ctx, width, height) {
        // Gradient sky
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#0f0f23');
        gradient.addColorStop(1, '#1a1a3e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Stars
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        for (let i = 0; i < 50; i++) {
            const x = (i * 17) % width;
            const y = (i * 23) % (height * 0.6);
            ctx.beginPath();
            ctx.arc(x, y, Math.random() * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Background buildings
        ctx.fillStyle = '#0d0d1a';
        const buildings = [
            { x: 0, w: 80, h: 200 },
            { x: 100, w: 60, h: 280 },
            { x: 180, w: 100, h: 150 },
            { x: 320, w: 70, h: 220 },
            { x: 420, w: 90, h: 180 },
            { x: 540, w: 80, h: 250 },
            { x: 650, w: 60, h: 190 },
            { x: 730, w: 80, h: 230 }
        ];

        buildings.forEach(b => {
            ctx.fillRect(b.x, height - b.h, b.w, b.h);

            // Windows
            ctx.fillStyle = 'rgba(255, 200, 100, 0.3)';
            for (let row = 0; row < Math.floor(b.h / 30); row++) {
                for (let col = 0; col < Math.floor(b.w / 20); col++) {
                    if (Math.random() > 0.3) {
                        ctx.fillRect(b.x + 5 + col * 20, height - b.h + 10 + row * 30, 10, 15);
                    }
                }
            }
            ctx.fillStyle = '#0d0d1a';
        });
    }

    drawPlatforms(ctx) {
        if (!this.state.platforms) return;

        this.state.platforms.forEach((platform, index) => {
            // Platform shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(platform.x + 3, platform.y + 3, platform.width, platform.height);

            // Platform gradient
            const gradient = ctx.createLinearGradient(
                platform.x, platform.y,
                platform.x, platform.y + platform.height
            );
            gradient.addColorStop(0, '#3d3d5c');
            gradient.addColorStop(1, '#2d2d4a');
            ctx.fillStyle = gradient;
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

            // Platform edge highlight
            ctx.fillStyle = '#5c5c8a';
            ctx.fillRect(platform.x, platform.y, platform.width, 3);

            // Metal grating pattern
            ctx.strokeStyle = 'rgba(100, 100, 150, 0.3)';
            ctx.lineWidth = 1;
            for (let i = 0; i < platform.width; i += 15) {
                ctx.beginPath();
                ctx.moveTo(platform.x + i, platform.y);
                ctx.lineTo(platform.x + i, platform.y + platform.height);
                ctx.stroke();
            }
        });
    }

    drawPlayers(ctx) {
        if (!this.state.players) return;

        this.state.players.forEach((player, index) => {
            if (!player.isAlive) return;

            const color = this.playerColors[index % this.playerColors.length];
            const isMe = player.id === this.myId;

            // Draw stick figure
            this.drawStickFigure(ctx, player.x, player.y, color, player.facing, isMe, player.isBot);

            // Draw name tag
            ctx.fillStyle = isMe ? '#fbbf24' : 'white';
            ctx.font = isMe ? 'bold 12px Inter' : '11px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(player.name, player.x + 10, player.y - 10);

            // Bot indicator
            if (player.isBot) {
                ctx.fillStyle = '#06b6d4';
                ctx.fillText('🤖', player.x + 10, player.y - 25);
            }
        });
    }

    drawStickFigure(ctx, x, y, color, facing, isMe, isBot) {
        const headY = y;
        const bodyY = y + 15;
        const legY = y + 30;

        // Glow effect for current player
        if (isMe) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 15;
        }

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        // Head
        ctx.beginPath();
        ctx.arc(x + 10, headY, 8, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = 'white';
        const eyeOffset = facing === 'right' ? 2 : -2;
        ctx.beginPath();
        ctx.arc(x + 10 + eyeOffset, headY - 2, 2, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.beginPath();
        ctx.moveTo(x + 10, headY + 8);
        ctx.lineTo(x + 10, bodyY + 5);
        ctx.stroke();

        // Arms
        const armDir = facing === 'right' ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(x + 10, y + 12);
        ctx.lineTo(x + 10 + (armDir * 12), y + 18);
        ctx.moveTo(x + 10, y + 12);
        ctx.lineTo(x + 10 - (armDir * 8), y + 20);
        ctx.stroke();

        // Legs
        ctx.beginPath();
        ctx.moveTo(x + 10, bodyY + 5);
        ctx.lineTo(x + 3, legY);
        ctx.moveTo(x + 10, bodyY + 5);
        ctx.lineTo(x + 17, legY);
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;
    }

    drawDangerZone(ctx, width, height) {
        // Red danger zone at bottom
        const gradient = ctx.createLinearGradient(0, height - 100, 0, height);
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0.3)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, height - 100, width, 100);

        // Animated danger stripes
        ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
        const time = Date.now() / 1000;
        for (let i = 0; i < width + 50; i += 50) {
            const offset = (time * 50) % 50;
            ctx.beginPath();
            ctx.moveTo(i - offset, height);
            ctx.lineTo(i - offset + 25, height);
            ctx.lineTo(i - offset + 35, height - 20);
            ctx.lineTo(i - offset + 10, height - 20);
            ctx.closePath();
            ctx.fill();
        }

        // Warning text
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 14px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ DANGER ZONE - FALL AND LOSE! ⚠️', width / 2, height - 5);
    }

    stop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
}
