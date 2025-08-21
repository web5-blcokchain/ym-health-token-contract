// 测试方案B的计算逻辑
// tokensPerUSDT = 12 (价格比例)
// 计算公式：(_usdtAmount * tokensPerUSDT * 1e18) / 1e6

console.log('=== 方案B计算逻辑测试 ===');

// 模拟合约参数
const tokensPerUSDT = 12; // 1 USDT = 12 HLT (价格比例)
const userPayment = 13; // 用户支付13 USDT

// USDT在合约中的表示（6位小数）
const usdtAmount = userPayment * 1e6; // 13,000,000
console.log(`用户支付: ${userPayment} USDT`);
console.log(`USDT在合约中: ${usdtAmount} (${userPayment} * 10^6)`);

// 方案B计算公式
const hltAmount = (usdtAmount * tokensPerUSDT * 1e18) / 1e6;
console.log(`\n计算过程:`);
console.log(`hltAmount = (${usdtAmount} * ${tokensPerUSDT} * 10^18) / 10^6`);
console.log(`hltAmount = ${hltAmount}`);

// 转换为标准HLT显示
const hltDisplay = hltAmount / 1e18;
console.log(`\n结果:`);
console.log(`HLT数量 (wei): ${hltAmount}`);
console.log(`HLT数量 (标准): ${hltDisplay}`);

// 验证
const expectedHLT = userPayment * tokensPerUSDT;
console.log(`\n验证:`);
console.log(`期望HLT: ${expectedHLT}`);
console.log(`实际HLT: ${hltDisplay}`);
console.log(`计算正确: ${hltDisplay === expectedHLT}`);

console.log('\n=== 方案B优势 ===');
console.log('1. tokensPerUSDT = 12 直观表示价格比例');
console.log('2. 计算时统一处理精度转换');
console.log('3. 代码逻辑清晰，易于理解和维护');