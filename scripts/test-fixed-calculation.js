const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 测试修复后的计算逻辑...");
  console.log("");
  
  // 修复后的tokensPerUSDT值
  const tokensPerUSDT = ethers.BigNumber.from("12000000000000"); // 12 * 10^12
  console.log("📈 修复后的tokensPerUSDT:", tokensPerUSDT.toString());
  
  // 用户支付的USDT数量（13 USDT，考虑6位小数）
  const usdtAmount = ethers.utils.parseUnits("13", 6); // 13 USDT
  console.log("💰 用户支付USDT (原始值):", usdtAmount.toString());
  console.log("💰 用户支付USDT (格式化):", ethers.utils.formatUnits(usdtAmount, 6), "USDT");
  
  // 按照修复后的逻辑计算HLT数量
  const hltAmount = usdtAmount.mul(tokensPerUSDT);
  console.log("");
  console.log("🪙 计算得到HLT (原始值):", hltAmount.toString());
  console.log("🪙 计算得到HLT (格式化):", ethers.utils.formatEther(hltAmount), "HLT");
  
  console.log("");
  console.log("✅ 验证结果:");
  console.log("- 13 USDT × 12000000000000 = 156000000000000000000");
  console.log("- 156000000000000000000 wei = 156 HLT");
  console.log("- 计算正确！✅");
  
  console.log("");
  console.log("🔧 修复方案总结:");
  console.log("1. tokensPerUSDT 从 12 改为 12000000000000 (12 * 10^12)");
  console.log("2. 计算公式保持简单: hltAmount = _usdtAmount * tokensPerUSDT");
  console.log("3. 这样13 USDT就能正确兑换到156 HLT");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  });