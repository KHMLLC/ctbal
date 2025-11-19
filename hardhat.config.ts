import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-ignition-viem";
import "@nomicfoundation/hardhat-ethers";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    // Ethereum Sepolia Testnet (Phase 1: Testing)
    sepolia: {
      type: "http" as const,
      url: process.env.SEPOLIA_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      accounts: process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== "your_private_key_here" 
        ? [process.env.PRIVATE_KEY] 
        : [],
    },
    // Quorum Network (Phase 2: Production)
    quorum: {
      type: "http" as const,
      url: process.env.QUORUM_URL || "http://localhost:22000",
      accounts: process.env.QUORUM_PRIVATE_KEY && process.env.QUORUM_PRIVATE_KEY !== "your_quorum_private_key"
        ? [process.env.QUORUM_PRIVATE_KEY] 
        : [],
    },
    // Local Hardhat Network (Development)
    localhost: {
      type: "http" as const,
      url: "http://127.0.0.1:8545"
    },
    // khmweb01 Local Blockchain
    khmweb01: {
      type: "http" as const,
      url: process.env.KHMWEB01_URL || "http://khmweb01:8545",
      accounts: process.env.KHMWEB01_PRIVATE_KEY && process.env.KHMWEB01_PRIVATE_KEY !== "your_khmweb01_private_key"
        ? [process.env.KHMWEB01_PRIVATE_KEY]
        : [],
    }
  },
  // Contract verification settings
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || ""
    }
  },
  // Gas reporting
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD"
  }
};

export default config;