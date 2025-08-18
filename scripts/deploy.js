const { ethers } = require("hardhat");

async function main() {
    console.log("开始部署 HealthLife Token 合约...");
    
    // 获取部署账户
    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    console.log("账户余额:", ethers.utils.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
    
    // 部署参数
    const tokenName = "HealthLife Token";
    const tokenSymbol = "HLT";
    
    console.log("\n=== 部署 MockUSDT 合约 ===");
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUSDT = await MockUSDT.deploy("Tether USD", "USDT", 6);
    await mockUSDT.deployed();
    const mockUSDTAddress = mockUSDT.address;
    console.log("MockUSDT 部署成功，地址:", mockUSDTAddress);
    
    // 给部署者铸造一些USDT用于测试
    const mintAmount = ethers.utils.parseUnits("1000000", 6); // 100万USDT
    await mockUSDT.mint(deployer.address, mintAmount);
    console.log("已给部署者铸造:", ethers.utils.formatUnits(mintAmount, 6), "USDT");
    
    // 其他账号地址（接收7600万代币的账号）
    const otherAccountAddress = "0x1234567890123456789012345678901234567890";
        
    console.log("\n=== 部署 HLTToken 合约 ===");
    const HLTToken = await ethers.getContractFactory("HLTToken");
    const hltToken = await HLTToken.deploy(tokenName, tokenSymbol, deployer.address, otherAccountAddress);
    await hltToken.deployed();
    const hltTokenAddress = hltToken.address;
    console.log("HLTToken 部署成功，地址:", hltTokenAddress);
    
    console.log("\n=== 部署 Crowdsale 合约 ===");
    const Crowdsale = await ethers.getContractFactory("Crowdsale");
    const crowdsale = await Crowdsale.deploy(hltTokenAddress, mockUSDTAddress, deployer.address);
    await crowdsale.deployed();
    const crowdsaleAddress = crowdsale.address;
    console.log("Crowdsale 部署成功，地址:", crowdsaleAddress);
    
    console.log("\n=== 配置合约权限 ===");
    
    // 设置众筹合约地址
    const setCrowdsaleTx = await hltToken.setCrowdsaleContract(crowdsaleAddress);
    await setCrowdsaleTx.wait();
    console.log("已设置众筹合约地址");
    
    // 给众筹合约分配代币
    const saleAmount = await hltToken.SALE_AMOUNT();
    const transferTx = await hltToken.transfer(crowdsaleAddress, saleAmount);
    await transferTx.wait();
    console.log("已给众筹合约分配代币:", ethers.utils.formatEther(saleAmount), "HLT");
    
    // 转移其他代币到指定账号
    console.log("\n=== 转移其他代币 ===");
    const transferOtherTx = await hltToken.transferOtherTokens();
    await transferOtherTx.wait();
    console.log("已转移其他代币到账号:", otherAccountAddress);
    
    console.log("\n=== 部署完成 ===");
    console.log("MockUSDT:", mockUSDTAddress);
    console.log("HLTToken:", hltTokenAddress);
    console.log("Crowdsale:", crowdsaleAddress);
    console.log("其他账号:", otherAccountAddress);
    
    console.log("\n=== 部署后状态 ===");
    
    // 查询代币分配状态
    const allocationStatus = await hltToken.getTokenAllocationStatus();
    console.log("代币分配状态:");
    console.log("- 售卖代币已铸造:", allocationStatus[0]);
    console.log("- 其他代币已转移:", allocationStatus[1]);
    
    // 查询合约地址
    const contractAddresses = await hltToken.getContractAddresses();
    console.log("\n合约地址配置:");
    console.log("- 众筹合约:", contractAddresses[0]);
    console.log("- 其他账号:", contractAddresses[1]);
    
    // 查询代币分配数量
    const allocationAmounts = await hltToken.getTokenAllocationAmounts();
    console.log("\n代币分配数量:");
    console.log("- 总供应量:", ethers.utils.formatEther(allocationAmounts[0]), "HLT");
    console.log("- 售卖数量:", ethers.utils.formatEther(allocationAmounts[1]), "HLT");
    console.log("- 其他数量:", ethers.utils.formatEther(allocationAmounts[2]), "HLT");
    
    // 查询众筹合约状态
    const crowdsaleStatus = await crowdsale.getCrowdsaleStatus();
    console.log("\n众筹合约状态:");
    console.log("- 众筹激活:", crowdsaleStatus[0]);
    console.log("- 众筹结束:", crowdsaleStatus[1]);
    console.log("- 开始时间:", crowdsaleStatus[2] === 0 ? "未开始" : new Date(Number(crowdsaleStatus[2]) * 1000).toLocaleString());
    console.log("- 结束时间:", crowdsaleStatus[3] === 0 ? "未设置" : new Date(Number(crowdsaleStatus[3]) * 1000).toLocaleString());
    console.log("- 总USDT:", ethers.utils.formatUnits(crowdsaleStatus[4], 6), "USDT");
    console.log("- 总HLT:", ethers.utils.formatEther(crowdsaleStatus[5]), "HLT");
    console.log("- 参与人数:", crowdsaleStatus[6]);
    
    console.log("\n=== 部署信息已保存 ===");
    console.log("请保存以上地址信息，用于后续操作和验证");
    
    console.log("\n=== 下一步操作 ===");
    console.log("1. 调用 crowdsale.startCrowdsale() 开始众筹");
    console.log("2. 可选：调用 crowdsale.setTokenPrice(newPrice) 设置价格");
    console.log("3. 用户可以通过 crowdsale.buyTokens(usdtAmount) 购买代币");
    console.log("4. 调用 crowdsale.endCrowdsale() 结束众筹");
    console.log("5. 调用 crowdsale.withdrawUSDT() 提取USDT");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("部署失败:", error);
        process.exit(1);
    });
