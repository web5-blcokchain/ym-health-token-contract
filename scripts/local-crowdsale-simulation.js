const { ethers, network } = require("hardhat");

async function main() {
  const [deployer, other, user1, user2, receiver] = await ethers.getSigners();
  console.log("部署者:", deployer.address);

  // 部署 MockUSDT
  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const usdt = await MockUSDT.deploy(deployer.address);
  await usdt.deployed?.();
  await usdt.waitForDeployment?.();

  // 部署 HLTToken
  const HLTToken = await ethers.getContractFactory("HLTToken");
  const token = await HLTToken.deploy("HealthLife Token", "HLT", deployer.address, other.address);
  await token.deployed?.();
  await token.waitForDeployment?.();

  // 部署 Crowdsale
  const Crowdsale = await ethers.getContractFactory("Crowdsale");
  const lockDuration = 3600; // 1小时
  const crowdsale = await Crowdsale.deploy(token.address ?? (await token.getAddress()), usdt.address ?? (await usdt.getAddress()), deployer.address, lockDuration);
  await crowdsale.deployed?.();
  await crowdsale.waitForDeployment?.();

  // 绑定 crowdsale 到 token
  await (await token.connect(deployer).setCrowdsaleContract(crowdsale.address ?? (await crowdsale.getAddress()))).wait();

  // 为 crowdsale 充值 HLT
  const saleFund = ethers.utils.parseUnits("1000000", 18);
  await (await token.connect(deployer).transfer(crowdsale.address ?? (await crowdsale.getAddress()), saleFund)).wait();

  // 开启众筹
  await (await crowdsale.connect(deployer).startCrowdsale()).wait();

  // 给 user1/user2 发 USDT 并授权
  const amt1 = ethers.utils.parseUnits("10", 6);
  const amt2 = ethers.utils.parseUnits("3.5", 6);
  await (await usdt.connect(deployer).mint(user1.address, amt1)).wait();
  await (await usdt.connect(deployer).mint(user2.address, amt2)).wait();
  await (await usdt.connect(user1).approve(crowdsale.address ?? (await crowdsale.getAddress()), amt1)).wait();
  await (await usdt.connect(user2).approve(crowdsale.address ?? (await crowdsale.getAddress()), amt2)).wait();

  // 购买
  await (await crowdsale.connect(user1).buyTokens(amt1)).wait();
  await (await crowdsale.connect(user2).buyTokens(amt2)).wait();

  // 验证余额立即到账
  const user1HLT = await token.balanceOf(user1.address);
  const user2HLT = await token.balanceOf(user2.address);
  console.log("user1 获得HLT:", ethers.utils.formatUnits(user1HLT, 18));
  console.log("user2 获得HLT:", ethers.utils.formatUnits(user2HLT, 18));

  // 验证锁仓条目
  const locks1 = await token.getLocks(user1.address);
  const locked1 = await token.getLockedAmount(user1.address);
  const unlocked1 = await token.getUnlockedAmount(user1.address);
  console.log("user1 锁仓条目数:", locks1.length, "locked:", ethers.utils.formatUnits(locked1, 18), "unlocked:", ethers.utils.formatUnits(unlocked1, 18));

  // 给 user1 额外发放非锁仓 HLT（模拟空投/奖励）
  const extra = ethers.utils.parseUnits("100", 18);
  await (await token.connect(deployer).transfer(user1.address, extra)).wait();
  const unlockedAfterExtra = await token.getUnlockedAmount(user1.address);
  console.log("user1 追加后可转出:", ethers.utils.formatUnits(unlockedAfterExtra, 18));

  // 在未解锁之前，user1 可以在 unlocked 范围内转账
  const transferAmt = ethers.utils.parseUnits("10", 18);
  await (await token.connect(user1).transfer(receiver.address, transferAmt)).wait();
  console.log("user1->receiver 转账 10 HLT 成功 (未解锁阶段)\n");

  // 超过 unlocked 尝试会失败
  const tryOver = user1HLT; // 当前等于锁仓金额
  try {
    await (await token.connect(user1).transfer(receiver.address, tryOver)).wait();
    console.log("[异常] 超额转账未失败");
  } catch {
    console.log("✅ 超额转账被拒绝（受锁仓限制）");
  }

  // 时间快进到解锁
  await network.provider.send("evm_increaseTime", [lockDuration + 1]);
  await network.provider.send("evm_mine");

  const lockedAfter = await token.getLockedAmount(user1.address);
  console.log("解锁后 user1 locked:", lockedAfter.toString());

  // 现在可以全部转账
  const full = await token.balanceOf(user1.address);
  await (await token.connect(user1).transfer(receiver.address, full)).wait();
  console.log("✅ 解锁后全额转账成功");
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { main };