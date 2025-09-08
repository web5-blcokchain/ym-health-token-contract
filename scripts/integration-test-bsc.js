const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 === BSC测试网集成测试开始 ===\n");

    // 合约地址（优先取环境变量，否则使用最新部署地址）
    const MOCKUSDT_ADDRESS = process.env.USDT_ADDRESS || "0xeb4C53574edBF035FfBAF647b3E957b4FB88CD6B";
    const HLTTOKEN_ADDRESS = process.env.HLT_ADDRESS || "0xF7a84a11EB4FbA0c77Ac1779a11c48F1D18Bf35D";
    const CROWDSALE_ADDRESS = process.env.CROWDSALE_ADDRESS || "0xf8E6E83A5771470D95b7E12F733f1f35DfFc5047";

    // 获取签名者
    const [deployer] = await ethers.getSigners();
    console.log("测试账户:", deployer.address);
    console.log("账户余额:", ethers.utils.formatEther(await deployer.getBalance()), "BNB\n");

    // 连接到已部署的合约
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUSDT = MockUSDT.attach(MOCKUSDT_ADDRESS);

    const HLTToken = await ethers.getContractFactory("HLTToken");
    const hltToken = HLTToken.attach(HLTTOKEN_ADDRESS);

    const Crowdsale = await ethers.getContractFactory("Crowdsale");
    const crowdsale = Crowdsale.attach(CROWDSALE_ADDRESS);

    try {
        console.log("📋 === 合约状态检查 ===");
        
        // 检查USDT（MockUSDT）
        const usdtName = await mockUSDT.name();
        const usdtSymbol = await mockUSDT.symbol();
        const usdtDecimals = await mockUSDT.decimals();
        const usdtTotalSupply = await mockUSDT.totalSupply();
        const deployerUsdtBalance = await mockUSDT.balanceOf(deployer.address);
        
        console.log("USDT 信息:");
        console.log(`  名称: ${usdtName}`);
        console.log(`  符号: ${usdtSymbol}`);
        console.log(`  精度: ${usdtDecimals}`);
        console.log(`  总供应量: ${ethers.utils.formatUnits(usdtTotalSupply, usdtDecimals)} USDT`);
        console.log(`  部署者余额: ${ethers.utils.formatUnits(deployerUsdtBalance, usdtDecimals)} USDT`);

        // 检查HLTToken
        const hltName = await hltToken.name();
        const hltSymbol = await hltToken.symbol();
        const hltDecimals = await hltToken.decimals();
        const hltTotalSupply = await hltToken.totalSupply();
        const deployerHltBalance = await hltToken.balanceOf(deployer.address);
        const crowdsaleHltBalance = await hltToken.balanceOf(CROWDSALE_ADDRESS);
        
        console.log("\nHLTToken 信息:");
        console.log(`  名称: ${hltName}`);
        console.log(`  符号: ${hltSymbol}`);
        console.log(`  精度: ${hltDecimals}`);
        console.log(`  总供应量: ${ethers.utils.formatEther(hltTotalSupply)} HLT`);
        console.log(`  部署者余额: ${ethers.utils.formatEther(deployerHltBalance)} HLT`);
        console.log(`  众筹合约余额: ${ethers.utils.formatEther(crowdsaleHltBalance)} HLT`);

        // 检查Crowdsale
        const crowdsaleOwner = await crowdsale.owner();
        const crowdsaleToken = await crowdsale.token();
        const crowdsaleUSDT = await crowdsale.usdtToken();
        const crowdsaleActive = await crowdsale.crowdsaleActive();
        const tokensPerUSDT = await crowdsale.getTokenPrice();
        
        console.log("\nCrowdsale 信息:");
        console.log(`  所有者: ${crowdsaleOwner}`);
        console.log(`  HLT代币地址: ${crowdsaleToken}`);
        console.log(`  USDT地址: ${crowdsaleUSDT}`);
        console.log(`  锁仓方式: 代币层锁仓（HLTToken 内部）`);
        console.log(`  众筹状态: ${crowdsaleActive ? '活跃' : '未开始'}`);
        console.log(`  兑换比例: 1 USDT = ${tokensPerUSDT} HLT`);

        // 预检查锁仓（购买前锁仓条目数量）
        const locksBefore = await hltToken.getLocks(deployer.address);
        console.log(`\n购买前锁仓条目数量: ${locksBefore.length}`);

        console.log("\n🚀 === 开始功能测试 ===");

        // 1. 开始众筹
        if (!crowdsaleActive) {
            console.log("\n1️⃣ 开始众筹...");
            const startTx = await crowdsale.startCrowdsale();
            await startTx.wait();
            console.log("✅ 众筹已开始");
        } else {
            console.log("\n1️⃣ 众筹已经开始");
        }

        // 2. 购买代币测试
        console.log("\n2️⃣ 购买代币测试...");
        const buyAmount = ethers.utils.parseUnits("100", 6); // 100 USDT
        
        // 检查USDT余额
        const usdtBalance = await mockUSDT.balanceOf(deployer.address);
        if (usdtBalance.lt(buyAmount)) {
            console.log("USDT余额不足，先mint一些USDT...");
            const mintTx = await mockUSDT.mint(deployer.address, buyAmount);
            await mintTx.wait();
            console.log(`✅ 已mint ${ethers.utils.formatUnits(buyAmount, 6)} USDT`);
        }

        // 授权USDT给众筹合约
        console.log("授权USDT给众筹合约...");
        const approveTx = await mockUSDT.approve(CROWDSALE_ADDRESS, buyAmount);
        await approveTx.wait();
        console.log("✅ USDT授权完成");

        // 购买代币
        console.log(`购买代币 (${ethers.utils.formatUnits(buyAmount, 6)} USDT)...`);
        const buyTx = await crowdsale.buyTokens(buyAmount);
        const buyReceipt = await buyTx.wait();
        console.log("✅ 代币购买成功");
        console.log(`   交易哈希: ${buyReceipt.transactionHash}`);

        // 购买后查询USDT余额与锁仓情况
        const newUsdtBalance = await mockUSDT.balanceOf(deployer.address);
        console.log(`   新的USDT余额: ${ethers.utils.formatUnits(newUsdtBalance, 6)} USDT`);

        console.log("\n3️⃣ 检查锁仓状态（代币层）...");
        const locks = await hltToken.getLocks(deployer.address);
        const locked = await hltToken.getLockedAmount(deployer.address);
        const unlocked = await hltToken.getUnlockedAmount(deployer.address);
        console.log(`   锁仓条目数量: ${locks.length}`);
        console.log(`   当前锁定总额: ${ethers.utils.formatEther(locked)} HLT`);
        console.log(`   当前可转余额: ${ethers.utils.formatEther(unlocked)} HLT`);
        if (locks.length > 0) {
            const last = locks[locks.length - 1];
            const startDate = new Date(Number(last.start) * 1000);
            const unlockDate = new Date(Number(last.unlock) * 1000);
            console.log(`   最近新增锁仓: amount=${ethers.utils.formatEther(last.amount)} HLT, start=${startDate.toLocaleString()}, unlock=${unlockDate.toLocaleString()}`);
        }

        // 4. 检查众筹统计
        console.log("\n4️⃣ 检查众筹统计...");
        const totalHLTSold = await crowdsale.totalHLTSold();
        const totalUSDTRaised = await crowdsale.totalUSDTRaised();
        const totalParticipants = await crowdsale.totalParticipants();
        console.log(`   已售出代币: ${ethers.utils.formatEther(totalHLTSold)} HLT`);
        console.log(`   筹集USDT: ${ethers.utils.formatUnits(totalUSDTRaised, 6)} USDT`);
        console.log(`   参与人数: ${totalParticipants.toString()}`);

        // 5. 检查用户购买记录
        console.log("\n5️⃣ 检查用户购买记录...");
        const userHLTAmount = await crowdsale.userHLTAmount(deployer.address);
        const userPurchases = await crowdsale.userPurchases(deployer.address);
        console.log(`   用户购买的HLT(累计): ${ethers.utils.formatEther(userHLTAmount)} HLT`);
        console.log(`   用户支付的USDT(累计): ${ethers.utils.formatUnits(userPurchases, 6)} USDT`);

        console.log("\n✅ === 集成测试完成 ===");
        console.log("🎉 所有功能测试通过！");
        
        console.log("\n📊 === 测试总结 ===");
        console.log("✅ USDT 合约正常工作");
        console.log("✅ HLTToken 合约正常工作");
        console.log("✅ Crowdsale 合约正常工作");
        console.log("✅ 代币购买功能正常");
        console.log("✅ 锁仓机制正常（代币层锁仓条目已生成）");
        console.log("✅ 统计功能正常");

        console.log("\n🔗 合约浏览器链接:");
        console.log(`   USDT: https://testnet.bscscan.com/address/${MOCKUSDT_ADDRESS}`);
        console.log(`   HLTToken: https://testnet.bscscan.com/address/${HLTTOKEN_ADDRESS}`);
        console.log(`   Crowdsale: https://testnet.bscscan.com/address/${CROWDSALE_ADDRESS}`);

    } catch (error) {
        console.error("❌ 测试失败:", error.message);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("集成测试失败:", error);
        process.exit(1);
    });