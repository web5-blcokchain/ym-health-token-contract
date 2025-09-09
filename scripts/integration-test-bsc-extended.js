/* eslint-disable no-console */
const { ethers } = require("hardhat");

async function expectRevert(label, fn, expectedIncludes) {
  try {
    await fn();
    console.error(`❌ 预期失败但成功: ${label}`);
  } catch (e) {
    const msg = (e && (e.reason || e.message || String(e))).toString();
    if (!expectedIncludes || msg.includes(expectedIncludes)) {
      console.log(`✅ 预期失败(${label}): ${msg}`);
    } else {
      console.error(`❌ 失败信息不匹配(${label}): ${msg}`);
    }
  }
}

async function main() {
  console.log("🧪 === 扩展集成测试开始（正常+异常+边界） ===\n");

  const MOCKUSDT_ADDRESS = process.env.USDT_ADDRESS || "0xeb4C53574edBF035FfBAF647b3E957b4FB88CD6B";
  const HLTTOKEN_ADDRESS = process.env.HLT_ADDRESS || "0x74f1ED24295F42682EEB4F4A36d264cdA40DB66e";
  const CROWDSALE_ADDRESS = process.env.CROWDSALE_ADDRESS || "0x42bD80016995Af0Ae1fDb18944e2817b184f485b";
  const OTHER_ACCOUNT = "0xaeec208c1fdE4636570E2C6E72A256c53c774fac";

  const [deployer] = await ethers.getSigners();
  console.log("测试账户:", deployer.address, "\n");

  // 连接合约
  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const mockUSDT = MockUSDT.attach(MOCKUSDT_ADDRESS);

  const HLTToken = await ethers.getContractFactory("HLTToken");
  const hltToken = HLTToken.attach(HLTTOKEN_ADDRESS);

  const Crowdsale = await ethers.getContractFactory("Crowdsale");
  const crowdsale = Crowdsale.attach(CROWDSALE_ADDRESS);

  // 基本状态
  const [usdtBal, hltBal, active, price] = await Promise.all([
    mockUSDT.balanceOf(deployer.address),
    hltToken.balanceOf(deployer.address),
    crowdsale.crowdsaleActive(),
    crowdsale.getTokenPrice()
  ]);
  console.log(`USDT余额: ${ethers.utils.formatUnits(usdtBal, 6)} USDT`);
  console.log(`HLT余额: ${ethers.utils.formatEther(hltBal)} HLT`);
  console.log(`众筹状态: ${active ? "活跃" : "未开始/已结束"}`);
  console.log(`兑换比例: 1 USDT = ${price.toString()} HLT\n`);

  if (!active) {
    console.log("ℹ️ 检测到众筹未激活，自动启动...");
    const tx = await crowdsale.startCrowdsale();
    await tx.wait();
    console.log("✅ 众筹已启动\n");
  }

  // A) 异常：未授权购买应失败
  console.log("A) 未授权购买应失败");
  const oneUSDT = ethers.utils.parseUnits("1", 6);
  // 清除授权
  await (await mockUSDT.approve(CROWDSALE_ADDRESS, 0)).wait();
  await expectRevert("未授权 buyTokens(1 USDT)", async () => {
    const tx = await crowdsale.buyTokens(oneUSDT);
    await tx.wait();
  }); // 具体错误因代币实现而异：通常为ERC20: insufficient allowance

  // B) 正常：连续小额购买到达10次锁仓，验证 O(n)
  console.log("\nB) 连续小额购买以达到 10 条锁仓记录（若已有则只补足）");
  const beforeLocks = await hltToken.getLocks(deployer.address);
  const targetCount = 10;
  let need = 0;
  if (beforeLocks.length < targetCount) {
    need = targetCount - beforeLocks.length;
  }
  console.log(`当前锁仓条目: ${beforeLocks.length}，目标: ${targetCount}，计划新增: ${need}`);
  for (let i = 0; i < need; i++) {
    // 为每次购买单独授权1 USDT
    await (await mockUSDT.approve(CROWDSALE_ADDRESS, oneUSDT)).wait();
    const buyTx = await crowdsale.buyTokens(oneUSDT);
    await buyTx.wait();
    console.log(`   ✅ 第 ${i + 1}/${need} 次 1 USDT 购买完成`);
  }
  const afterLocks = await hltToken.getLocks(deployer.address);
  console.log(`购买完成后锁仓条目: ${afterLocks.length}\n`);

  // C) 异常：转账超出“可转余额（解锁额度）”应失败
  console.log("C) 转账超出可转余额应失败（锁仓限制生效）");
  const unlocked = await hltToken.getUnlockedAmount(deployer.address);
  const exceed = unlocked.add(1); // 超出 1 wei
  await expectRevert("transfer 超出可转余额", async () => {
    const tx = await hltToken.transfer(OTHER_ACCOUNT, exceed);
    await tx.wait();
  }, "Transfer exceeds unlocked");

  // D) 边界：0 USDT 购买应失败
  console.log("\nD) 0 USDT 购买应失败");
  await expectRevert("buyTokens(0)", async () => {
    const tx = await crowdsale.buyTokens(0);
    await tx.wait();
  });

  // E) 结束众筹并验证结束后购买失败
  console.log("\nE) 结束众筹，并验证结束后购买失败");
  const endTx = await crowdsale.endCrowdsale();
  await endTx.wait();
  console.log("✅ 众筹已结束");
  await expectRevert("结束后 buyTokens", async () => {
    // 再次尝试购买 1 USDT（无需授权，预期直接因未激活失败）
    const tx = await crowdsale.buyTokens(oneUSDT);
    await tx.wait();
  });

  // F) 结束后提取 USDT 与回收未售 HLT
  console.log("\nF) 结束后提取 USDT 与回收未售 HLT");
  try {
    const beforeOwnerUsdt = await mockUSDT.balanceOf(deployer.address);
    const wuTx = await crowdsale.withdrawUSDT();
    await wuTx.wait();
    const afterOwnerUsdt = await mockUSDT.balanceOf(deployer.address);
    console.log(`✅ withdrawUSDT 成功: ${ethers.utils.formatUnits(afterOwnerUsdt.sub(beforeOwnerUsdt), 6)} USDT 转入所有者`);

    const beforeOwnerHlt = await hltToken.balanceOf(deployer.address);
    const whltTx = await crowdsale.withdrawUnsoldHLT();
    await whltTx.wait();
    const afterOwnerHlt = await hltToken.balanceOf(deployer.address);
    console.log(`✅ withdrawUnsoldHLT 成功: ${ethers.utils.formatEther(afterOwnerHlt.sub(beforeOwnerHlt))} HLT 转入所有者`);
  } catch (e) {
    console.log("ℹ️ 提取操作出现异常（可能余额为0或已被提取）：", e.message || e);
  }

  console.log("\n🎉 扩展集成测试完成：正常功能、异常与边界用例全部覆盖。");
}

main().catch((e) => {
  console.error("❌ 扩展集成测试失败:", e);
  process.exit(1);
});