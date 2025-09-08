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
    
    // 3. 检查锁仓状态（代币层）
    const locks = await hltToken.getLocks(userAddress);
    const lockedAmount = await hltToken.getLockedAmount(userAddress);
    const unlockedAmount = await hltToken.getUnlockedAmount(userAddress);
    console.log("🔒 锁仓条目数量:", locks.length);
    console.log("🔒 当前锁定总额:", ethers.utils.formatEther(lockedAmount), "HLT");
    console.log("🔓 当前可转余额:", ethers.utils.formatEther(unlockedAmount), "HLT");
    if (locks.length > 0) {
      const last = locks[locks.length - 1];
      const unlockDate = new Date(Number(last.unlock) * 1000);
      console.log("⏰ 最近锁仓解锁时间:", unlockDate.toLocaleString());
    }
    
    // 4. 检查购买记录
    const userInfo = await crowdsale.getUserInfo(userAddress);
    console.log("");
    console.log("📊 购买记录:");
    console.log("  已购买USDT:", ethers.utils.formatUnits(userInfo.usdtPurchased, 6), "USDT");
    console.log("  获得HLT:", ethers.utils.formatEther(userInfo.hltAmount), "HLT");
    console.log("  是否参与:", userInfo.participated ? "是" : "否");
    
    // 5. 检查众筹状态
    const tokensPerUSDT = await crowdsale.getTokenPrice();
    const isActive = await crowdsale.crowdsaleActive();
    
    console.log("");
    console.log("📈 众筹信息:");
    console.log("  兑换比例:", tokensPerUSDT.toString(), "HLT per USDT");
    console.log("  众筹状态:", isActive ? "进行中" : "已结束");
    
    // 6. 计算预期收益（使用合约提供的计算函数）
    const expectedHLT = await crowdsale.calculateHLTAmount(userInfo.usdtPurchased);
    console.log("  预期HLT:", ethers.utils.formatEther(expectedHLT), "HLT");
    
    console.log("");
    console.log("💡 分析结果:");
    
    if (userInfo.participated) {
      console.log("✅ 用户已成功参与众筹");
      console.log("✅ USDT已被正确扣除:", ethers.utils.formatUnits(userInfo.usdtPurchased, 6), "USDT");
      console.log("✅ HLT代币已发放:", ethers.utils.formatEther(userInfo.hltAmount), "HLT");
      
      if (lockedAmount.gt(0)) {
        console.log("🔒 代币处于锁定状态，解锁前无法转出锁定部分");
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
    console.log("5. 注意：锁仓部分无法转账，解锁后即可正常转移");
    
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