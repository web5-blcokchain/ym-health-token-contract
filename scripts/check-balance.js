const { ethers } = require("hardhat");

async function main() {
  const mockUSDTAddress = "0xeb4C53574edBF035FfBAF647b3E957b4FB88CD6B";
  const addresses = [
    "0x35F8A5659F5135875681C839A15fB654cb0D9AF0",
    "0x17cf8aaf3cb4dfb177ecf3c5bcd983a686acb0fd",
    "0x97bf69DAc46B1C97aEA0e39dbEC191FF4e3F258c"
  ];

  console.log("🔍 检查USDT余额...");
  console.log("📍 MockUSDT合约地址:", mockUSDTAddress);
  console.log("");

  // 连接到MockUSDT合约
  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const mockUSDT = MockUSDT.attach(mockUSDTAddress);

  // 检查合约基本信息
  const name = await mockUSDT.name();
  const symbol = await mockUSDT.symbol();
  const decimals = await mockUSDT.decimals();
  const totalSupply = await mockUSDT.totalSupply();

  console.log("📊 合约信息:");
  console.log("  名称:", name);
  console.log("  符号:", symbol);
  console.log("  精度:", decimals.toString());
  console.log("  总供应量:", ethers.utils.formatUnits(totalSupply, decimals), symbol);
  console.log("");

  // 检查每个地址的余额
  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i];
    const balance = await mockUSDT.balanceOf(address);
    const formattedBalance = ethers.utils.formatUnits(balance, decimals);
    
    console.log(`💰 地址 ${i + 1}: ${address}`);
    console.log(`   余额: ${formattedBalance} ${symbol}`);
    console.log(`   原始余额: ${balance.toString()}`);
    console.log("");
  }

  console.log("✅ 余额检查完成");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 检查失败:", error);
    process.exit(1);
  });