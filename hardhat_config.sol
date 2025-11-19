require("@nomicfoundation/hardhat-toolbox");
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337,
      host: "0.0.0.0",
      port: 8545
    },
    localhost: {
      url: "http://localhost:8545",
      chainId: 31337
    },
    khmweb01: {
      url: "http://192.168.50.206:8545",
      chainId: 31337,
      host: "0.0.0.0"
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};