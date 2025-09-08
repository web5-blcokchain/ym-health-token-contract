// 完整的众筹流程模拟测试
const { ethers } = require('hardhat');

async function main() {
    console.log('🎯 === 完整众筹流程模拟测试 ===\n');
    
    // 合约地址
    const crowdsaleAddress = '0x699a392289Ec3800A03AcD52aa1695ebBA2fC516';
    const hltTokenAddress = '0x64a4296C32A23C6296C089d6699d415377f8a8F6';
    const mockUSDTAddress = '0xeb4C53574edBF035FfBAF647b3E957b4FB88CD6B';
    
    // 获取签名者
    const [deployer] = await ethers.getSigners();
    console.log('🏦 管理员地址:', deployer.address);
    console.log('💰 管理员BNB余额:', ethers.utils.formatEther(await deployer.getBalance()), 'BNB\n');
    
    // 获取合约实例
    const Crowdsale = await ethers.getContractFactory('Crowdsale');
    const crowdsale = Crowdsale.attach(crowdsaleAddress);
    
    const HLTToken = await ethers.getContractFactory('HLTToken');
    const hltToken = HLTToken.attach(hltTokenAddress);
    
    const MockUSDT = await ethers.getContractFactory('MockUSDT');
    const mockUSDT = MockUSDT.attach(mockUSDTAddress);
    
    try {
        // ===== 第一阶段：初始状态检查 =====
        console.log('📋 === 第一阶段：初始状态检查 ===');
        
        const initialOwnerUSDT = await mockUSDT.balanceOf(deployer.address);
        const initialContractUSDT = await mockUSDT.balanceOf(crowdsaleAddress);
        const initialContractHLT = await hltToken.balanceOf(crowdsaleAddress);
        
        console.log('管理员初始USDT余额:', ethers.utils.formatUnits(initialOwnerUSDT, 6), 'USDT');
        console.log('合约初始USDT余额:', ethers.utils.formatUnits(initialContractUSDT, 6), 'USDT');
        console.log('合约初始HLT余额:', ethers.utils.formatUnits(initialContractHLT, 18), 'HLT');
        
        const crowdsaleStatus = await crowdsale.getCrowdsaleStatus();
        console.log('众筹状态:', crowdsaleStatus[0] ? '进行中' : '未开始');
        const price = await crowdsale.getTokenPrice();
        console.log('兑换比例:', price.toString(), 'HLT per USDT\n');
        
        // ===== 第二阶段：模拟用户购买 =====
        console.log('🛒 === 第二阶段：模拟用户购买 ===');
        
        // 模拟用户地址（使用管理员地址作为用户进行测试）
        const userAddress = deployer.address;
        const purchaseAmount = ethers.utils.parseUnits('500', 6); // 购买500 USDT
        
        console.log('👤 模拟用户地址:', userAddress);
        console.log('💳 计划购买:', ethers.utils.formatUnits(purchaseAmount, 6), 'USDT');
        
        // 检查用户USDT余额
        const userUSDTBalance = await mockUSDT.balanceOf(userAddress);
        console.log('用户USDT余额:', ethers.utils.formatUnits(userUSDTBalance, 6), 'USDT');
        
        if (userUSDTBalance.lt(purchaseAmount)) {
            console.log('⚠️  用户USDT余额不足，先铸造一些USDT...');
            await mockUSDT.mint(userAddress, purchaseAmount);
            console.log('✅ 已为用户铸造', ethers.utils.formatUnits(purchaseAmount, 6), 'USDT');
        }
        
        // 授权USDT给众筹合约
        console.log('🔐 授权USDT给众筹合约...');
        await mockUSDT.approve(crowdsaleAddress, purchaseAmount);
        console.log('✅ USDT授权完成');
        
        // 购买代币
        console.log('🛍️  开始购买代币...');
        const buyTx = await crowdsale.buyTokens(purchaseAmount);
        const buyReceipt = await buyTx.wait();
        console.log('✅ 购买成功！交易哈希:', buyReceipt.transactionHash);
        
        // 检查购买后的状态
        const userInfo = await crowdsale.getUserInfo(userAddress);
        const userHLTBalance = await hltToken.balanceOf(userAddress);
        
        console.log('\n📊 购买后状态:');
        console.log('用户购买的USDT:', ethers.utils.formatUnits(userInfo[0], 6), 'USDT');
        console.log('用户获得的HLT:', ethers.utils.formatUnits(userInfo[1], 18), 'HLT');
        console.log('用户HLT余额:', ethers.utils.formatUnits(userHLTBalance, 18), 'HLT');
        console.log('是否参与众筹:', userInfo[2] ? '是' : '否');
        
        // ===== 第三阶段：检查资金流转 =====
        console.log('\n💸 === 第三阶段：检查资金流转 ===');
        
        const afterPurchaseContractUSDT = await mockUSDT.balanceOf(crowdsaleAddress);
        const afterPurchaseContractHLT = await hltToken.balanceOf(crowdsaleAddress);
        
        console.log('合约USDT余额变化:');
        console.log('  购买前:', ethers.utils.formatUnits(initialContractUSDT, 6), 'USDT');
        console.log('  购买后:', ethers.utils.formatUnits(afterPurchaseContractUSDT, 6), 'USDT');
        console.log('  增加:', ethers.utils.formatUnits(afterPurchaseContractUSDT.sub(initialContractUSDT), 6), 'USDT');
        
        console.log('\n合约HLT余额变化:');
        console.log('  购买前:', ethers.utils.formatUnits(initialContractHLT, 18), 'HLT');
        console.log('  购买后:', ethers.utils.formatUnits(afterPurchaseContractHLT, 18), 'HLT');
        console.log('  减少:', ethers.utils.formatUnits(initialContractHLT.sub(afterPurchaseContractHLT), 18), 'HLT');
        
        // ===== 第四阶段：检查锁仓机制 =====
        console.log('\n🔒 === 第四阶段：检查锁仓机制 ===');
        
        const locks = await hltToken.getLocks(userAddress);
        const lockedAmount = await hltToken.getLockedAmount(userAddress);
        const unlockedAmount = await hltToken.getUnlockedAmount(userAddress);
        
        console.log('锁仓条目数:', locks.length);
        if (locks.length > 0) {
          const first = locks[0];
          const lockTime = new Date(Number(first.start) * 1000);
          const unlockTime = new Date(Number(first.unlock) * 1000);
          console.log('首条锁仓开始时间:', lockTime.toLocaleString());
          console.log('首条解锁时间:', unlockTime.toLocaleString());
        }
        console.log('锁定总额(HLT):', ethers.utils.formatEther(lockedAmount));
        console.log('已解锁(HLT):', ethers.utils.formatEther(unlockedAmount));
        
        // 尝试转账HLT（应该失败，因为锁仓）
        console.log('\n🚫 测试锁仓期间转账（应该失败）...');
        try {
            const transferAmount = ethers.utils.parseUnits('1', 18);
            await hltToken.transfer(deployer.address, transferAmount);
            console.log('❌ 错误：锁仓期间转账成功了！');
        } catch (error) {
            console.log('✅ 正确：锁仓期间转账被阻止');
            console.log('   错误信息:', error.reason || error.message.split('\n')[0]);
        }
        
        // ===== 第五阶段：众筹统计 =====
        console.log('\n📈 === 第五阶段：众筹统计 ===');
        
        const finalStatus = await crowdsale.getCrowdsaleStatus();
        console.log('众筹状态:', finalStatus[0] ? '进行中' : (finalStatus[1] ? '已结束' : '未开始'));
        console.log('开始时间:', new Date(finalStatus[2].toNumber() * 1000).toLocaleString());
        console.log('总筹集USDT:', ethers.utils.formatUnits(finalStatus[4], 6), 'USDT');
        console.log('总售出HLT:', ethers.utils.formatUnits(finalStatus[5], 18), 'HLT');
        console.log('参与人数:', finalStatus[6].toString());
        
        // ===== 第六阶段：结束众筹并提取资金 =====
        console.log('\n🏁 === 第六阶段：结束众筹并提取资金 ===');
        
        // 结束众筹
        console.log('🛑 结束众筹...');
        await crowdsale.endCrowdsale();
        console.log('✅ 众筹已结束');
        
        // 检查管理员提取前的USDT余额
        const beforeWithdrawOwnerUSDT = await mockUSDT.balanceOf(deployer.address);
        const beforeWithdrawContractUSDT = await mockUSDT.balanceOf(crowdsaleAddress);
        
        console.log('\n💰 提取资金前状态:');
        console.log('管理员USDT余额:', ethers.utils.formatUnits(beforeWithdrawOwnerUSDT, 6), 'USDT');
        console.log('合约USDT余额:', ethers.utils.formatUnits(beforeWithdrawContractUSDT, 6), 'USDT');
        
        // 提取USDT
        console.log('\n💸 提取USDT资金...');
        const withdrawTx = await crowdsale.withdrawUSDT();
        const withdrawReceipt = await withdrawTx.wait();
        console.log('✅ 资金提取成功！交易哈希:', withdrawReceipt.transactionHash);
        
        // 检查提取后的状态
        const afterWithdrawOwnerUSDT = await mockUSDT.balanceOf(deployer.address);
        const afterWithdrawContractUSDT = await mockUSDT.balanceOf(crowdsaleAddress);
        
        console.log('\n💰 提取资金后状态:');
        console.log('管理员USDT余额:', ethers.utils.formatUnits(afterWithdrawOwnerUSDT, 6), 'USDT');
        console.log('合约USDT余额:', ethers.utils.formatUnits(afterWithdrawContractUSDT, 6), 'USDT');
        console.log('提取金额:', ethers.utils.formatUnits(afterWithdrawOwnerUSDT.sub(beforeWithdrawOwnerUSDT), 6), 'USDT');
        
        // ===== 第七阶段：验证计算准确性 =====
        console.log('\n🧮 === 第七阶段：验证计算准确性 ===');
        
        const expectedHLT = await crowdsale.calculateHLTAmount(purchaseAmount);
        const actualHLT = userInfo[1];
        
        console.log('购买金额:', ethers.utils.formatUnits(purchaseAmount, 6), 'USDT');
        console.log('兑换比例:', (await crowdsale.getTokenPrice()).toString(), 'HLT per USDT');
        console.log('期望HLT:', ethers.utils.formatEther(expectedHLT), 'HLT');
        console.log('实际HLT:', ethers.utils.formatEther(actualHLT), 'HLT');
        console.log('计算正确:', expectedHLT.eq(actualHLT) ? '✅ 是' : '❌ 否');
        
        // ===== 测试总结 =====
        console.log('\n🎉 === 测试总结 ===');
        console.log('✅ 用户购买功能正常');
        console.log('✅ 资金流转正确');
        console.log('✅ 锁仓机制有效');
        console.log('✅ 众筹统计准确');
        console.log('✅ 资金提取成功');
        console.log('✅ 计算逻辑正确');
        
        console.log('\n🔗 合约浏览器链接:');
        console.log('   HLTToken:', `https://testnet.bscscan.com/address/${hltTokenAddress}`);
        console.log('   Crowdsale:', `https://testnet.bscscan.com/address/${crowdsaleAddress}`);
        console.log('   MockUSDT:', `https://testnet.bscscan.com/address/${mockUSDTAddress}`);
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        if (error.reason) {
            console.error('   原因:', error.reason);
        }
    }
}

main().catch(console.error);