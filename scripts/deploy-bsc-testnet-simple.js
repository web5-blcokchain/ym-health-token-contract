const { ethers, network, run } = require("hardhat");
require("dotenv").config();

async function main() {
  const tokenName = process.env.TOKEN_NAME || "HealthLife Token";
  const tokenSymbol = process.env.TOKEN_SYMBOL || "HLT";
  let usdtAddress = process.env.USDT_ADDRESS; // 若未设置且为 bscTestnet，则使用固定 MockUSDT

  // 依据网络选择锁仓时长默认值：测试网=1h，主网=365d
  const ONE_HOUR = 3600;
  const ONE_YEAR = 365 * 24 * 3600;
  let lockDuration;
  if (process.env.CROWDSALE_LOCK_DURATION) {
    lockDuration = parseInt(process.env.CROWDSALE_LOCK_DURATION, 10);
  } else if (network.name === "bscMainnet" || network.name === "mainnet") {
    lockDuration = ONE_YEAR;
    console.log(`[提示] 未提供 CROWDSALE_LOCK_DURATION，检测到网络 ${network.name}，已使用默认锁仓 365 天 (${ONE_YEAR} 秒)`);
  } else {
    lockDuration = ONE_HOUR;
    console.log(`[提示] 未提供 CROWDSALE_LOCK_DURATION，检测到网络 ${network.name}，已使用默认锁仓 1 小时 (${ONE_HOUR} 秒)`);
  }

  const saleFundAmount = process.env.SALE_FUND_AMOUNT || "1000000"; // 预充值给众筹的 HLT 数量（整数，单位=HLT）

  // 测试网默认 USDT 地址（用户指定的早期 MockUSDT 地址）
  const TESTNET_DEFAULT_USDT = "0xeb4C53574edBF035FfBAF647b3E957b4FB88CD6B";

  if (!usdtAddress && network.name === "bscTestnet") {
    usdtAddress = TESTNET_DEFAULT_USDT;
    console.log(`[提示] 未提供 USDT_ADDRESS，检测到网络 ${network.name}，已使用默认 MockUSDT: ${usdtAddress}`);
  }

  if (!usdtAddress) {
    throw new Error("缺少 USDT_ADDRESS 环境变量（主网/其他网络必须显式提供）");
  }

  const [deployer] = await ethers.getSigners();
  console.log("部署者:", deployer.address);
  console.log("网络:", network.name);
  const lockInfo = lockDuration === ONE_HOUR ? "(测试默认1小时)" : lockDuration === ONE_YEAR ? "(正式建议365天)" : "";
  console.log(`锁仓时长: ${lockDuration} 秒 ${lockInfo}`);

  if ((network.name === "bscMainnet" || network.name === "mainnet") && lockDuration < ONE_YEAR) {
    console.warn("[警告] 当前为主网部署，但锁仓时长 < 365 天，请确认是否符合上线策略！");
  }

  // 处理 otherAccount（固定地址，需与 owner 不同且非零）
  const FIXED_OTHER_ACCOUNT = "0xaeec208c1fdE4636570E2C6E72A256c53c774fac";
  const otherAccount = FIXED_OTHER_ACCOUNT;
  if (otherAccount.toLowerCase() === deployer.address.toLowerCase()) {
    throw new Error("OTHER_ACCOUNT 固定地址与部署者地址相同，请更换部署者私钥或调整策略。");
  }
  console.log("使用固定 OTHER_ACCOUNT:", otherAccount);

  try {
    console.log("=== 部署 HLTToken 合约 ===");
    const HLTToken = await ethers.getContractFactory("HLTToken");
    console.log("正在部署 HLTToken...");

    const hltToken = await HLTToken.deploy(
      tokenName,
      tokenSymbol,
      deployer.address,
      otherAccount // 接收 OTHER_AMOUNT 的账号（需与 owner 不同）
    );

    console.log("等待交易确认...");
    await hltToken.deployed();
    const hltTokenAddress = hltToken.address;
    console.log("✅ HLTToken 部署成功，地址:", hltTokenAddress);

    console.log("\n=== 部署 Crowdsale 合约 ===");
    const Crowdsale = await ethers.getContractFactory("Crowdsale");
    console.log("正在部署 Crowdsale...");

    const crowdsale = await Crowdsale.deploy(
      hltTokenAddress,
      usdtAddress,
      deployer.address,
      lockDuration
    );

    console.log("等待交易确认...");
    await crowdsale.deployed();
    const crowdsaleAddress = crowdsale.address;
    console.log("✅ Crowdsale 部署成功，地址:", crowdsaleAddress);

    console.log("\n=== 绑定众筹合约到代币（setCrowdsaleContract） ===");
    await (await hltToken.connect(deployer).setCrowdsaleContract(crowdsaleAddress)).wait();
    console.log("✅ 已设置 crowdsaleContract ->", crowdsaleAddress);

    // 给众筹合约转入待售代币额度
    const saleFundWei = ethers.utils.parseUnits(saleFundAmount, 18);
    console.log(`\n=== 为 Crowdsale 合约充值待售 HLT：${saleFundAmount} HLT ===`);
    await (await hltToken.connect(deployer).transfer(crowdsaleAddress, saleFundWei)).wait();
    console.log("✅ 已向 Crowdsale 转入 HLT，金额:", saleFundAmount, "HLT");

    console.log("\n合约地址信息：");
    console.log("HLTToken:", hltTokenAddress);
    console.log("Crowdsale:", crowdsaleAddress);
    console.log("USDT:", usdtAddress);
    console.log("OTHER_ACCOUNT:", otherAccount);

    console.log("\n验证命令参考：");
    console.log(`npx hardhat verify --network ${network.name} ${hltTokenAddress} "${tokenName}" "${tokenSymbol}" ${deployer.address} ${otherAccount}`);
    console.log(`npx hardhat verify --network ${network.name} ${crowdsaleAddress} ${hltTokenAddress} ${usdtAddress} ${deployer.address} ${lockDuration}`);

  } catch (e) {
    console.error("部署失败:", e);
    process.exit(1);
  }
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main };