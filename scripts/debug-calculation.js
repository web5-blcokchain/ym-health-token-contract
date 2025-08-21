const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 调试代币计算问题...");
  console.log("");
  
  // 用户实际支付的USDT数量（考虑6位小数）
  const usdtAmount = ethers.utils.parseUnits("13", 6); // 13 USDT
  console.log("💰 用户支付USDT (原始值):", usdtAmount.toString());
  console.log("💰 用户支付USDT (格式化):", ethers.utils.formatUnits(usdtAmount, 6), "USDT");
  
  // 兑换比例
  const tokensPerUSDT = 12;
  console.log("📈 兑换比例:", tokensPerUSDT, "HLT per USDT");
  
  // 按照合约逻辑计算HLT数量
  const hltAmountRaw = usdtAmount.mul(tokensPerUSDT);
  console.log("🪙 计算得到HLT (原始值):", hltAmountRaw.toString());
  console.log("🪙 计算得到HLT (格式化为18位小数):", ethers.utils.formatEther(hltAmountRaw), "HLT");
  
  // 正确的计算方式应该是：
  // 13 USDT * 12 = 156 HLT
  // 但是由于精度问题，需要考虑小数位数差异
  
  console.log("");
  console.log("🔧 精度分析:");
  console.log("- USDT精度: 6位小数");
  console.log("- HLT精度: 18位小数");
  console.log("- 精度差异: 12位小数");
  
  // 正确的计算应该是：
  const correctHLTAmount = usdtAmount.mul(tokensPerUSDT).mul(ethers.utils.parseUnits("1", 12));
  console.log("");
  console.log("✅ 正确计算结果:");
  console.log("🪙 应得HLT (原始值):", correctHLTAmount.toString());
  console.log("🪙 应得HLT (格式化):", ethers.utils.formatEther(correctHLTAmount), "HLT");
  
  console.log("");
  console.log("💡 问题分析:");
  console.log("❌ 合约计算: 13,000,000 * 12 = 156,000,000 (这个值被当作18位小数处理)");
  console.log("✅ 正确计算: 13,000,000 * 12 * 10^12 = 156,000,000,000,000,000,000 (156 HLT)");
  console.log("");
  console.log("🔧 合约需要修复计算逻辑，考虑USDT和HLT的精度差异");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  });