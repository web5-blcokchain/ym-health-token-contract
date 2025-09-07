// 验证合约修复后的功能
const { ethers } = require('hardhat');

async function main() {
    console.log('🔍 === 验证合约修复后的功能 ===\n');
    
    // 获取签名者
    const [deployer, user1] = await ethers.getSigners();
    
    console.log('👥 测试账户:');
    console.log('  管理员:', deployer.address);
    console.log('  用户1:', user1.address);
    console.log();
    
    // 部署合约
    console.log('🚀 部署合约...');
    
    const HLTToken = await ethers.getContractFactory('HLTToken');
    const hltToken = await HLTToken.deploy('HealthLife Token', 'HLT', deployer.address, user1.address); // deployer作为众筹合约地址，user1作为otherAccount
    await hltToken.deployed();
    
    const MockUSDT = await ethers.getContractFactory('MockUSDT');
    const mockUSDT = await MockUSDT.deploy(deployer.address);
    await mockUSDT.deployed();
    
    const Crowdsale = await ethers.getContractFactory('Crowdsale');
    const lockDuration = 3600; // 1小时，便于本地/验证
    const crowdsale = await Crowdsale.deploy(hltToken.address, mockUSDT.address, deployer.address, lockDuration);
    await crowdsale.deployed();
    
    console.log('✅ 合约部署完成\n');
    
    // 测试1: 验证calculateHLTAmount函数修复
    console.log('🧮 === 测试1: 验证calculateHLTAmount函数修复 ===');
    
    const testUSDTAmounts = [
        ethers.utils.parseUnits('1', 6),      // 1 USDT
        ethers.utils.parseUnits('100', 6),    // 100 USDT
        ethers.utils.parseUnits('1000', 6),   // 1000 USDT
    ];
    
    for (const usdtAmount of testUSDTAmounts) {
        const calculatedHLT = await crowdsale.calculateHLTAmount(usdtAmount);
        // 正确的预期计算：(usdtAmount * 12 * 1e18) / 1e6
        const expectedHLT = usdtAmount.mul(12).mul(ethers.utils.parseUnits('1', 18)).div(ethers.utils.parseUnits('1', 6));
        
        console.log(`USDT: ${ethers.utils.formatUnits(usdtAmount, 6)}`);
        console.log(`  计算结果: ${ethers.utils.formatEther(calculatedHLT)} HLT`);
        console.log(`  预期结果: ${ethers.utils.formatEther(expectedHLT)} HLT`);
        console.log(`  是否一致: ${calculatedHLT.eq(expectedHLT) ? '✅' : '❌'}`);
        console.log();
    }
    
    // 测试2: 验证calculateUSDTAmount函数修复
    console.log('🧮 === 测试2: 验证calculateUSDTAmount函数修复 ===');
    
    const testHLTAmounts = [
        ethers.utils.parseEther('12'),     // 12 HLT
        ethers.utils.parseEther('1200'),   // 1200 HLT
        ethers.utils.parseEther('12000'),  // 12000 HLT
    ];
    
    for (const hltAmount of testHLTAmounts) {
        const calculatedUSDT = await crowdsale.calculateUSDTAmount(hltAmount);
        // 正确的预期计算：(hltAmount * 1e6) / (12 * 1e18)
        const expectedUSDT = hltAmount.mul(ethers.utils.parseUnits('1', 6)).div(ethers.utils.parseEther('12'));
        
        console.log(`HLT: ${ethers.utils.formatEther(hltAmount)}`);
        console.log(`  计算结果: ${ethers.utils.formatUnits(calculatedUSDT, 6)} USDT`);
        console.log(`  预期结果: ${ethers.utils.formatUnits(expectedUSDT, 6)} USDT`);
        console.log(`  是否一致: ${calculatedUSDT.eq(expectedUSDT) ? '✅' : '❌'}`);
        console.log();
    }
    
    // 测试3: 验证buyTokens与calculateHLTAmount的一致性
    console.log('🔄 === 测试3: 验证buyTokens与calculateHLTAmount的一致性 ===');
    
    // 配置合约
    await hltToken.setCrowdsaleContract(crowdsale.address);
    const saleAmount = await hltToken.SALE_AMOUNT();
    await hltToken.transfer(crowdsale.address, saleAmount);
    
    // 给用户铸造USDT
    const userUSDTAmount = ethers.utils.parseUnits('1000', 6);
    await mockUSDT.mint(user1.address, userUSDTAmount);
    await mockUSDT.connect(user1).approve(crowdsale.address, userUSDTAmount);
    
    // 开始众筹
    await crowdsale.startCrowdsale();
    
    const purchaseAmount = ethers.utils.parseUnits('100', 6); // 100 USDT
    const predictedHLT = await crowdsale.calculateHLTAmount(purchaseAmount);
    
    console.log(`购买金额: ${ethers.utils.formatUnits(purchaseAmount, 6)} USDT`);
    console.log(`预计获得: ${ethers.utils.formatEther(predictedHLT)} HLT`);
    
    // 执行购买
    const balanceBefore = await hltToken.balanceOf(user1.address);
    await crowdsale.connect(user1).buyTokens(purchaseAmount);
    const balanceAfter = await hltToken.balanceOf(user1.address);
    
    const actualHLT = balanceAfter.sub(balanceBefore);
    
    console.log(`实际获得: ${ethers.utils.formatEther(actualHLT)} HLT`);
    console.log(`计算一致: ${predictedHLT.eq(actualHLT) ? '✅' : '❌'}`);
    console.log();
    
    // 测试4: 验证transferOtherTokens修复
    console.log('🔄 === 测试4: 验证transferOtherTokens修复 ===');
    
    // 检查owner是否被锁仓（如果参与了众筹）（otherAccount已在构造函数中设置为user1）
    const ownerLocked = await hltToken.isUserLocked(deployer.address);
    console.log(`Owner锁仓状态: ${ownerLocked ? '🔒 已锁仓' : '🔓 未锁仓'}`);
    
    // 尝试转移其他代币
    try {
        const otherBalanceBefore = await hltToken.balanceOf(user1.address);
        const expectedOtherAmount = await hltToken.OTHER_AMOUNT();
        
        await hltToken.transferOtherTokens();
        
        const otherBalanceAfter = await hltToken.balanceOf(user1.address);
        const actualTransferred = otherBalanceAfter.sub(otherBalanceBefore);
        
        console.log(`转移数量: ${ethers.utils.formatEther(actualTransferred)} HLT`);
        console.log(`预期数量: ${ethers.utils.formatEther(expectedOtherAmount)} HLT`);
        console.log(`转移成功: ${actualTransferred.eq(expectedOtherAmount) ? '✅' : '❌'}`);
    } catch (error) {
        console.log(`❌ 转移失败: ${error.message}`);
    }
    
    console.log();
    console.log('🎉 === 验证完成 ===');
}

main().catch(console.error);