require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.19",
    networks: {
        hardhat: {},
        monadTestnet: {
            url: "https://testnet-rpc.monad.xyz",
            chainId: 10143,
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
        }
    },
    paths: {
        sources: "./",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    }
};
