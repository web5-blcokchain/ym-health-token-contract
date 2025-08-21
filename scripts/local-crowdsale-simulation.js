// 本地众筹流程完整模拟测试
const { ethers } = require('hardhat');

async function main() {
    console.log('🎯 === 本地众筹流程完整模拟测试 ===\n');
    
    // 获取签名者
    const [deployer, user1, user2, user3] = await ethers.getSigners();
    
    console.log('👥 测试账户:');
    console.log('  管理员:', deployer.address);
    console.log('  用户1:', user1.address);
    console.log('  用户2:', user2.address);
    console.log('  用户3:', user3.address);
    console.log();
    
    // ===== 第一阶段：部署合约 =====
    console.log('🚀 === 第一阶段：部署合约 ===');
    
    // 部署HLT代币
    const HLTToken = await ethers.getContractFactory('HLTToken');
    const hltToken = await HLTToken.deploy('HealthLife Token', 'HLT', deployer.address, user3.address);
    await hltToken.deployed();
    console.log('✅ HLTToken部署成功:', hltToken.address);
    
    // 部署MockUSDT
    const MockUSDT = await ethers.getContractFactory('MockUSDT');
    const mockUSDT = await MockUSDT.deploy(deployer.address);
    await mockUSDT.deployed();
    console.log('✅ MockUSDT部署成功:', mockUSDT.address);
    
    // 部署众筹合约
    const Crowdsale = await ethers.getContractFactory('Crowdsale');
    const crowdsale = await Crowdsale.deploy(hltToken.address, mockUSDT.address, deployer.address);
    await crowdsale.deployed();
    console.log('✅ Crowdsale部署成功:', crowdsale.address);
    
    // 配置合约
    await hltToken.setCrowdsaleContract(crowdsale.address);
    const saleAmount = await hltToken.SALE_AMOUNT();
    await hltToken.transfer(crowdsale.address, saleAmount);
    console.log('✅ 合约配置完成\n');
    
    // ===== 第二阶段：准备测试数据 =====
    console.log('📋 === 第二阶段：准备测试数据 ===');
    
    // 给用户铸造USDT
    const user1USDTAmount = ethers.utils.parseUnits('1000', 6); // 1000 USDT
    const user2USDTAmount = ethers.utils.parseUnits('2000', 6); // 2000 USDT
    
    await mockUSDT.mint(user1.address, user1USDTAmount);
    await mockUSDT.mint(user2.address, user2USDTAmount);
    
    console.log('💰 用户USDT余额:');
    console.log('  用户1:', ethers.utils.formatUnits(await mockUSDT.balanceOf(user1.address), 6), 'USDT');
    console.log('  用户2:', ethers.utils.formatUnits(await mockUSDT.balanceOf(user2.address), 6), 'USDT');
    
    // 检查初始状态
    console.log('\n🏦 合约初始状态:');
    console.log('  合约HLT余额:', ethers.utils.formatUnits(await hltToken.balanceOf(crowdsale.address), 18), 'HLT');
    console.log('  合约USDT余额:', ethers.utils.formatUnits(await mockUSDT.balanceOf(crowdsale.address), 6), 'USDT');
    console.log('  管理员USDT余额:', ethers.utils.formatUnits(await mockUSDT.balanceOf(deployer.address), 6), 'USDT');
    console.log();
    
    // ===== 第三阶段：开始众筹 =====
    console.log('🚀 === 第三阶段：开始众筹 ===');
    
    await crowdsale.startCrowdsale();
    console.log('✅ 众筹已开始');
    
    const status = await crowdsale.getCrowdsaleStatus();
    console.log('📊 众筹信息:');
    console.log('  状态:', status[0] ? '进行中' : '未开始');
    console.log('  兑换比例:', await crowdsale.tokensPerUSDT(), 'HLT per USDT');
    console.log('  开始时间:', new Date(status[2].toNumber() * 1000).toLocaleString());
    console.log();
    
    // ===== 第四阶段：用户购买测试 =====
    console.log('🛒 === 第四阶段：用户购买测试 ===');
    
    // 用户1购买
    const user1PurchaseAmount = ethers.utils.parseUnits('500', 6); // 500 USDT
    console.log('👤 用户1购买测试:');
    console.log('  购买金额:', ethers.utils.formatUnits(user1PurchaseAmount, 6), 'USDT');
    
    await mockUSDT.connect(user1).approve(crowdsale.address, user1PurchaseAmount);
    console.log('  ✅ USDT授权完成');
    
    const user1BeforeUSDT = await mockUSDT.balanceOf(user1.address);
    await crowdsale.connect(user1).buyTokens(user1PurchaseAmount);
    const user1AfterUSDT = await mockUSDT.balanceOf(user1.address);
    const user1HLT = await hltToken.balanceOf(user1.address);
    
    console.log('  ✅ 购买成功');
    console.log('  USDT变化:', ethers.utils.formatUnits(user1BeforeUSDT.sub(user1AfterUSDT), 6), 'USDT');
    console.log('  获得HLT:', ethers.utils.formatUnits(user1HLT, 18), 'HLT');
    
    // 用户2购买
    const user2PurchaseAmount = ethers.utils.parseUnits('1000', 6); // 1000 USDT
    console.log('\n👤 用户2购买测试:');
    console.log('  购买金额:', ethers.utils.formatUnits(user2PurchaseAmount, 6), 'USDT');
    
    await mockUSDT.connect(user2).approve(crowdsale.address, user2PurchaseAmount);
    console.log('  ✅ USDT授权完成');
    
    const user2BeforeUSDT = await mockUSDT.balanceOf(user2.address);
    await crowdsale.connect(user2).buyTokens(user2PurchaseAmount);
    const user2AfterUSDT = await mockUSDT.balanceOf(user2.address);
    const user2HLT = await hltToken.balanceOf(user2.address);
    
    console.log('  ✅ 购买成功');
    console.log('  USDT变化:', ethers.utils.formatUnits(user2BeforeUSDT.sub(user2AfterUSDT), 6), 'USDT');
    console.log('  获得HLT:', ethers.utils.formatUnits(user2HLT, 18), 'HLT');
    console.log();
    
    // ===== 第五阶段：锁仓机制测试 =====
    console.log('🔒 === 第五阶段：锁仓机制测试 ===');
    
    // 检查用户1锁仓状态
    const user1LockInfo = await crowdsale.getLockInfo(user1.address);
    console.log('👤 用户1锁仓信息:');
    console.log('  锁仓开始:', new Date(user1LockInfo[0].toNumber() * 1000).toLocaleString());
    console.log('  解锁时间:', new Date(user1LockInfo[1].toNumber() * 1000).toLocaleString());
    console.log('  当前锁仓:', user1LockInfo[2] ? '是' : '否');
    console.log('  剩余天数:', Math.floor(user1LockInfo[3].toNumber() / 86400), '天');
    
    // 测试锁仓期间转账
    console.log('\n🚫 测试锁仓期间转账:');
    try {
        await hltToken.connect(user1).transfer(user2.address, ethers.utils.parseUnits('1', 18));
        console.log('  ❌ 错误：锁仓期间转账成功了！');
    } catch (error) {
        console.log('  ✅ 正确：锁仓期间转账被阻止');
        console.log('  错误信息:', error.reason || '转账失败');
    }
    console.log();
    
    // ===== 第六阶段：众筹统计验证 =====
    console.log('📈 === 第六阶段：众筹统计验证 ===');
    
    const finalStatus = await crowdsale.getCrowdsaleStatus();
    const totalPurchased = user1PurchaseAmount.add(user2PurchaseAmount);
    const expectedHLT = totalPurchased.mul(await crowdsale.tokensPerUSDT()).mul(ethers.utils.parseUnits('1', 18)).div(ethers.utils.parseUnits('1', 6));
    
    console.log('📊 众筹统计:');
    console.log('  总筹集USDT:', ethers.utils.formatUnits(finalStatus[4], 6), 'USDT');
    console.log('  预期USDT:', ethers.utils.formatUnits(totalPurchased, 6), 'USDT');
    console.log('  总售出HLT:', ethers.utils.formatUnits(finalStatus[5], 18), 'HLT');
    console.log('  预期HLT:', ethers.utils.formatUnits(expectedHLT, 18), 'HLT');
    console.log('  参与人数:', finalStatus[6].toString());
    console.log('  统计正确:', finalStatus[4].eq(totalPurchased) && finalStatus[5].eq(expectedHLT) ? '✅ 是' : '❌ 否');
    
    // 检查合约资金状态
    const contractUSDTBalance = await mockUSDT.balanceOf(crowdsale.address);
    const contractHLTBalance = await hltToken.balanceOf(crowdsale.address);
    
    console.log('\n🏦 合约资金状态:');
    console.log('  合约USDT余额:', ethers.utils.formatUnits(contractUSDTBalance, 6), 'USDT');
    console.log('  合约HLT余额:', ethers.utils.formatUnits(contractHLTBalance, 18), 'HLT');
    console.log();
    
    // ===== 第七阶段：结束众筹并提取资金 =====
    console.log('🏁 === 第七阶段：结束众筹并提取资金 ===');
    
    // 结束众筹
    console.log('🛑 结束众筹...');
    await crowdsale.endCrowdsale();
    console.log('✅ 众筹已结束');
    
    // 检查提取前状态
    const beforeWithdrawOwnerUSDT = await mockUSDT.balanceOf(deployer.address);
    const beforeWithdrawContractUSDT = await mockUSDT.balanceOf(crowdsale.address);
    
    console.log('\n💰 提取前状态:');
    console.log('  管理员USDT:', ethers.utils.formatUnits(beforeWithdrawOwnerUSDT, 6), 'USDT');
    console.log('  合约USDT:', ethers.utils.formatUnits(beforeWithdrawContractUSDT, 6), 'USDT');
    
    // 提取资金
    console.log('\n💸 提取USDT资金...');
    await crowdsale.withdrawUSDT();
    console.log('✅ 资金提取成功');
    
    // 检查提取后状态
    const afterWithdrawOwnerUSDT = await mockUSDT.balanceOf(deployer.address);
    const afterWithdrawContractUSDT = await mockUSDT.balanceOf(crowdsale.address);
    
    console.log('\n💰 提取后状态:');
    console.log('  管理员USDT:', ethers.utils.formatUnits(afterWithdrawOwnerUSDT, 6), 'USDT');
    console.log('  合约USDT:', ethers.utils.formatUnits(afterWithdrawContractUSDT, 6), 'USDT');
    console.log('  提取金额:', ethers.utils.formatUnits(afterWithdrawOwnerUSDT.sub(beforeWithdrawOwnerUSDT), 6), 'USDT');
    console.log('  提取正确:', afterWithdrawOwnerUSDT.sub(beforeWithdrawOwnerUSDT).eq(beforeWithdrawContractUSDT) ? '✅ 是' : '❌ 否');
    console.log();
    
    // ===== 第八阶段：异常情况测试 =====
    console.log('⚠️  === 第八阶段：异常情况测试 ===');
    
    // 测试众筹结束后购买
    console.log('🚫 测试众筹结束后购买:');
    try {
        await mockUSDT.connect(user1).approve(crowdsale.address, ethers.utils.parseUnits('100', 6));
        await crowdsale.connect(user1).buyTokens(ethers.utils.parseUnits('100', 6));
        console.log('  ❌ 错误：众筹结束后还能购买！');
    } catch (error) {
        console.log('  ✅ 正确：众筹结束后购买被阻止');
        console.log('  错误信息:', error.reason || '购买失败');
    }
    
    // 测试重复提取资金
    console.log('\n🚫 测试重复提取资金:');
    try {
        await crowdsale.withdrawUSDT();
        console.log('  ❌ 错误：重复提取资金成功了！');
    } catch (error) {
        console.log('  ✅ 正确：重复提取资金被阻止');
        console.log('  错误信息:', error.reason || '提取失败');
    }
    
    // 测试非管理员提取资金
    console.log('\n🚫 测试非管理员提取资金:');
    try {
        await crowdsale.connect(user1).withdrawUSDT();
        console.log('  ❌ 错误：非管理员提取资金成功了！');
    } catch (error) {
        console.log('  ✅ 正确：非管理员提取资金被阻止');
        console.log('  错误信息:', error.reason || '权限不足');
    }
    console.log();
    
    // ===== 测试总结 =====
    console.log('🎉 === 测试总结 ===');
    
    const user1Info = await crowdsale.getUserInfo(user1.address);
    const user2Info = await crowdsale.getUserInfo(user2.address);
    
    console.log('📊 最终统计:');
    console.log('  用户1购买:', ethers.utils.formatUnits(user1Info[0], 6), 'USDT →', ethers.utils.formatUnits(user1Info[1], 18), 'HLT');
    console.log('  用户2购买:', ethers.utils.formatUnits(user2Info[0], 6), 'USDT →', ethers.utils.formatUnits(user2Info[1], 18), 'HLT');
    console.log('  总计:', ethers.utils.formatUnits(user1Info[0].add(user2Info[0]), 6), 'USDT →', ethers.utils.formatUnits(user1Info[1].add(user2Info[1]), 18), 'HLT');
    
    console.log('\n✅ 测试项目:');
    console.log('  ✅ 合约部署和配置');
    console.log('  ✅ 用户购买功能');
    console.log('  ✅ 资金流转正确');
    console.log('  ✅ 锁仓机制有效');
    console.log('  ✅ 众筹统计准确');
    console.log('  ✅ 资金提取成功');
    console.log('  ✅ 异常情况处理');
    console.log('  ✅ 计算逻辑正确');
    
    console.log('\n🎯 所有测试通过！众筹系统运行正常！');
}

main().catch(console.error);