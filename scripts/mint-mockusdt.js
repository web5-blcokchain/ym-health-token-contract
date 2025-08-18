const { ethers } = require("hardhat");

async function main() {
  // 从环境变量或命令行参数获取合约地址和目标地址
  // 优先使用环境变量，如果没有则使用命令行参数
  let mockUSDTAddress = process.env.MOCKUSDT_ADDRESS;
  let recipientAddress = process.env.RECIPIENT_ADDRESS;
  let amount = process.env.MINT_AMOUNT;
  
  // 如果环境变量不存在，尝试从命令行参数获取
  if (!mockUSDTAddress || !recipientAddress) {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.log("❌ Usage Option 1 (Environment Variables):");
      console.log("   MOCKUSDT_ADDRESS=0x123... RECIPIENT_ADDRESS=0x456... MINT_AMOUNT=1000000 npx hardhat run scripts/mint-mockusdt.js --network bscTestnet");
      console.log("\n❌ Usage Option 2 (Edit script directly):");
      console.log("   Modify the addresses directly in mint-mockusdt-simple.js");
      console.log("\n📝 Example with environment variables:");
      console.log("   MOCKUSDT_ADDRESS=0x620bdC24abCf45F8Ea1D99fEF2EC5Aae7CD300A7 RECIPIENT_ADDRESS=0x620bdC24abCf45F8Ea1D99fEF2EC5Aae7CD300A7 MINT_AMOUNT=100 npx hardhat run scripts/mint-mockusdt.js --network bscTestnet");
      process.exit(1);
    }
    
    mockUSDTAddress = args[0];
    recipientAddress = args[1];
    amount = args[2];
  }
  
  // 设置默认值
  amount = amount || "1000000"; // 默认100万USDT
  
  console.log("🚀 Starting MockUSDT minting...");
  console.log("📍 MockUSDT Address:", mockUSDTAddress);
  console.log("🎯 Recipient Address:", recipientAddress);
  console.log("💰 Amount to mint:", amount, "USDT");
  
  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log("👤 Minting with account:", deployer.address);
  
  // 连接到MockUSDT合约
  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const mockUSDT = MockUSDT.attach(mockUSDTAddress);
  
  // 检查当前余额
  const balanceBefore = await mockUSDT.balanceOf(recipientAddress);
  console.log("📊 Balance before mint:", ethers.utils.formatUnits(balanceBefore, 6), "USDT");
  
  // 执行mint操作
  const mintAmount = ethers.utils.parseUnits(amount, 6); // MockUSDT使用6位小数
  console.log("⏳ Minting tokens...");
  
  try {
    const tx = await mockUSDT.mint(recipientAddress, mintAmount);
    console.log("📝 Transaction hash:", tx.hash);
    
    // 等待交易确认
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    
    // 检查mint后的余额
    const balanceAfter = await mockUSDT.balanceOf(recipientAddress);
    console.log("📊 Balance after mint:", ethers.utils.formatUnits(balanceAfter, 6), "USDT");
    
    // 检查总供应量
    const totalSupply = await mockUSDT.totalSupply();
    console.log("🏦 Total supply:", ethers.utils.formatUnits(totalSupply, 6), "USDT");
    
    console.log("\n🎉 Mint completed successfully!");
    console.log("==================================");
    console.log("Contract:", mockUSDTAddress);
    console.log("Recipient:", recipientAddress);
    console.log("Amount minted:", amount, "USDT");
    console.log("New balance:", ethers.utils.formatUnits(balanceAfter, 6), "USDT");
    
    if (receipt.events && receipt.events.length > 0) {
      console.log("\n📋 Events emitted:");
      receipt.events.forEach((event, index) => {
        console.log(`Event ${index + 1}:`, event.event);
      });
    }
    
  } catch (error) {
    console.error("❌ Mint failed:", error.message);
    
    // 提供常见错误的解决方案
    if (error.message.includes("Ownable: caller is not the owner")) {
      console.log("\n💡 Solution: Make sure you're using the owner account that deployed the MockUSDT contract.");
    } else if (error.message.includes("invalid address")) {
      console.log("\n💡 Solution: Check that the contract address and recipient address are valid.");
    } else if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Solution: Make sure your account has enough BNB for gas fees.");
    }
    
    process.exit(1);
  }
}

// 批量mint函数
async function batchMint() {
  const args = process.argv.slice(2);
  
  if (args.length < 1 || args[0] !== "--batch") {
    return main();
  }
  
  if (args.length < 2) {
    console.log("❌ Batch mint usage: npx hardhat run scripts/mint-mockusdt.js --network <network> -- --batch <mockUSDT_address> [recipients.json]");
    console.log("📝 recipients.json format: [{\"address\": \"0x123...\", \"amount\": \"1000000\"}]");
    process.exit(1);
  }
  
  const mockUSDTAddress = args[1];
  const recipientsFile = args[2] || "recipients.json";
  
  console.log("🚀 Starting batch MockUSDT minting...");
  console.log("📍 MockUSDT Address:", mockUSDTAddress);
  console.log("📄 Recipients file:", recipientsFile);
  
  try {
    const fs = require("fs");
    const recipients = JSON.parse(fs.readFileSync(recipientsFile, "utf8"));
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Minting with account:", deployer.address);
    
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUSDT = MockUSDT.attach(mockUSDTAddress);
    
    console.log(`\n📦 Processing ${recipients.length} recipients...`);
    
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      console.log(`\n[${i + 1}/${recipients.length}] Minting to ${recipient.address}`);
      
      const mintAmount = ethers.utils.parseUnits(recipient.amount, 6);
      const tx = await mockUSDT.mint(recipient.address, mintAmount);
      await tx.wait();
      
      console.log(`✅ Minted ${recipient.amount} USDT to ${recipient.address}`);
    }
    
    console.log("\n🎉 Batch mint completed successfully!");
    
  } catch (error) {
    console.error("❌ Batch mint failed:", error.message);
    process.exit(1);
  }
}

// 检查是否是批量mint
if (process.argv.includes("--batch")) {
  batchMint()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
} else {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}