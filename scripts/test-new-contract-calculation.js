// 测试新部署合约的计算逻辑
const { ethers } = require('hardhat');

async function main() {
    console.log('=== 测试新合约的计算逻辑 ===');
    
    // 合约地址（从部署输出获取）
    const crowdsaleAddress = '0x699a392289Ec3800A03AcD52aa1695ebBA2fC516';
    const hltTokenAddress = '0x64a4296C32A23C6296C089d6699d415377f8a8F6';
    const mockUSDTAddress = '0xeb4C53574edBF035FfBAF647b3E957b4FB88CD6B';
    
    // 获取合约实例
    const Crowdsale = await ethers.getContractFactory('Crowdsale');
    const crowdsale = Crowdsale.attach(crowdsaleAddress);
    
    const HLTToken = await ethers.getContractFactory('HLTToken');
    const hltToken = HLTToken.attach(hltTokenAddress);
    
    const MockUSDT = await ethers.getContractFactory('MockUSDT');
    const mockUSDT = MockUSDT.attach(mockUSDTAddress);
    
    try {
        // 检查价格
        const price = await crowdsale.getTokenPrice();
        console.log(`getTokenPrice: ${price.toString()}`);
        
        // 模拟计算
        const usdtAmount = ethers.utils.parseUnits('13', 6); // 13 USDT
        console.log(`\n模拟购买 13 USDT:`);
        console.log(`USDT数量 (wei): ${usdtAmount}`);
        
        // 使用合约的计算逻辑
        const hltAmount = await crowdsale.calculateHLTAmount(usdtAmount);
        const hltDisplay = ethers.utils.formatUnits(hltAmount, 18);
        
        console.log(`计算过程:`);
        console.log(`hltAmount = calculateHLTAmount(${usdtAmount}) => ${hltAmount}`);
        console.log(`HLT数量 (标准): ${hltDisplay}`);
        
        // 验证（基于价格的期望值）
        const expectedHLT = (13 * Number(price.toString())).toString();
        console.log(`\n验证:`);
        console.log(`期望HLT(按价格): ${expectedHLT}`);
        console.log(`实际HLT: ${hltDisplay}`);
        console.log(`计算正确: ${Number(hltDisplay) === Number(expectedHLT)}`);
        
        // 检查众筹状态
        const crowdsaleActive = await crowdsale.crowdsaleActive();
        console.log(`\n众筹状态: ${crowdsaleActive ? '进行中' : '未开始'}`);
        
        if (!crowdsaleActive) {
            console.log('\n⚠️  需要先调用 startCrowdsale() 开始众筹');
        }
        
    } catch (error) {
        console.error('测试失败:', error.message);
    }
}

main().catch(console.error);