const { ethers } = require("hardhat");

async function main() {
  const mockUSDTAddress = "0xeb4C53574edBF035FfBAF647b3E957b4FB88CD6B";
  const hltTokenAddress = "0xB9345Bfe74aC71D2C1bE0212F5bff3F67cB85ba4";
  const crowdsaleAddress = "0x32135980bB2468DbF4e53786148eA0C000F8Fdef";
  const userAddress = "0x97bf69DAc46B1C97aEA0e39dbEC191FF4e3F258c";

  console.log("🔍 检查用户购买情况...");
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
    console.log("💰 USDT余额:", ethers.utils.formatUnits(usdtBalance, 6), "USDT");
    
    // 2. 检查HLT余额
    const hltBalance = await hltToken.balanceOf(userAddress);
    console.log("🪙 HLT余额:", ethers.utils.formatEther(hltBalance), "HLT");
    
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
    
    // 5. 查询购买事件（使用新的事件结构: buyer, usdtAmount, hltAmount, scheduleId, timestamp）
    console.log("");
    console.log("🔍 查询购买事件...");
    
    const purchaseFilter = crowdsale.filters.TokensPurchased(userAddress);
    const events = await crowdsale.queryFilter(purchaseFilter, 0);
    
    if (events.length > 0) {
      console.log("📋 找到", events.length, "笔购买记录:");
      const allLocks = await hltToken.getLocks(userAddress);
      
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const block = await event.getBlock();
        const date = new Date(block.timestamp * 1000);
        const scheduleId = event.args.scheduleId?.toNumber?.() ?? Number(event.args.scheduleId);
        const lockInfo = allLocks[scheduleId];
        const unlockStr = lockInfo ? new Date(Number(lockInfo.unlock) * 1000).toLocaleString() : 'N/A';
        
        console.log(`\n  [${i + 1}] 交易哈希: ${event.transactionHash}`);
        console.log(`      区块号: ${event.blockNumber}`);
        console.log(`      时间: ${date.toLocaleString()}`);
        console.log(`      购买USDT: ${ethers.utils.formatUnits(event.args.usdtAmount, 6)} USDT`);
        console.log(`      获得HLT: ${ethers.utils.formatEther(event.args.hltAmount)} HLT`);
        console.log(`      锁仓条目ID: ${scheduleId}`);
        console.log(`      解锁时间: ${unlockStr}`);
      }
    } else {
      console.log("❌ 未找到购买记录");
    }
    
    // 6. 检查代币转账记录
    console.log("");
    console.log("🔍 查询HLT转账记录...");
    
    const transferFilter = hltToken.filters.Transfer(null, userAddress);
    const transferEvents = await hltToken.queryFilter(transferFilter, 0);
    
    if (transferEvents.length > 0) {
      console.log("📋 找到", transferEvents.length, "笔转入记录:");
      
      for (let i = 0; i < transferEvents.length; i++) {
        const event = transferEvents[i];
        const block = await event.getBlock();
        const date = new Date(block.timestamp * 1000);
        
        console.log(`\n  [${i + 1}] 交易哈希: ${event.transactionHash}`);
        console.log(`      区块号: ${event.blockNumber}`);
        console.log(`      时间: ${date.toLocaleString()}`);
        console.log(`      发送方: ${event.args.from}`);
        console.log(`      接收方: ${event.args.to}`);
        console.log(`      数量: ${ethers.utils.formatEther(event.args.value)} HLT`);
      }
    } else {
      console.log("❌ 未找到HLT转入记录");
    }
    
    console.log("");
    console.log("✅ 检查完成");
    
  } catch (error) {
    console.error("❌ 检查失败:", error.message);
    console.error("详细错误:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  });