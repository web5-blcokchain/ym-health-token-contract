const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting MockUSDT deployment to BSC Testnet...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString());

  // Deploy MockUSDT
  console.log("🔨 Deploying MockUSDT...");
  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const mockUSDT = await MockUSDT.deploy(deployer.address);
  await mockUSDT.deployed();
  
  console.log("✅ MockUSDT deployed to:", mockUSDT.address);
  console.log("👑 Owner address:", deployer.address);
  
  // Mint some initial USDT for testing
  const initialMintAmount = ethers.utils.parseUnits("1000000", 6); // 1M USDT (6 decimals)
  await mockUSDT.mint(deployer.address, initialMintAmount);
  console.log("💸 Minted", ethers.utils.formatUnits(initialMintAmount, 6), "USDT to deployer");
  
  // Verify deployment
  const totalSupply = await mockUSDT.totalSupply();
  const ownerBalance = await mockUSDT.balanceOf(deployer.address);
  
  console.log("\n📊 Deployment Summary:");
  console.log("=========================");
  console.log("Contract: MockUSDT");
  console.log("Address:", mockUSDT.address);
  console.log("Owner:", deployer.address);
  console.log("Total Supply:", ethers.utils.formatUnits(totalSupply, 6), "USDT");
  console.log("Owner Balance:", ethers.utils.formatUnits(ownerBalance, 6), "USDT");
  console.log("Decimals: 6");
  
  console.log("\n🔗 BSC Testnet Explorer:");
  console.log(`https://testnet.bscscan.com/address/${mockUSDT.address}`);
  
  console.log("\n📝 Next steps:");
  console.log("1. Copy the MockUSDT address above");
  console.log("2. Update the usdtAddress in deploy-bsc-testnet.js");
  console.log("3. Deploy your main contracts");
  
  return {
    mockUSDTAddress: mockUSDT.address,
    owner: deployer.address
  };
}

main()
  .then((result) => {
    console.log("\n🎉 Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
