class Tournament {
    constructor(io) {
        this.io = io;
        this.activeTournaments = new Map();
        this.playerProgress = new Map();

        // Multiplier for each round
        this.multipliers = {
            1: 1.5,
            2: 2.0,
            3: 2.5,
            4: 3.0,
            5: 4.0  // Final
        };
    }

    registerPlayer(player) {
        this.playerProgress.set(player.id, {
            playerId: player.id,
            wallet: player.wallet,
            initialBet: player.betAmount,
            currentRound: 1,
            currentWinnings: 0,
            hasWon: false,
            hasCashedOut: false
        });
    }

    handleRoundWin(playerId, round) {
        const progress = this.playerProgress.get(playerId);
        if (!progress) return;

        const multiplier = this.multipliers[round] || 1;
        progress.currentWinnings = progress.initialBet * multiplier;
        progress.currentRound = round;
        progress.hasWon = true;

        // Notify player of win and ask for decision
        this.io.to(playerId).emit('roundWon', {
            round: round,
            currentWinnings: progress.currentWinnings,
            nextRoundMultiplier: this.multipliers[round + 1],
            potentialWinnings: progress.initialBet * (this.multipliers[round + 1] || multiplier),
            canContinue: round < 5 // Can't continue after final
        });

        return progress;
    }

    handleRoundLoss(playerId) {
        const progress = this.playerProgress.get(playerId);
        if (!progress) return;

        // If they had previous winnings but continued, they lose it
        const lostAmount = progress.currentWinnings > 0 ? progress.currentWinnings : progress.initialBet;

        this.io.to(playerId).emit('roundLost', {
            round: progress.currentRound,
            lostAmount: lostAmount,
            message: progress.currentWinnings > 0
                ? 'You lost your previous round winnings by continuing!'
                : 'Better luck next time!'
        });

        // Reset progress
        progress.currentWinnings = 0;
        progress.hasWon = false;

        return { lostAmount, playerId };
    }

    cashOut(player) {
        const progress = this.playerProgress.get(player.id);
        if (!progress || !progress.hasWon || progress.hasCashedOut) {
            return null;
        }

        progress.hasCashedOut = true;

        const payout = {
            playerId: player.id,
            wallet: player.wallet,
            amount: progress.currentWinnings,
            round: progress.currentRound
        };

        this.io.to(player.id).emit('cashedOut', {
            amount: progress.currentWinnings,
            round: progress.currentRound,
            message: `Congratulations! You cashed out ${progress.currentWinnings} MONAT!`
        });

        // Here you would trigger the smart contract payout
        console.log(`💰 Player ${player.id} cashed out ${progress.currentWinnings} at round ${progress.currentRound}`);

        return payout;
    }

    continueToNextRound(player) {
        const progress = this.playerProgress.get(player.id);
        if (!progress || !progress.hasWon || progress.hasCashedOut) {
            return null;
        }

        if (progress.currentRound >= 5) {
            // Already at final, force cash out
            return this.cashOut(player);
        }

        // Reset win status - they're risking their winnings
        progress.hasWon = false;

        this.io.to(player.id).emit('continuingToNextRound', {
            nextRound: progress.currentRound + 1,
            atRisk: progress.currentWinnings,
            potentialWinnings: progress.initialBet * this.multipliers[progress.currentRound + 1]
        });

        console.log(`🎲 Player ${player.id} continuing to round ${progress.currentRound + 1}, risking ${progress.currentWinnings}`);

        return {
            playerId: player.id,
            nextRound: progress.currentRound + 1,
            atRisk: progress.currentWinnings
        };
    }

    getPlayerProgress(playerId) {
        return this.playerProgress.get(playerId);
    }

    getStatus() {
        return {
            activePlayers: this.playerProgress.size,
            totalPot: Array.from(this.playerProgress.values())
                .reduce((sum, p) => sum + p.initialBet, 0)
        };
    }

    getMultiplierForRound(round) {
        return this.multipliers[round] || 1;
    }
}

module.exports = Tournament;
