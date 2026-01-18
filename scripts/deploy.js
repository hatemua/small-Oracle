import hre from "hardhat";

async function main() {
  console.log("Deploying GoldOracle contract...");

  // Get the contract factory
  const GoldOracle = await hre.ethers.getContractFactory("GoldOracle");

  // Deploy the contract
  const goldOracle = await GoldOracle.deploy();

  // Wait for deployment to finish
  await goldOracle.waitForDeployment();

  // Get the deployed contract address
  const address = await goldOracle.getAddress();

  console.log("✅ GoldOracle deployed to:", address);
  console.log("Owner address:", (await hre.ethers.getSigners())[0].address);
  console.log("\nSave this address to your .env file as CONTRACT_ADDRESS");
  console.log("\nTo verify on Etherscan, run:");
  console.log(`npx hardhat verify --network <network-name> ${address}`);

  // Return the contract for potential further use
  return goldOracle;
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
