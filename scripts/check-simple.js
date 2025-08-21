const { ethers } = require("hardhat");

async function main() {
  const mockUSDTAddress = "0xeb4C53574edBF035FfBAF647b3E957b4FB88CD6B";
  const hltTokenAddress = "0x64a4296C32A23C6296C089d6699d415377f8a8F6";
  const crowdsaleAddress = "0x699a392289Ec3800A03AcD52aa1695ebBA2fC516";
  const userAddress = "0x97bf69DAc46B1C97aEA0e39dbEC191FF4e3F258c";

  console.log("🔍 检查用户购买情况 (简化版)...");
  console.log("👤 用户地址:", userAddress);
  console.log("");

  // 连接到合约
  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const mockUSDT = MockUSDT.attach(mockUSDTAddress);
  
  const HLTToken = await ethers.getContractFactory("HLTToken");
  const hltToken = HLTToken.attach(hltTokenAddress);
  
  const Crowdsale = await ethers.getContractFactory("Crowdsale");
  const crowdsale = Crowdsale.attach(crowdsaleAddress);

  try {
    // 1. 检查USDT余额
    const usdtBalance = await mockUSDT.balanceOf(userAddress);
    console.log("💰 当前USDT余额:", ethers.utils.formatUnits(usdtBalance, 6), "USDT");
    
    // 2. 检查HLT余额
    const hltBalance = await hltToken.balanceOf(userAddress);
    console.log("🪙 当前HLT余额:", ethers.utils.formatEther(hltBalance), "HLT");
    
    // 3. 检查锁仓状态
    const isLocked = await hltToken.isUserLocked(userAddress);
    console.log("🔒 是否锁仓:", isLocked ? "是" : "否");
    
    if (isLocked) {
      const unlockTime = await hltToken.getUserUnlockTime(userAddress);
      const remainingTime = await hltToken.getUserRemainingLockTime(userAddress);
      const unlockDate = new Date(unlockTime.toNumber() * 1000);
      
      console.log("⏰ 解锁时间:", unlockDate.toLocaleString());
      console.log("⏳ 剩余锁仓时间:", Math.floor(remainingTime.toNumber() / 86400), "天");
    }
    
    // 4. 检查购买记录
    const userInfo = await crowdsale.getUserInfo(userAddress);
    console.log("");
    console.log("📊 购买记录:");
    console.log("  已购买USDT:", ethers.utils.formatUnits(userInfo.usdtPurchased, 6), "USDT");
    console.log("  获得HLT:", ethers.utils.formatEther(userInfo.hltAmount), "HLT");
    console.log("  是否参与:", userInfo.participated ? "是" : "否");
    
    // 5. 检查众筹状态
    const tokensPerUSDT = await crowdsale.tokensPerUSDT();
    const isActive = await crowdsale.crowdsaleActive();
    
    console.log("");
    console.log("📈 众筹信息:");
    console.log("  兑换比例:", tokensPerUSDT.toString(), "HLT per USDT");
    console.log("  众筹状态:", isActive ? "进行中" : "已结束");
    
    // 6. 计算预期收益
    const expectedHLT = userInfo.usdtPurchased.mul(tokensPerUSDT).div(ethers.utils.parseUnits("1", 6));
    console.log("  预期HLT:", ethers.utils.formatEther(expectedHLT), "HLT");
    
    console.log("");
    console.log("💡 分析结果:");
    
    if (userInfo.participated) {
      console.log("✅ 用户已成功参与众筹");
      console.log("✅ USDT已被正确扣除:", ethers.utils.formatUnits(userInfo.usdtPurchased, 6), "USDT");
      console.log("✅ HLT代币已发放:", ethers.utils.formatEther(userInfo.hltAmount), "HLT");
      
      if (isLocked) {
        console.log("🔒 代币已锁仓，需要等待解锁时间才能在钱包中正常显示和转账");
        console.log("📱 钱包可能不显示锁仓代币的余额，这是正常现象");
      }
    } else {
      console.log("❌ 用户尚未参与众筹");
    }
    
    console.log("");
    console.log("🔧 钱包显示问题解决方案:");
    console.log("1. 确保钱包连接到BSC测试网");
    console.log("2. 手动添加HLT代币合约地址:", hltTokenAddress);
    console.log("3. 代币符号: HLT");
    console.log("4. 精度: 18");
    console.log("5. 注意：锁仓期间代币可能不会在钱包中正常显示");
    
  } catch (error) {
    console.error("❌ 检查失败:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  });