// 简单的计算验证脚本
const { ethers } = require('hardhat');

async function main() {
    console.log('🔍 === 调试计算逻辑 ===');
    
    // 部署合约
    const [deployer, user1] = await ethers.getSigners();
    
    const HLTToken = await ethers.getContractFactory('HLTToken');
    const hltToken = await HLTToken.deploy('HealthLife Token', 'HLT', deployer.address, user1.address);
    await hltToken.deployed();
    
    const MockUSDT = await ethers.getContractFactory('MockUSDT');
    const mockUSDT = await MockUSDT.deploy(deployer.address);
    await mockUSDT.deployed();
    
    const Crowdsale = await ethers.getContractFactory('Crowdsale');
    const crowdsale = await Crowdsale.deploy(hltToken.address, mockUSDT.address, deployer.address);
    await crowdsale.deployed();
    
    // 测试计算
    const usdtAmount = 1000000; // 1 USDT (6位小数)
    const tokensPerUSDT = await crowdsale.tokensPerUSDT();
    
    console.log(`USDT金额: ${usdtAmount} (原始值)`);
    console.log(`USDT金额: ${usdtAmount / 1e6} USDT (格式化)`);
    console.log(`tokensPerUSDT: ${tokensPerUSDT}`);
    
    // 手动计算
    const manualCalc = ethers.BigNumber.from(usdtAmount).mul(tokensPerUSDT).mul(ethers.utils.parseEther('1')).div(1e6);
    console.log(`手动计算结果: ${manualCalc.toString()} wei`);
    console.log(`手动计算结果: ${ethers.utils.formatEther(manualCalc)} HLT`);
    
    // 合约计算
    const contractCalc = await crowdsale.calculateHLTAmount(usdtAmount);
    console.log(`合约计算结果: ${contractCalc.toString()} wei`);
    console.log(`合约计算结果: ${ethers.utils.formatEther(contractCalc)} HLT`);
    
    console.log(`计算一致: ${manualCalc.toString() === contractCalc.toString() ? '✅' : '❌'}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});