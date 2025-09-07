// 本地众筹流程完整模拟测试
const { ethers, network } = require('hardhat');

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

  // 部署LockVault
  const LockVault = await ethers.getContractFactory('LockVault');
  const vault = await LockVault.deploy(hltToken.address, deployer.address);
  await vault.deployed();
  console.log('✅ LockVault部署成功:', vault.address);

  // 部署众筹合约（本地默认锁仓 1 小时，便于验证）
  const Crowdsale = await ethers.getContractFactory('Crowdsale');
  const localLockDuration = 3600; // 1小时
  const crowdsale = await Crowdsale.deploy(hltToken.address, mockUSDT.address, deployer.address, localLockDuration);
  await crowdsale.deployed();
  console.log('✅ Crowdsale部署成功:', crowdsale.address, `(锁仓时长: ${localLockDuration}s)`);

  // 配置合约
  await hltToken.setCrowdsaleContract(crowdsale.address);
  const saleAmount = await hltToken.SALE_AMOUNT();
  await hltToken.transfer(crowdsale.address, saleAmount);
  console.log('✅ 合约配置完成\n');

  // 互相配置 Vault 与 Crowdsale
  await crowdsale.setVault(vault.address);
  await vault.setCrowdsale(crowdsale.address);
  console.log('🔗 已完成 Crowdsale ↔ Vault 绑定\n');

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
  console.log('  Vault地址:', vault.address);
  console.log('  Vault HLT余额:', ethers.utils.formatUnits(await hltToken.balanceOf(vault.address), 18), 'HLT');
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
  console.log('  获得HLT(应为0，资产进入Vault):', ethers.utils.formatUnits(user1HLT, 18), 'HLT');
  console.log('  Vault收到HLT:', ethers.utils.formatUnits(await hltToken.balanceOf(vault.address), 18), 'HLT');

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
  console.log('  获得HLT(应为0，资产进入Vault):', ethers.utils.formatUnits(user2HLT, 18), 'HLT');
  console.log();

  // ===== 第五阶段：锁仓机制测试（基于 LockVault） =====
  console.log('🔒 === 第五阶段：锁仓机制测试（LockVault） ===');
  // 查看用户1的锁仓明细与可领取/剩余时间
  const schedules1 = await vault.schedulesOf(user1.address);
  if (schedules1.length > 0) {
    const s = schedules1[0];
    console.log('👤 用户1锁仓信息:');
    console.log('  锁仓开始:', new Date(Number(s.start) * 1000).toLocaleString());
    console.log('  解锁时间:', new Date(Number(s.unlock) * 1000).toLocaleString());
    const locked1 = await vault.getLockedBalance(user1.address);
    const claimable1 = await vault.getClaimable(user1.address);
    const remaining1 = await vault.getRemainingLockTime(user1.address);
    console.log('  剩余未释放:', ethers.utils.formatUnits(locked1, 18), 'HLT');
    console.log('  当前可领取:', ethers.utils.formatUnits(claimable1, 18), 'HLT');
    console.log('  剩余秒数:', remaining1.toString(), '秒');
  } else {
    console.log('  ⚠️ 未找到用户1的锁仓记录');
  }
  // 尝试在未到期前领取，应失败
  console.log('\n🚫 测试未到期领取（应失败）:');
  try {
    await vault.connect(user1).claimAll();
    console.log('  ❌ 错误：未到期领取成功了！');
  } catch (error) {
    console.log('  ✅ 正确：未到期领取被阻止');
    console.log('  错误信息:', error.reason || '领取失败');
  }
  console.log();

  // ===== 第六阶段：众筹统计验证 =====
  console.log('📈 === 第六阶段：众筹统计验证 ===');

  const finalStatus = await crowdsale.getCrowdsaleStatus();
  const totalPurchased = user1PurchaseAmount.add(user2PurchaseAmount);
  const expectedHLT = totalPurchased
    .mul(await crowdsale.tokensPerUSDT())
    .mul(ethers.utils.parseUnits('1', 18))
    .div(ethers.utils.parseUnits('1', 6));

  console.log('📊 众筹统计:');
  console.log('  总筹集USDT:', ethers.utils.formatUnits(finalStatus[4], 6), 'USDT');
  console.log('  预期USDT:', ethers.utils.formatUnits(totalPurchased, 6), 'USDT');
  console.log('  总售出HLT:', ethers.utils.formatUnits(finalStatus[5], 18), 'HLT');
  console.log('  预期HLT:', ethers.utils.formatUnits(expectedHLT, 18), 'HLT');
  console.log('  参与人数:', finalStatus[6].toString());

  // 检查合约资金状态
  const contractUSDTBalance = await mockUSDT.balanceOf(crowdsale.address);
  const contractHLTBalance = await hltToken.balanceOf(crowdsale.address);

  console.log('\n🏦 合约资金状态:');
  console.log('  合约USDT余额:', ethers.utils.formatUnits(contractUSDTBalance, 6), 'USDT');
  console.log('  合约HLT余额:', ethers.utils.formatUnits(contractHLTBalance, 18), 'HLT');
  console.log('  Vault HLT余额:', ethers.utils.formatUnits(await hltToken.balanceOf(vault.address), 18), 'HLT');
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

  // ===== 第八阶段：时间推进并领取（本地） =====
  console.log('⏩ === 第八阶段：时间推进并领取（本地） ===');
  const ONE_YEAR = 365 * 24 * 60 * 60;
  // 将本地 EVM 时间向前推进 370 天（为了模拟主网长锁仓）。如需测试 1 小时，请改用 3600。
  await network.provider.send('evm_increaseTime', [ONE_YEAR + 24 * 60 * 60 + 1]);
  await network.provider.send('evm_mine');

  const user1Claimable = await vault.getClaimable(user1.address);
  console.log('  用户1可领取:', ethers.utils.formatUnits(user1Claimable, 18), 'HLT');

  await vault.connect(user1).claimAll();
  console.log('✅ 用户1已领取全部');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});