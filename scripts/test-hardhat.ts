import hre from "hardhat";

async function testHardhat() {
  console.log("Testing Hardhat Runtime Environment...");
  console.log("Network name:", hre.network?.name || "unknown");
  console.log("Available properties:", Object.keys(hre));
  
  try {
    if (hre.viem) {
      console.log("✅ Viem is available");
      console.log("Viem methods:", Object.keys(hre.viem));
      
      // Test wallet client access
      const [deployer] = await hre.viem.getWalletClients();
      console.log("✅ Wallet client available:", deployer.account.address);
      
      // Test public client
      const publicClient = await hre.viem.getPublicClient();
      const blockNumber = await publicClient.getBlockNumber();
      console.log("✅ Public client available, block number:", blockNumber);
      
    } else {
      console.log("❌ Viem not available");
      console.log("Available properties in hre:", Object.keys(hre));
    }
  } catch (error) {
    console.error("Error accessing Viem:", error);
  }
}

testHardhat().catch(console.error);