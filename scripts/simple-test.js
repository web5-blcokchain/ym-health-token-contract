const { ethers } = require("hardhat");

async function main() {
    console.log("=== 简单测试 ===");
    
    // 获取合约实例
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUSDT = await MockUSDT.deploy("Tether USD", "USDT", 6);
    await mockUSDT.deployed();
    
    const HLTToken = await ethers.getContractFactory("HLTToken");
    const hltToken = await HLTToken.deploy("HealthLife Token", "HLT", ethers.provider.getSigner(0).getAddress(), ethers.provider.getSigner(1).getAddress());
    await hltToken.deployed();
    
    const Crowdsale = await ethers.getContractFactory("Crowdsale");
    const crowdsale = await Crowdsale.deploy(hltToken.address, mockUSDT.address, ethers.provider.getSigner(0).getAddress());
    await crowdsale.deployed();
    
    console.log("合约部署成功！");
    console.log("MockUSDT:", mockUSDT.address);
    console.log("HLTToken:", hltToken.address);
    console.log("Crowdsale:", crowdsale.address);
    
    // 设置众筹合约地址
    await hltToken.setCrowdsaleContract(crowdsale.address);
    console.log("已设置众筹合约地址");
    
    // 给众筹合约分配代币
    const saleAmount = await hltToken.SALE_AMOUNT();
    await hltToken.transfer(crowdsale.address, saleAmount);
    console.log("已分配代币给众筹合约");
    
    // 开始众筹
    await crowdsale.startCrowdsale();
    console.log("众筹已开始");
    
    // 测试基本查询
    const status = await crowdsale.getCrowdsaleStatus();
    console.log("众筹状态:", status);
    
    console.log("测试完成！");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("测试失败:", error);
        process.exit(1);
    });
