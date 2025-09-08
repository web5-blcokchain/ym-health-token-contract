const { ethers } = require("hardhat");

async function main() {
  console.log("🏁 === 结束众筹并提取USDT（BSC Testnet）===\n");

  const CROWDSALE_ADDRESS = process.env.CROWDSALE_ADDRESS;
  const USDT_ADDRESS = process.env.USDT_ADDRESS;

  if (!CROWDSALE_ADDRESS || !USDT_ADDRESS) {
    throw new Error("请设置环境变量 CROWDSALE_ADDRESS 和 USDT_ADDRESS");
  }

  const [deployer] = await ethers.getSigners();
  console.log("执行账户:", deployer.address);

  const Crowdsale = await ethers.getContractFactory("Crowdsale");
  const crowdsale = Crowdsale.attach(CROWDSALE_ADDRESS);

  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const usdt = MockUSDT.attach(USDT_ADDRESS);

  // 读取初始余额
  const beforeDeployerUSDT = await usdt.balanceOf(deployer.address);
  const beforeCrowdsaleUSDT = await usdt.balanceOf(CROWDSALE_ADDRESS);

  console.log("\n初始余额:");
  console.log("  Deployer USDT:", ethers.utils.formatUnits(beforeDeployerUSDT, 6));
  console.log("  Crowdsale USDT:", ethers.utils.formatUnits(beforeCrowdsaleUSDT, 6));

  // 若众筹仍在进行，先结束众筹
  const active = await crowdsale.crowdsaleActive();
  const ended = await crowdsale.crowdsaleEnded();
  if (active && !ended) {
    console.log("\n⏹️ 众筹进行中，执行 endCrowdsale...");
    const tx = await crowdsale.endCrowdsale();
    await tx.wait();
    console.log("✅ 众筹已结束");
  } else {
    console.log("\nℹ️ 众筹状态: active=", active, ", ended=", ended, "（无需结束或已结束）");
  }

  // 提取USDT
  console.log("\n💼 执行 withdrawUSDT...");
  const wtx = await crowdsale.withdrawUSDT();
  const receipt = await wtx.wait();
  console.log("✅ 提取完成，交易哈希:", receipt.transactionHash);

  const afterDeployerUSDT = await usdt.balanceOf(deployer.address);
  const afterCrowdsaleUSDT = await usdt.balanceOf(CROWDSALE_ADDRESS);

  console.log("\n结果余额:");
  console.log("  Deployer USDT:", ethers.utils.formatUnits(afterDeployerUSDT, 6));
  console.log("  Crowdsale USDT:", ethers.utils.formatUnits(afterCrowdsaleUSDT, 6));

  const delta = afterDeployerUSDT.sub(beforeDeployerUSDT);
  console.log("\n📈 本次提取金额:", ethers.utils.formatUnits(delta, 6), "USDT");

  console.log("\n🎉 完成");
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch((err) => {
    console.error("❌ 执行失败:", err);
    process.exit(1);
  });
}

module.exports = { main };