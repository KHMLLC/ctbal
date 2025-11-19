import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";

const CTBALModule = buildModule("CTBALModule", (m) => {
  // Deploy CTBALToken
  const ctbalToken = m.contract("CTBALToken", [
    "Clinical Test Blockchain Token", // name
    "CTBAL",                         // symbol
    parseEther("1000000")            // initial supply (1M tokens)
  ]);

  // Deploy CTBALAnalytics with CTBALToken address
  const ctbalAnalytics = m.contract("CTBALAnalytics", [ctbalToken]);

  return { ctbalToken, ctbalAnalytics };
});

export default CTBALModule;