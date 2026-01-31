const hre = require("hardhat");

async function main() {
    console.log("Deploying BattleBetting contract to Monad Testnet...");

    const BattleBetting = await hre.ethers.getContractFactory("BattleBetting");
    const battleBetting = await BattleBetting.deploy();

    await battleBetting.waitForDeployment();

    const address = await battleBetting.getAddress();
    console.log(`✅ BattleBetting deployed to: ${address}`);
    console.log("");
    console.log("Next steps:");
    console.log("1. Copy the contract address above");
    console.log("2. Update the client to use this address");
    console.log("3. Set the game server address using setGameServer()");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
