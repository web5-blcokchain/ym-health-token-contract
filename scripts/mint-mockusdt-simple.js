const { ethers } = require("hardhat");

async function main() {
  // 直接在脚本中配置参数，避免命令行参数问题
  const mockUSDTAddress = "0x620bdC24abCf45F8Ea1D99fEF2EC5Aae7CD300A7";
  const recipientAddress = "0x620bdC24abCf45F8Ea1D99fEF2EC5Aae7CD300A7";
  const amount = "100"; // USDT数量
  
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

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });