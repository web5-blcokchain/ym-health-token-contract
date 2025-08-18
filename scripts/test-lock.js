const { ethers } = require("hardhat");

async function main() {
    console.log("=== 测试代币锁仓功能 ===");
    
    // 获取部署的合约地址
    const mockUSDTAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const hltTokenAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
    const crowdsaleAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
    
    // 获取合约实例
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUSDT = MockUSDT.attach(mockUSDTAddress);
    
    const HLTToken = await ethers.getContractFactory("HLTToken");
    const hltToken = HLTToken.attach(hltTokenAddress);
    
    const Crowdsale = await ethers.getContractFactory("Crowdsale");
    const crowdsale = Crowdsale.attach(crowdsaleAddress);
    
    // 获取测试账户
    const [deployer, user1, user2] = await ethers.getSigners();
    
    console.log("\n=== 测试账户信息 ===");
    console.log("部署者:", deployer.address);
    console.log("用户1:", user1.address);
    console.log("用户2:", user2.address);
    
    // 给用户1铸造一些USDT
    const usdtAmount = ethers.utils.parseUnits("1000", 6); // 1000 USDT
    await mockUSDT.mint(user1.address, usdtAmount);
    console.log("\n已给用户1铸造:", ethers.utils.formatUnits(usdtAmount, 6), "USDT");
    
    // 开始众筹
    console.log("\n=== 开始众筹 ===");
    await crowdsale.startCrowdsale();
    console.log("众筹已开始");
    
    // 用户1授权USDT
    await mockUSDT.connect(user1).approve(crowdsale.address, usdtAmount);
    console.log("用户1已授权USDT");
    
    // 用户1购买代币
    const purchaseAmount = ethers.utils.parseUnits("100", 6); // 100 USDT
    console.log("\n=== 用户1购买代币 ===");
    console.log("购买数量:", ethers.utils.formatUnits(purchaseAmount, 6), "USDT");
    
    await crowdsale.connect(user1).buyTokens(purchaseAmount);
    console.log("购买成功！");
    
    // 查询用户信息
    console.log("\n=== 查询用户信息 ===");
    const userInfo = await crowdsale.getUserInfo(user1.address);
    console.log("USDT购买量:", ethers.utils.formatUnits(userInfo[0], 6));
    console.log("HLT获得量:", ethers.utils.formatEther(userInfo[1]));
    console.log("参与状态:", userInfo[2]);
    
    // 查询锁仓信息
    console.log("\n=== 查询锁仓信息 ===");
    const userLockInfo = await crowdsale.getUserLockInfo(user1.address);
    console.log("锁仓开始时间:", new Date(Number(userLockInfo[0]) * 1000).toLocaleString());
    console.log("解锁时间:", new Date(Number(userLockInfo[1]) * 1000).toLocaleString());
    console.log("是否锁仓:", userLockInfo[2]);
    
    // 查询HLTToken合约中的锁仓信息
    const lockInfo = await hltToken.getLockInfo(user1.address);
    console.log("HLT合约锁仓信息:");
    console.log("锁仓开始时间:", new Date(Number(lockInfo[0]) * 1000).toLocaleString());
    console.log("解锁时间:", new Date(Number(lockInfo[1]) * 1000).toLocaleString());
    console.log("是否锁仓:", lockInfo[2]);
    console.log("剩余锁仓时间:", Math.floor(Number(lockInfo[3]) / 86400), "天");
    
    // 尝试转移代币（应该失败）
    console.log("\n=== 测试锁仓功能 ===");
    try {
        await hltToken.connect(user1).transfer(user2.address, ethers.utils.parseEther("100"));
        console.log("❌ 转移成功（不应该发生）");
    } catch (error) {
        console.log("✅ 转移失败（符合预期）");
        console.log("错误信息:", error.message);
    }
    
    // 查询代币余额
    console.log("\n=== 代币余额 ===");
    const user1Balance = await hltToken.balanceOf(user1.address);
    const user2Balance = await hltToken.balanceOf(user2.address);
    console.log("用户1 HLT余额:", ethers.utils.formatEther(user1Balance));
    console.log("用户2 HLT余额:", ethers.utils.formatEther(user2Balance));
    
    // 查询众筹状态
    console.log("\n=== 众筹状态 ===");
    const status = await crowdsale.getCrowdsaleStatus();
    console.log("众筹激活:", status[0]);
    console.log("众筹结束:", status[1]);
    console.log("总USDT:", ethers.utils.formatUnits(status[4], 6));
    console.log("总HLT:", ethers.utils.formatEther(status[5]));
    console.log("参与人数:", status[6].toNumber());
    
    console.log("\n=== 测试完成 ===");
    console.log("用户1的代币将在12个月后解锁");
    console.log("解锁时间:", new Date(Number(lockInfo[1]) * 1000).toLocaleString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("测试失败:", error);
        process.exit(1);
    });
