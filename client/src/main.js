import { LocalGameManager } from './game/LocalGameManager.js';

// 3 Player Local Multiplayer Mode
let localGame = null;

// DOM Elements
const lobbySection = document.getElementById('lobbySection');
const gameSection = document.getElementById('gameSection');
const gameCanvas = document.getElementById('gameCanvas');
const gameOverlay = document.getElementById('gameOverlay');
const overlayContent = document.getElementById('overlayContent');
const startBattleBtn = document.getElementById('startBattle');
const totalPotDisplay = document.getElementById('totalPot');

// Bet inputs
const player1BetInput = document.getElementById('player1Bet');
const player2BetInput = document.getElementById('player2Bet');
const player3BetInput = document.getElementById('player3Bet');

// Update pot display when bet changes
function updatePotDisplay() {
  const bet1 = parseFloat(player1BetInput.value) || 0;
  const bet2 = parseFloat(player2BetInput.value) || 0;
  const bet3 = parseFloat(player3BetInput.value) || 0;
  const total = bet1 + bet2 + bet3;

  // Update individual player displays
  document.getElementById('pot1').textContent = bet1.toFixed(1);
  document.getElementById('pot2').textContent = bet2.toFixed(1);
  document.getElementById('pot3').textContent = bet3.toFixed(1);

  // Update total
  totalPotDisplay.textContent = `${total.toFixed(2)} MONAT`;
}

// Add event listeners to bet inputs
player1BetInput.addEventListener('input', updatePotDisplay);
player2BetInput.addEventListener('input', updatePotDisplay);
player3BetInput.addEventListener('input', updatePotDisplay);

// Calculate initial pot
updatePotDisplay();

// Start game button click
startBattleBtn.addEventListener('click', () => {
  startGame();
});

function startGame() {
  // Get player names and bets
  const player1Name = document.getElementById('player1Name').value.trim() || 'Player 1';
  const player2Name = document.getElementById('player2Name').value.trim() || 'Player 2';
  const player3Name = document.getElementById('player3Name').value.trim() || 'Player 3';

  const player1Bet = parseFloat(player1BetInput.value) || 0;
  const player2Bet = parseFloat(player2BetInput.value) || 0;
  const player3Bet = parseFloat(player3BetInput.value) || 0;

  const totalPot = player1Bet + player2Bet + player3Bet;

  // Hide lobby, show game
  lobbySection.style.display = 'none';
  gameSection.style.display = 'block';

  // Create 3 player game with custom names and bets
  const players = [
    { id: 'player1', name: player1Name, isBot: false, bet: player1Bet },
    { id: 'player2', name: player2Name, isBot: false, bet: player2Bet },
    { id: 'player3', name: player3Name, isBot: false, bet: player3Bet }
  ];

  localGame = new LocalGameManager(gameCanvas, players, totalPot);
  localGame.onStateUpdate = handleGameState;
  localGame.onGameEnd = handleGameEnd;

  // Show countdown
  gameOverlay.style.display = 'flex';
  overlayContent.innerHTML = `
    <h2>⚔️ GET READY! ⚔️</h2>
    <p style="color: #fbbf24; font-size: 1.5rem; margin: 1rem 0;">💰 Pot: ${totalPot.toFixed(2)} MONAT</p>
  `;

  localGame.start();
}

function handleGameState(state) {
  if (state.phase === 'countdown') {
    gameOverlay.style.display = 'flex';
    overlayContent.innerHTML = `
      <h2 style="font-size: 6rem; color: #fbbf24;">${state.countdown}</h2>
    `;
  } else if (state.phase === 'playing') {
    gameOverlay.style.display = 'none';
  }
}

function handleGameEnd(result) {
  gameOverlay.style.display = 'flex';

  if (result.winner) {
    const winnerNum = result.winner.id.replace('player', '');
    const colors = ['#ef4444', '#22c55e', '#3b82f6'];
    const color = colors[parseInt(winnerNum) - 1];

    overlayContent.innerHTML = `
      <h2 style="color: ${color}; font-size: 2.5rem;">🏆 ${result.winner.name} WINS! 🏆</h2>
      <p style="font-size: 2rem; margin: 1rem 0; color: #fbbf24;">
        💰 +${result.winnings.toFixed(2)} MONAT
      </p>
      <p style="font-size: 0.9rem; color: #94a3b8; margin-bottom: 1rem;">
        Yatırdığı: ${result.winner.bet.toFixed(2)} MONAT → Kazandığı: ${result.winnings.toFixed(2)} MONAT
      </p>
      <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 1.5rem;">
        <button class="btn btn-primary" onclick="location.reload()">🔄 Rematch</button>
      </div>
    `;
  } else {
    overlayContent.innerHTML = `
      <h2 style="color: #f59e0b;">⏱️ TIME'S UP!</h2>
      <p style="color: #94a3b8;">Berabere! Herkes parasını geri alır.</p>
      <button class="btn btn-primary" onclick="location.reload()" style="margin-top: 1rem;">🔄 Rematch</button>
    `;
  }
}

console.log('🎮 Monad Battle - 3 Player Arena Ready!');
console.log('💰 Individual betting enabled - winner takes all!');
