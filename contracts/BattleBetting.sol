// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title BattleBetting
 * @dev Betting contract for Monad Battle game
 */
contract BattleBetting {
    address public owner;
    address public gameServer;
    
    uint256 public constant MIN_BET = 0.01 ether;
    uint256 public constant HOUSE_FEE_PERCENT = 5; // 5% house fee
    
    // Round multipliers (in basis points, 10000 = 1x)
    uint256[] public multipliers = [15000, 20000, 25000, 30000, 40000]; // 1.5x, 2x, 2.5x, 3x, 4x
    
    struct Player {
        address wallet;
        uint256 initialBet;
        uint256 currentWinnings;
        uint8 currentRound;
        bool isActive;
        bool hasCashedOut;
    }
    
    struct Tournament {
        uint256 id;
        uint256 totalPot;
        uint256 startTime;
        bool isActive;
        address[] players;
    }
    
    mapping(address => Player) public players;
    mapping(uint256 => Tournament) public tournaments;
    uint256 public currentTournamentId;
    
    event PlayerJoined(address indexed player, uint256 amount, uint256 tournamentId);
    event RoundWon(address indexed player, uint8 round, uint256 winnings);
    event PlayerEliminated(address indexed player, uint256 lostAmount);
    event PlayerCashedOut(address indexed player, uint256 amount);
    event TournamentStarted(uint256 indexed tournamentId);
    event TournamentEnded(uint256 indexed tournamentId, address winner);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyGameServer() {
        require(msg.sender == gameServer, "Not game server");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        gameServer = msg.sender; // Initially set to owner, can be updated
    }
    
    /**
     * @dev Set the game server address (can report game results)
     */
    function setGameServer(address _gameServer) external onlyOwner {
        gameServer = _gameServer;
    }
    
    /**
     * @dev Enter a tournament by placing a bet
     */
    function enterTournament() external payable {
        require(msg.value >= MIN_BET, "Bet too small");
        require(!players[msg.sender].isActive, "Already in tournament");
        
        players[msg.sender] = Player({
            wallet: msg.sender,
            initialBet: msg.value,
            currentWinnings: 0,
            currentRound: 0,
            isActive: true,
            hasCashedOut: false
        });
        
        // Add to current tournament
        tournaments[currentTournamentId].players.push(msg.sender);
        tournaments[currentTournamentId].totalPot += msg.value;
        
        emit PlayerJoined(msg.sender, msg.value, currentTournamentId);
    }
    
    /**
     * @dev Report a round winner (called by game server)
     */
    function reportRoundWinner(address winner, uint8 round) external onlyGameServer {
        require(players[winner].isActive, "Player not active");
        require(round > 0 && round <= 5, "Invalid round");
        
        Player storage player = players[winner];
        uint256 multiplier = multipliers[round - 1];
        player.currentWinnings = (player.initialBet * multiplier) / 10000;
        player.currentRound = round;
        
        emit RoundWon(winner, round, player.currentWinnings);
    }
    
    /**
     * @dev Report a player elimination (called by game server)
     */
    function reportElimination(address eliminated) external onlyGameServer {
        require(players[eliminated].isActive, "Player not active");
        
        Player storage player = players[eliminated];
        uint256 lostAmount = player.currentWinnings > 0 ? player.currentWinnings : player.initialBet;
        
        player.isActive = false;
        player.currentWinnings = 0;
        
        emit PlayerEliminated(eliminated, lostAmount);
    }
    
    /**
     * @dev Player cashes out their winnings
     */
    function cashOut() external {
        Player storage player = players[msg.sender];
        require(player.isActive, "Not in tournament");
        require(player.currentWinnings > 0, "No winnings to cash out");
        require(!player.hasCashedOut, "Already cashed out");
        
        uint256 payout = player.currentWinnings;
        uint256 houseFee = (payout * HOUSE_FEE_PERCENT) / 100;
        uint256 playerPayout = payout - houseFee;
        
        player.hasCashedOut = true;
        player.isActive = false;
        
        // Transfer winnings to player
        (bool success, ) = payable(msg.sender).call{value: playerPayout}("");
        require(success, "Transfer failed");
        
        emit PlayerCashedOut(msg.sender, playerPayout);
    }
    
    /**
     * @dev Player decides to continue to next round (risking current winnings)
     */
    function continueToNextRound() external {
        Player storage player = players[msg.sender];
        require(player.isActive, "Not in tournament");
        require(player.currentWinnings > 0, "No winnings to risk");
        require(player.currentRound < 5, "Already at final round");
        
        // Player is risking their current winnings
        // The next round result will be reported by the game server
    }
    
    /**
     * @dev Start a new tournament
     */
    function startNewTournament() external onlyOwner {
        currentTournamentId++;
        tournaments[currentTournamentId] = Tournament({
            id: currentTournamentId,
            totalPot: 0,
            startTime: block.timestamp,
            isActive: true,
            players: new address[](0)
        });
        
        emit TournamentStarted(currentTournamentId);
    }
    
    /**
     * @dev Get player info
     */
    function getPlayerInfo(address playerAddr) external view returns (
        uint256 initialBet,
        uint256 currentWinnings,
        uint8 currentRound,
        bool isActive,
        bool hasCashedOut
    ) {
        Player memory player = players[playerAddr];
        return (
            player.initialBet,
            player.currentWinnings,
            player.currentRound,
            player.isActive,
            player.hasCashedOut
        );
    }
    
    /**
     * @dev Get potential winnings for a round
     */
    function getPotentialWinnings(address playerAddr, uint8 round) external view returns (uint256) {
        if (round == 0 || round > 5) return 0;
        Player memory player = players[playerAddr];
        return (player.initialBet * multipliers[round - 1]) / 10000;
    }
    
    /**
     * @dev Withdraw house fees (owner only)
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Transfer failed");
    }
    
    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
}
