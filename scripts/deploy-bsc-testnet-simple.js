const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 === 开始部署到 BSC 测试网 ===\n");

    // 获取部署账户
    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    console.log("账户余额:", ethers.utils.formatEther(await deployer.getBalance()), "BNB\n");

    // BSC测试网配置
    const tokenName = "HealthLife Token";
    const tokenSymbol = "HLT";
    // 允许通过环境变量覆盖 USDT 地址
    const usdtAddress = process.env.USDT_ADDRESS || "0xeb4C53574edBF035FfBAF647b3E957b4FB88CD6B"; // MockUSDT deployed on BSC Testnet
    console.log("使用的 USDT 地址:", usdtAddress, process.env.USDT_ADDRESS ? "(来自环境变量 USDT_ADDRESS)" : "(使用脚本内置 MockUSDT 地址)");
    // 使用一个不同的地址作为其他账号（接收7600万代币）
    const otherAccountAddress = process.env.OTHER_ACCOUNT_ADDRESS || "0x620bdC24abCf45F8Ea1D99fEF2EC5Aae7CD300A7";

    try {
        console.log("=== 部署 HLTToken 合约 ===");
        const HLTToken = await ethers.getContractFactory("HLTToken");
        console.log("正在部署 HLTToken...");
        
        const hltToken = await HLTToken.deploy(
            tokenName,
            tokenSymbol,
            deployer.address,
            otherAccountAddress
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
            deployer.address
        );
        
        console.log("等待交易确认...");
        await crowdsale.deployed();
        const crowdsaleAddress = crowdsale.address;
        console.log("✅ Crowdsale 部署成功，地址:", crowdsaleAddress);

        // 新增：部署 LockVault 并与 Crowdsale 互相绑定
        console.log("\n=== 部署 LockVault 合约 ===");
        const LockVault = await ethers.getContractFactory("LockVault");
        console.log("正在部署 LockVault...");
        const vault = await LockVault.deploy(hltTokenAddress, deployer.address);
        console.log("等待交易确认...");
        await vault.deployed();
        const vaultAddress = vault.address;
        console.log("✅ LockVault 部署成功，地址:", vaultAddress);

        console.log("\n=== 绑定 Crowdsale ↔ LockVault ===");
        console.log("设置 Crowdsale.setVault(vault)...");
        const setVaultTx = await crowdsale.setVault(vaultAddress);
        await setVaultTx.wait();
        console.log("✅ 已在 Crowdsale 设置 Vault 地址");

        console.log("设置 LockVault.setCrowdsale(crowdsale)...");
        const setCrowdsaleOnVaultTx = await vault.setCrowdsale(crowdsaleAddress);
        await setCrowdsaleOnVaultTx.wait();
        console.log("✅ 已在 LockVault 设置 Crowdsale 地址");

        console.log("\n=== 配置合约权限 ===");

        // 设置众筹合约地址（HLTToken -> Crowdsale）
        console.log("设置众筹合约地址...");
        const setCrowdsaleTx = await hltToken.setCrowdsaleContract(crowdsaleAddress);
        await setCrowdsaleTx.wait();
        console.log("✅ 已设置众筹合约地址");

        // 给众筹合约分配代币（售卖额度）
        console.log("给众筹合约分配代币...");
        const saleAmount = await hltToken.SALE_AMOUNT();
        const transferTx = await hltToken.transfer(crowdsaleAddress, saleAmount);
        await transferTx.wait();
        console.log("✅ 已给众筹合约分配代币:", ethers.utils.formatEther(saleAmount), "HLT");

        // 转移其他代币到指定账号
        console.log("\n=== 转移其他代币 ===");
        const transferOtherTx = await hltToken.transferOtherTokens();
        await transferOtherTx.wait();
        console.log("✅ 已转移其他代币到账号:", otherAccountAddress);

        console.log("\n🎉 === 部署完成 ===");
        console.log("📋 合约地址:");
        console.log("   HLTToken:", hltTokenAddress);
        console.log("   Crowdsale:", crowdsaleAddress);
        console.log("   LockVault:", vaultAddress);
        console.log("   USDT:", usdtAddress);
        console.log("   其他账号:", otherAccountAddress);

        console.log("\n🔗 BSC测试网浏览器链接:");
        console.log("   HLTToken: https://testnet.bscscan.com/address/" + hltTokenAddress);
        console.log("   Crowdsale: https://testnet.bscscan.com/address/" + crowdsaleAddress);
        console.log("   LockVault: https://testnet.bscscan.com/address/" + vaultAddress);
        console.log("   USDT: https://testnet.bscscan.com/address/" + usdtAddress);

        console.log("\n📝 验证命令:");
        console.log(`npx hardhat verify --network bscTestnet ${hltTokenAddress} "${tokenName}" "${tokenSymbol}" ${deployer.address} ${otherAccountAddress}`);
        console.log(`npx hardhat verify --network bscTestnet ${crowdsaleAddress} ${hltTokenAddress} ${usdtAddress} ${deployer.address}`);
        console.log(`npx hardhat verify --network bscTestnet ${vaultAddress} ${hltTokenAddress} ${deployer.address}`);

        console.log("\n🚀 下一步操作:");
        console.log("1. 验证合约");
        console.log("2. 调用 crowdsale.startCrowdsale() 开始众筹");
        console.log("3. 前端通过 crowdsale.vault() 读取 Vault 地址，进行锁仓查询与领取");

    } catch (error) {
        console.error("❌ 部署失败:", error.message);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("部署失败:", error);
        process.exit(1);
    });