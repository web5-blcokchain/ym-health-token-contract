# 🚀 HealthLife Token (HLT) 前端集成文档

## 📋 目录

1. [项目概述](#项目概述)
2. [合约架构](#合约架构)
3. [环境配置](#环境配置)
4. [合约接口](#合约接口)
5. [前端集成示例](#前端集成示例)
6. [常见场景实现](#常见场景实现)
7. [错误处理](#错误处理)
8. [最佳实践](#最佳实践)
9. [测试指南](#测试指南)
10. [FAQ](#faq)
11. [需求说明](#需求说明)
12. [用法（集成步骤与代码）](#用法集成步骤与代码)

## 📖 项目概述

HealthLife Token (HLT) 是一个基于区块链的健康医疗代币项目，包含以下核心功能：

- **ERC-20代币**: 标准的以太坊代币，总供应量1亿枚
- **众筹功能**: 支持USDT购买HLT代币，汇率1 USDT = 12 HLT
- **锁仓机制**: 测试环境锁仓1小时；正式环境锁仓365天（代币层锁仓，转账自动校验）
- **代币分配**: 2400万用于售卖，7600万转给指定账号

### 核心特性

- ✅ **安全性**: 基于OpenZeppelin合约库
- ✅ **透明性**: 所有交易可在区块链上查询
- ✅ **可扩展性**: 支持多网络部署（ETH、BSC）
- ✅ **用户友好**: 简单的购买流程

## 🏗️ 合约架构

### 合约组件

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   HLTToken.sol  │    │  Crowdsale.sol  │    │  MockUSDT.sol   │
│                 │    │                 │    │                 │
│ • ERC-20代币    │◄───┤ • 众筹管理      │◄───┤ • 测试USDT     │
│ • 锁仓功能      │    │ • 价格设置      │    │ • 6位小数      │
│ • 权限管理      │    │ • 购买逻辑      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 网络支持

| 网络 | ChainID | RPC URL | 状态 |
|------|---------|---------|------|
| BSC测试网 | 97 | https://data-seed-prebsc-1-s1.binance.org:8545/ | ✅ 支持 |
| BSC主网 | 56 | https://bsc-dataseed.binance.org/ | ✅ 支持 |
| ETH主网 | 1 | https://mainnet.infura.io/v3/... | ✅ 支持 |
| ETH测试网 | 5/11155111 | https://goerli.infura.io/v3/... | ✅ 支持 |

## ⚙️ 环境配置

### 1. 安装依赖

```bash
# 安装 ethers.js（推荐）
npm install ethers

# 可选：React 场景
npm install wagmi viem @tanstack/react-query
```

### 2. 网络配置

```javascript
// 网络配置
export const networks = {
  bscTestnet: {
    chainId: 97,
    name: 'BSC Testnet',
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    blockExplorer: 'https://testnet.bscscan.com',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }
  },
  bscMainnet: {
    chainId: 56,
    name: 'BSC Mainnet',
    rpcUrl: 'https://bsc-dataseed.binance.org/',
    blockExplorer: 'https://bscscan.com',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }
  }
};
```

### 3. 合约地址配置

```javascript
// 合约地址配置（以部署输出或 docs/部署信息.md 为准）
export const addresses = {
  bscTestnet: {
    HLTToken: '0xF7a84a11EB4FbA0c77Ac1779a11c48F1D18Bf35D', // 最新：请替换为实际部署地址（以 docs/部署信息.md 为准）
    Crowdsale: '0xf8E6E83A5771470D95b7E12F733f1f35DfFc5047', // 最新：请替换为实际部署地址（以 docs/部署信息.md 为准）
    USDT: '0xeb4C53574edBF035FfBAF647b3E957b4FB88CD6B' // 测试网固定 MockUSDT
  },
  bscMainnet: {
    HLTToken: '0x... ', // 生产部署后填入
    Crowdsale: '0x... ',
    USDT: '0x55d398326f99059fF775485246999027B3197955' // BSC 主网 USDT（可覆盖）
  }
};
```

## 📋 合约接口

### HLTToken 合约接口（代币层锁仓）

```javascript
// 代币基础信息
await hltToken.name();        // "HealthLife Token"
await hltToken.symbol();      // "HLT"
await hltToken.decimals();    // 18
await hltToken.totalSupply(); // 1e8 * 1e18

// 锁仓相关（关键：无独立Vault，直接在代币层）
await hltToken.getLocks(user);
await hltToken.getLockedAmount(user);
await hltToken.getUnlockedAmount(user);
```

### Crowdsale 合约接口（购买与统计）

```javascript
// 众筹状态与价格
await crowdsale.getCrowdsaleStatus(); // [active, ended, start, end, totalUSDT, totalHLT, totalParticipants]
await crowdsale.getTokenPrice();      // 12（默认）

// 购买入口（USDT 6 位小数）
await crowdsale.buyTokens(usdtAmount);

// 计算接口
await crowdsale.calculateHLTAmount(usdtAmount);
```

### USDT 合约接口（授权）

```javascript
await usdt.allowance(owner, spender);
await usdt.approve(spender, amount); // 6 位小数
```

<!-- 旧的 LockVault 章节已移除：改为代币层锁仓，无需单独Vault与领取。请参考上文“代币层锁仓接口（替代 LockVault）”。 -->

## 🧩 需求说明

- 测试网（BSC Testnet）：
  - USDT 地址固定为 0xeb4C53574edBF035FfBAF647b3E957b4FB88CD6B（MockUSDT）。
  - 锁仓时长固定为 1 小时（3600 秒），用于联调与快速验收。
- 正式网（BSC Mainnet）：
  - USDT 地址需可配置（使用主网真实 USDT，默认 0x55d3...7955，亦可传入环境覆盖）。
  - 锁仓时长固定为 365 天（31536000 秒），上线前必须确认参数无误。
- 前端集成范围：
+ 前端集成范围：
   - 只读：查询众筹聚合数据、用户个人购买与锁仓状态（锁仓条目、已锁定、已解锁、可转额度）。
   - 交易：USDT 授权 + buyTokens 购买流程。
   - 状态提示：对常见回滚原因进行用户友好提示（见“错误处理”）。
+ - 部署说明：部署使用的 OTHER_ACCOUNT 固定为 0xaeec208c1fdE4636570E2C6E72A256c53c774fac（合约构造参数之一，前端无需使用）。

## 用法（集成步骤与代码）

以下示例基于 ethers.js v5，适用于浏览器 dApp 与 Node 脚本。

### 1) 初始化 Provider 与合约实例

```javascript
import { ethers } from 'ethers';
import { addresses, networks } from './config'; // 参考上文

// 连接钱包
const provider = new ethers.providers.Web3Provider(window.ethereum);
await provider.send('eth_requestAccounts', []);
const signer = provider.getSigner();

// 选择网络（示例：BSC 测试网）
const net = 'bscTestnet';
const { HLTToken: HLT_ADDR, Crowdsale: SALE_ADDR, USDT: USDT_ADDR } = addresses[net];

// ABI（最小接口即可，也可引入完整 ABI JSON）
const HLT_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function getLocks(address) view returns (tuple(uint128 amount,uint64 start,uint64 unlock)[])',
  'function getLockedAmount(address) view returns (uint256)',
  'function getUnlockedAmount(address) view returns (uint256)'
];
const SALE_ABI = [
  'function getCrowdsaleStatus() view returns (bool,bool,uint256,uint256,uint256,uint256,uint256)',
  'function getTokenPrice() view returns (uint256)',
  'function calculateHLTAmount(uint256) view returns (uint256)',
  'function buyTokens(uint256)'
];
const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)'
];

const hlt = new ethers.Contract(HLT_ADDR, HLT_ABI, signer);
const sale = new ethers.Contract(SALE_ADDR, SALE_ABI, signer);
const usdt = new ethers.Contract(USDT_ADDR, ERC20_ABI, signer);
```

### 2) 购买流程（USDT 授权 + buyTokens）

```javascript
// 输入：用户希望支付的 USDT 金额（十进制字符串），例如 '100' 表示 100 USDT
const decimalUSDT = '100';
const usdtDecimals = 6; // USDT 固定6位
const usdtAmount = ethers.utils.parseUnits(decimalUSDT, usdtDecimals); // BigNumber

// Step 1. 可选：预估可获得 HLT 数量
const expectedHLT = await sale.calculateHLTAmount(usdtAmount); // 18位

// Step 2. 授权 USDT 给 Crowdsale
const allowance = await usdt.allowance(await signer.getAddress(), SALE_ADDR);
if (allowance.lt(usdtAmount)) {
  const txApprove = await usdt.approve(SALE_ADDR, usdtAmount);
  await txApprove.wait();
}

// Step 3. 购买（可能触发最小/最大购买限制，请做好错误捕获）
const txBuy = await sale.buyTokens(usdtAmount);
const receipt = await txBuy.wait();
console.log('Buy success:', receipt.transactionHash);
```

### 3) 只读聚合：查询锁仓状态与额度

```javascript
const user = await signer.getAddress();

// a) 基本余额信息
const [balance, locked, unlocked] = await Promise.all([
  hlt.balanceOf(user),
  hlt.getLockedAmount(user),
  hlt.getUnlockedAmount(user)
]);

// b) 锁仓条目（每次购买新增一条）
const locks = await hlt.getLocks(user);
// locks[i] => { amount: BigNumber (uint128), start: number (uint64), unlock: number (uint64) }

// c) UI 友好格式化
function formatHLT(bn) { return ethers.utils.formatUnits(bn, 18); }
function tsToDate(ts) { return new Date(Number(ts) * 1000).toLocaleString(); }

const view = {
  balance: formatHLT(balance),
  locked: formatHLT(locked),
  unlocked: formatHLT(unlocked),
  entries: locks.map((l, i) => ({
    index: i,
    amount: formatHLT(l.amount),
    start: tsToDate(l.start),
    unlock: tsToDate(l.unlock)
  }))
};
console.table(view.entries);
```

### 4) 批量只读聚合（可用于后台/看板）

```javascript
// 输入：地址数组
async function batchFetch(users) {
  return Promise.all(users.map(async (addr) => {
    const [info, locks] = await Promise.all([
      sale.getCrowdsaleStatus(), // 或 sale.getUserInfo(addr) 若需个人总览
      hlt.getLocks(addr)
    ]);
    const locked = await hlt.getLockedAmount(addr);
    const unlocked = await hlt.getUnlockedAmount(addr);
    return { addr, locksCount: locks.length, locked, unlocked };
  }));
}
```

## 常见场景实现

- 显示众筹聚合数据：getCrowdsaleStatus 返回 totalUSDTRaised（6位）、totalHLTSold（18位）、参与人数。
- 价格变更提醒：getTokenPrice 变化时应提示用户（购买结果与预估可能略有差异）。
- 倒计时显示：锁仓条目 unlock 时间到达后，代币转账限制自动解除。

## 🧯 错误处理

- "Amount too small"：小于最小购买额（1 USDT）。
- "Amount too large"：超过最大购买额（100万 USDT）。
- "Insufficient USDT allowance"：未完成授权或额度不足。
- "Insufficient token balance"：众筹合约可售余额不足（联系管理员补充）。
- "Transfer exceeds unlocked"：用户发起 HLT 转账时，金额超过可转额度（balance - locked）。

## 🌟 最佳实践

- 金额统一使用 BigNumber 与 parseUnits/formatUnits，避免浮点误差。
- USDT 固定 6 位、HLT 固定 18 位，UI 层区分显示精度。
- 在交易前再次拉取价格与状态，提示潜在变化（如价格更新）。
- 将地址、ChainId 抽象为配置，便于切换测试/正式环境。

## 🧪 测试指南

- 测试网（BSC Testnet）固定 USDT：0xeb4C53574edBF035FfBAF647b3E957b4FB88CD6B。
- 锁仓时间：测试1小时、正式365天（由合约部署参数决定，前端只读）。
- 使用小额 USDT 进行演练，观察锁仓条目与可转额度变化。

## ❓ FAQ

- 问：是否需要单独的金库合约？
  - 答：不需要。锁仓在代币层实现，转账时自动校验，用户无需额外领取。
- 问：价格是否会变？
  - 答：合约支持 owner 更新价格。前端应在下单前刷新价格并提示用户。
- 问：如何集成到主网？
  - 答：将地址切换为主网部署地址，并确保 USDT 地址配置正确；主网锁仓固定 365 天。