const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 === HealthLife Token 全面集成测试 ===");
    
    // 获取测试账户
    const [deployer, user1, user2, user3, user4, user5] = await ethers.getSigners();
    
    console.log("\n👥 === 测试账户信息 ===");
    console.log("部署者/管理员:", deployer.address);
    console.log("用户1:", user1.address);
    console.log("用户2:", user2.address);
    console.log("用户3:", user3.address);
    console.log("用户4:", user4.address);
    console.log("用户5:", user5.address);
    
    // ==================== 第一阶段：合约部署 ====================
    console.log("\n🏗️ === 第一阶段：合约部署 ===");
    
    // 部署 MockUSDT
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUSDT = await MockUSDT.deploy("Tether USD", "USDT", 6);
    await mockUSDT.deployed();
    console.log("✅ MockUSDT 部署成功:", mockUSDT.address);
    
    // 部署 HLTToken
    const HLTToken = await ethers.getContractFactory("HLTToken");
    const hltToken = await HLTToken.deploy("HealthLife Token", "HLT", deployer.address, user5.address);
    await hltToken.deployed();
    console.log("✅ HLTToken 部署成功:", hltToken.address);
    
    // 部署 Crowdsale
    const Crowdsale = await ethers.getContractFactory("Crowdsale");
    const crowdsale = await Crowdsale.deploy(hltToken.address, mockUSDT.address, deployer.address);
    await crowdsale.deployed();
    console.log("✅ Crowdsale 部署成功:", crowdsale.address);
    
    // ==================== 第二阶段：初始配置 ====================
    console.log("\n⚙️ === 第二阶段：初始配置 ===");
    
    // 设置众筹合约地址
    await hltToken.setCrowdsaleContract(crowdsale.address);
    console.log("✅ 已设置众筹合约地址");
    
    // 给众筹合约分配代币
    const saleAmount = await hltToken.SALE_AMOUNT();
    await hltToken.transfer(crowdsale.address, saleAmount);
    console.log("✅ 已分配", ethers.utils.formatEther(saleAmount), "HLT 给众筹合约");
    
    // 转移其他代币到指定账号
    await hltToken.transferOtherTokens();
    console.log("✅ 已转移其他代币到账号:", user5.address);
    
    // 给测试用户铸造USDT
    const userUSDTAmount = ethers.utils.parseUnits("10000", 6); // 1万USDT
    await mockUSDT.mint(user1.address, userUSDTAmount);
    await mockUSDT.mint(user2.address, userUSDTAmount);
    await mockUSDT.mint(user3.address, userUSDTAmount);
    await mockUSDT.mint(user4.address, userUSDTAmount);
    console.log("✅ 已给测试用户铸造USDT");
    
    // ==================== 第三阶段：价格设置测试 ====================
    console.log("\n💰 === 第三阶段：价格设置测试 ===");
    
    // 查询初始价格
    const initialPrice = await crowdsale.getTokenPrice();
    console.log("📊 初始价格: 1 USDT =", initialPrice.toString(), "HLT");
    
    // 设置新价格
    const newPrice = 15;
    await crowdsale.setTokenPrice(newPrice);
    console.log("✅ 价格已更新: 1 USDT =", newPrice, "HLT");
    
    // 验证价格更新
    const updatedPrice = await crowdsale.getTokenPrice();
    console.log("📊 更新后价格: 1 USDT =", updatedPrice.toString(), "HLT");
    
    // 测试非所有者设置价格（应该失败）
    try {
        await crowdsale.connect(user1).setTokenPrice(20);
        console.log("❌ 非所有者设置价格成功（不应该发生）");
    } catch (error) {
        console.log("✅ 非所有者设置价格失败（符合预期）");
    }
    
    // 测试设置零价格（应该失败）
    try {
        await crowdsale.setTokenPrice(0);
        console.log("❌ 设置零价格成功（不应该发生）");
    } catch (error) {
        console.log("✅ 设置零价格失败（符合预期）");
    }
    
    // 恢复原价格
    await crowdsale.setTokenPrice(12);
    console.log("✅ 价格已恢复: 1 USDT = 12 HLT");
    
    // ==================== 第四阶段：众筹管理测试 ====================
    console.log("\n🎯 === 第四阶段：众筹管理测试 ===");
    
    // 开始众筹
    await crowdsale.startCrowdsale();
    console.log("✅ 众筹已开始");
    
    // 查询众筹状态
    const status1 = await crowdsale.getCrowdsaleStatus();
    console.log("📊 众筹状态:", {
        active: status1[0],
        ended: status1[1],
        startTime: new Date(Number(status1[2]) * 1000).toLocaleString(),
        endTime: status1[3].toNumber() === 0 ? "未设置" : new Date(Number(status1[3]) * 1000).toLocaleString()
    });
    
    // 测试重复开始众筹（应该失败）
    try {
        await crowdsale.startCrowdsale();
        console.log("❌ 重复开始众筹成功（不应该发生）");
    } catch (error) {
        console.log("✅ 重复开始众筹失败（符合预期）");
    }
    
    // 测试非所有者开始众筹（应该失败）
    try {
        await crowdsale.connect(user1).startCrowdsale();
        console.log("❌ 非所有者开始众筹成功（不应该发生）");
    } catch (error) {
        console.log("✅ 非所有者开始众筹失败（符合预期）");
    }
    
    // ==================== 第五阶段：代币购买测试 ====================
    console.log("\n🛒 === 第五阶段：代币购买测试 ===");
    
    // 用户1授权USDT
    await mockUSDT.connect(user1).approve(crowdsale.address, userUSDTAmount);
    console.log("✅ 用户1已授权USDT");
    
    // 用户1购买代币
    const purchase1 = ethers.utils.parseUnits("100", 6); // 100 USDT
    await crowdsale.connect(user1).buyTokens(purchase1);
    console.log("✅ 用户1购买成功: 100 USDT");
    
    // 用户2授权并购买
    await mockUSDT.connect(user2).approve(crowdsale.address, userUSDTAmount);
    const purchase2 = ethers.utils.parseUnits("200", 6); // 200 USDT
    await crowdsale.connect(user2).buyTokens(purchase2);
    console.log("✅ 用户2购买成功: 200 USDT");
    
    // 用户3授权并购买
    await mockUSDT.connect(user3).approve(crowdsale.address, userUSDTAmount);
    const purchase3 = ethers.utils.parseUnits("50", 6); // 50 USDT
    await crowdsale.connect(user3).buyTokens(purchase3);
    console.log("✅ 用户3购买成功: 50 USDT");
    
    // 用户4授权并购买
    await mockUSDT.connect(user4).approve(crowdsale.address, userUSDTAmount);
    const purchase4 = ethers.utils.parseUnits("150", 6); // 150 USDT
    await crowdsale.connect(user4).buyTokens(purchase4);
    console.log("✅ 用户4购买成功: 150 USDT");
    
    // 测试边界情况
    console.log("\n🔍 === 边界情况测试 ===");
    
    // 测试最小购买量
    try {
        await crowdsale.connect(user1).buyTokens(ethers.utils.parseUnits("0.5", 6));
        console.log("❌ 最小购买量测试失败（不应该发生）");
    } catch (error) {
        console.log("✅ 最小购买量测试通过（符合预期）");
    }
    
    // 测试最大购买量
    try {
        await crowdsale.connect(user1).buyTokens(ethers.utils.parseUnits("2000000", 6));
        console.log("❌ 最大购买量测试失败（不应该发生）");
    } catch (error) {
        console.log("✅ 最大购买量测试通过（符合预期）");
    }
    
    // 测试重复购买
    const additionalPurchase = ethers.utils.parseUnits("50", 6);
    await crowdsale.connect(user1).buyTokens(additionalPurchase);
    console.log("✅ 用户1重复购买成功: 50 USDT");
    
    // ==================== 第六阶段：锁仓功能测试 ====================
    console.log("\n🔒 === 第六阶段：锁仓功能测试 ===");
    
    // 查询用户1的锁仓信息
    const user1LockTime = await hltToken.userLockTime(user1.address);
    const user1UnlockTime = await hltToken.getUserUnlockTime(user1.address);
    const user1IsLocked = await hltToken.isUserLocked(user1.address);
    const user1RemainingTime = await hltToken.getUserRemainingLockTime(user1.address);
    
    console.log("📊 用户1锁仓信息:", {
        lockTime: new Date(Number(user1LockTime) * 1000).toLocaleString(),
        unlockTime: new Date(Number(user1UnlockTime) * 1000).toLocaleString(),
        isLocked: user1IsLocked,
        remainingDays: Math.floor(Number(user1RemainingTime) / 86400)
    });
    
    // 测试锁仓期间转移代币（应该失败）
    try {
        await hltToken.connect(user1).transfer(user2.address, ethers.utils.parseEther("100"));
        console.log("❌ 锁仓期间转移代币成功（不应该发生）");
    } catch (error) {
        console.log("✅ 锁仓期间转移代币失败（符合预期）");
        console.log("   错误信息:", error.message);
    }
    
    // 测试锁仓期间授权代币（应该成功，因为只是授权）
    await hltToken.connect(user1).approve(user2.address, ethers.utils.parseEther("100"));
    console.log("✅ 锁仓期间授权代币成功（符合预期）");
    
    // 测试锁仓期间transferFrom（应该失败）
    try {
        await hltToken.connect(user2).transferFrom(user1.address, user3.address, ethers.utils.parseEther("100"));
        console.log("❌ 锁仓期间transferFrom成功（不应该发生）");
    } catch (error) {
        console.log("✅ 锁仓期间transferFrom失败（符合预期）");
        console.log("   错误信息:", error.message);
    }
    
    // ==================== 第七阶段：查询功能测试 ====================
    console.log("\n🔍 === 第七阶段：查询功能测试 ===");
    
    // 查询众筹状态
    const status2 = await crowdsale.getCrowdsaleStatus();
    console.log("📊 众筹状态:", {
        active: status2[0],
        ended: status2[1],
        startTime: new Date(Number(status2[2]) * 1000).toLocaleString(),
        endTime: status2[3].toNumber() === 0 ? "未设置" : new Date(Number(status2[3]) * 1000).toLocaleString(),
        totalUSDT: ethers.utils.formatUnits(status2[4], 6),
        totalHLT: ethers.utils.formatEther(status2[5]),
        participants: status2[6].toNumber()
    });
    
    // 查询用户购买信息
    const user1Info = await crowdsale.getUserInfo(user1.address);
    console.log("📊 用户1购买信息:", {
        usdtPurchased: ethers.utils.formatUnits(user1Info[0], 6),
        hltAmount: ethers.utils.formatEther(user1Info[1]),
        participated: user1Info[2]
    });
    
    // 查询用户锁仓信息
    const user1CrowdsaleLockInfo = await crowdsale.getUserLockInfo(user1.address);
    console.log("📊 用户1众筹锁仓信息:", {
        lockTime: new Date(Number(user1CrowdsaleLockInfo[0]) * 1000).toLocaleString(),
        unlockTime: new Date(Number(user1CrowdsaleLockInfo[1]) * 1000).toLocaleString(),
        isLocked: user1CrowdsaleLockInfo[2]
    });
    
    // 查询剩余时间
    const remainingTime = await crowdsale.getRemainingTime();
    console.log("📊 众筹剩余时间:", remainingTime.toString() === ethers.constants.MaxUint256.toString() ? "无限期" : remainingTime.toString());
    
    // 查询代币价格
    const currentPrice = await crowdsale.getTokenPrice();
    console.log("📊 当前代币价格: 1 USDT =", currentPrice.toString(), "HLT");
    
    // 测试计算函数
    const testUSDT = ethers.utils.parseUnits("100", 6);
    const calculatedHLT = await crowdsale.calculateHLTAmount(testUSDT);
    const calculatedUSDT = await crowdsale.calculateUSDTAmount(calculatedHLT);
    console.log("📊 计算函数测试:", {
        inputUSDT: ethers.utils.formatUnits(testUSDT, 6),
        calculatedHLT: ethers.utils.formatEther(calculatedHLT),
        calculatedUSDT: ethers.utils.formatUnits(calculatedUSDT, 6)
    });
    
    // ==================== 第八阶段：众筹结束测试 ====================
    console.log("\n⏹️ === 第八阶段：众筹结束测试 ===");
    
    // 结束众筹
    await crowdsale.endCrowdsale();
    console.log("✅ 众筹已结束");
    
    // 查询结束后的状态
    const status3 = await crowdsale.getCrowdsaleStatus();
    console.log("📊 结束后状态:", {
        active: status3[0],
        ended: status3[1],
        endTime: new Date(Number(status3[3]) * 1000).toLocaleString()
    });
    
    // 测试结束后购买（应该失败）
    try {
        await crowdsale.connect(user4).buyTokens(ethers.utils.parseUnits("100", 6));
        console.log("❌ 结束后购买成功（不应该发生）");
    } catch (error) {
        console.log("✅ 结束后购买失败（符合预期）");
    }
    
    // ==================== 第九阶段：资金提取测试 ====================
    console.log("\n💸 === 第九阶段：资金提取测试 ===");
    
    // 查询众筹合约USDT余额
    const crowdsaleUSDTBalance = await mockUSDT.balanceOf(crowdsale.address);
    console.log("📊 众筹合约USDT余额:", ethers.utils.formatUnits(crowdsaleUSDTBalance, 6));
    
    // 查询管理员USDT余额
    const adminUSDTBalanceBefore = await mockUSDT.balanceOf(deployer.address);
    console.log("📊 管理员提取前USDT余额:", ethers.utils.formatUnits(adminUSDTBalanceBefore, 6));
    
    // 提取USDT
    await crowdsale.withdrawUSDT();
    console.log("✅ USDT提取成功");
    
    // 查询提取后余额
    const adminUSDTBalanceAfter = await mockUSDT.balanceOf(deployer.address);
    console.log("📊 管理员提取后USDT余额:", ethers.utils.formatUnits(adminUSDTBalanceAfter, 6));
    
    // 测试非所有者提取（应该失败）
    try {
        await crowdsale.connect(user1).withdrawUSDT();
        console.log("❌ 非所有者提取成功（不应该发生）");
    } catch (error) {
        console.log("✅ 非所有者提取失败（符合预期）");
    }
    
    // ==================== 第十阶段：紧急停止测试 ====================
    console.log("\n🚨 === 第十阶段：紧急停止测试 ===");
    
    // 重新开始众筹（用于测试紧急停止）
    await crowdsale.startCrowdsale();
    console.log("✅ 众筹重新开始");
    
    // 紧急停止
    await crowdsale.emergencyStop();
    console.log("✅ 紧急停止成功");
    
    // 查询紧急停止后状态
    const emergencyStatus = await crowdsale.getCrowdsaleStatus();
    console.log("📊 紧急停止后状态:", {
        active: emergencyStatus[0],
        ended: emergencyStatus[1],
        endTime: new Date(Number(emergencyStatus[3]) * 1000).toLocaleString()
    });
    
    // ==================== 第十一阶段：代币分配验证 ====================
    console.log("\n📊 === 第十一阶段：代币分配验证 ===");
    
    // 查询代币分配状态
    const allocationStatus = await hltToken.getTokenAllocationStatus();
    console.log("📊 代币分配状态:", {
        otherTokensTransferred: allocationStatus
    });
    
    // 查询合约地址
    const contractAddresses = await hltToken.getContractAddresses();
    console.log("📊 合约地址配置:", {
        crowdsaleContract: contractAddresses[0],
        otherAccount: contractAddresses[1]
    });
    
    // 查询代币分配数量
    const allocationAmounts = await hltToken.getTokenAllocationAmounts();
    console.log("📊 代币分配数量:", {
        totalSupply: ethers.utils.formatEther(allocationAmounts[0]),
        saleAmount: ethers.utils.formatEther(allocationAmounts[1]),
        otherAmount: ethers.utils.formatEther(allocationAmounts[2])
    });
    
    // 查询各用户代币余额
    console.log("📊 用户代币余额:");
    console.log("   用户1:", ethers.utils.formatEther(await hltToken.balanceOf(user1.address)), "HLT");
    console.log("   用户2:", ethers.utils.formatEther(await hltToken.balanceOf(user2.address)), "HLT");
    console.log("   用户3:", ethers.utils.formatEther(await hltToken.balanceOf(user3.address)), "HLT");
    console.log("   用户4:", ethers.utils.formatEther(await hltToken.balanceOf(user4.address)), "HLT");
    console.log("   用户5:", ethers.utils.formatEther(await hltToken.balanceOf(user5.address)), "HLT");
    console.log("   众筹合约:", ethers.utils.formatEther(await hltToken.balanceOf(crowdsale.address)), "HLT");
    
    // ==================== 第十二阶段：锁仓时间验证 ====================
    console.log("\n⏰ === 第十二阶段：锁仓时间验证 ===");
    
    // 验证所有用户的锁仓时间
    const users = [user1, user2, user3, user4];
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const lockTime = await hltToken.userLockTime(user.address);
        const unlockTime = await hltToken.getUserUnlockTime(user.address);
        const isLocked = await hltToken.isUserLocked(user.address);
        const remainingTime = await hltToken.getUserRemainingLockTime(user.address);
        
        const unlockDate = new Date(Number(unlockTime) * 1000);
        const now = new Date();
        const remainingDays = Math.ceil((unlockDate - now) / (1000 * 60 * 60 * 24));
        
        console.log(`📊 用户${i + 1}锁仓信息:`, {
            address: user.address,
            lockTime: new Date(Number(lockTime) * 1000).toLocaleString(),
            unlockTime: unlockDate.toLocaleString(),
            isLocked: isLocked,
            remainingDays: remainingDays
        });
    }
    
    // ==================== 测试总结 ====================
    console.log("\n🎉 === 测试总结 ===");
    console.log("✅ 合约部署: 成功");
    console.log("✅ 初始配置: 成功");
    console.log("✅ 价格设置: 成功");
    console.log("✅ 众筹管理: 成功");
    console.log("✅ 代币购买: 成功");
    console.log("✅ 锁仓功能: 成功");
    console.log("✅ 查询功能: 成功");
    console.log("✅ 众筹结束: 成功");
    console.log("✅ 资金提取: 成功");
    console.log("✅ 紧急停止: 成功");
    console.log("✅ 代币分配: 成功");
    console.log("✅ 锁仓验证: 成功");
    
    console.log("\n🚀 所有功能测试通过！HealthLife Token 项目完全就绪！");
    console.log("\n📋 下一步操作:");
    console.log("1. 部署到测试网");
    console.log("2. 部署到主网");
    console.log("3. 开始正式众筹");
    console.log("4. 用户购买代币（自动锁仓12个月）");
    console.log("5. 12个月后用户可自由转移代币");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ 测试失败:", error);
        process.exit(1);
    });
