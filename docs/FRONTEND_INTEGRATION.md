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

## 📖 项目概述

HealthLife Token (HLT) 是一个基于区块链的健康医疗代币项目，包含以下核心功能：

- **ERC-20代币**: 标准的以太坊代币，总供应量1亿枚
- **众筹功能**: 支持USDT购买HLT代币，汇率1 USDT = 12 HLT
- **锁仓机制**: 购买的代币锁仓12个月
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
│ • 锁仓功能      │    │ • 价格设置      │    │ • 无限铸造      │
│ • 权限管理      │    │ • 购买逻辑      │    │ • 6位小数      │
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
# 安装 ethers.js
npm install ethers

# 或使用 web3.js
npm install web3

# 推荐使用 wagmi + viem (React)
npm install wagmi viem @tanstack/react-query
```

### 2. 网络配置

```javascript
// 网络配置
const networks = {
  bscTestnet: {
    chainId: 97,
    name: 'BSC Testnet',
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    blockExplorer: 'https://testnet.bscscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    }
  },
  bscMainnet: {
    chainId: 56,
    name: 'BSC Mainnet',
    rpcUrl: 'https://bsc-dataseed.binance.org/',
    blockExplorer: 'https://bscscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    }
  }
};
```

### 3. 合约地址配置

```javascript
// 合约地址配置（请替换为实际部署地址）
const contractAddresses = {
  bscTestnet: {
    HLTToken: '0x...', // HLT代币合约地址
    Crowdsale: '0x...', // 众筹合约地址
    USDT: '0x...' // USDT合约地址
  },
  bscMainnet: {
    HLTToken: '0x...',
    Crowdsale: '0x...',
    USDT: '0x55d398326f99059fF775485246999027B3197955' // BSC主网USDT
  }
};
```

## 📋 合约接口

### HLTToken 合约接口

#### 基础信息查询

```javascript
// 代币基础信息
const tokenInfo = {
  name: await hltToken.name(), // "HealthLife Token"
  symbol: await hltToken.symbol(), // "HLT"
  decimals: await hltToken.decimals(), // 18
  totalSupply: await hltToken.totalSupply() // 100,000,000 * 10^18
};

// 代币分配信息
const allocation = {
  totalSupply: await hltToken.TOTAL_SUPPLY(), // 1亿代币
  saleAmount: await hltToken.SALE_AMOUNT(), // 2400万代币
  otherAmount: await hltToken.OTHER_AMOUNT() // 7600万代币
};
```

#### 余额和授权

```javascript
// 查询用户余额
const balance = await hltToken.balanceOf(userAddress);

// 查询授权额度
const allowance = await hltToken.allowance(userAddress, spenderAddress);

// 授权代币
const approveTx = await hltToken.approve(spenderAddress, amount);
await approveTx.wait();
```

#### 锁仓功能

```javascript
// 查询用户是否被锁仓
const isLocked = await hltToken.isUserLocked(userAddress);

// 查询用户解锁时间
const unlockTime = await hltToken.getUserUnlockTime(userAddress);

// 查询剩余锁仓时间（秒）
const remainingTime = await hltToken.getUserRemainingLockTime(userAddress);

// 查询用户锁仓开始时间
const lockTime = await hltToken.userLockTime(userAddress);
```

### Crowdsale 合约接口

#### 众筹状态查询

```javascript
// 查询众筹状态
const crowdsaleStatus = await crowdsale.getCrowdsaleStatus();
const {
  active,      // 是否活跃
  ended,       // 是否结束
  startTime,   // 开始时间
  endTime      // 结束时间
} = crowdsaleStatus;

// 查询代币价格
const tokensPerUSDT = await crowdsale.getTokenPrice(); // 默认12

// 查询购买限制
const minPurchase = await crowdsale.MIN_PURCHASE_USDT(); // 1 USDT
const maxPurchase = await crowdsale.MAX_PURCHASE_USDT(); // 100万 USDT
```

#### 众筹统计

```javascript
// 查询众筹统计数据
const stats = await crowdsale.getCrowdsaleStats();
const {
  totalUSDTRaised,    // 总筹集USDT
  totalHLTSold,       // 总售出HLT
  totalParticipants   // 总参与人数
} = stats;
```

#### 用户信息查询

```javascript
// 查询用户购买信息
const userInfo = await crowdsale.getUserInfo(userAddress);
const {
  usdtPurchased,  // 用户购买的USDT数量
  hltAmount,      // 用户获得的HLT数量
  participated    // 是否参与过
} = userInfo;
```

#### 价格计算

```javascript
// 计算USDT可购买的HLT数量
const usdtAmount = ethers.utils.parseUnits("100", 6); // 100 USDT
const hltAmount = await crowdsale.calculateHLTAmount(usdtAmount);

// 计算购买指定HLT需要的USDT数量
const hltDesired = ethers.utils.parseEther("1200"); // 1200 HLT
const usdtNeeded = await crowdsale.calculateUSDTAmount(hltDesired);
```

### USDT 合约接口

```javascript
// USDT基础信息
const usdtInfo = {
  name: await usdtToken.name(), // "Tether USD"
  symbol: await usdtToken.symbol(), // "USDT"
  decimals: await usdtToken.decimals() // 6
};

// 查询USDT余额
const usdtBalance = await usdtToken.balanceOf(userAddress);

// 授权USDT给众筹合约
const approveUSDT = await usdtToken.approve(crowdsaleAddress, amount);
```

## 💻 前端集成示例

### 1. 使用 ethers.js

```javascript
import { ethers } from 'ethers';

// 合约ABI（简化版）
const HLT_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function isUserLocked(address user) view returns (bool)",
  "function getUserUnlockTime(address user) view returns (uint256)",
  "function getUserRemainingLockTime(address user) view returns (uint256)"
];

const CROWDSALE_ABI = [
  "function buyTokens(uint256 usdtAmount)",
  "function getCrowdsaleStatus() view returns (bool active, bool ended, uint256 startTime, uint256 endTime)",
  "function getTokenPrice() view returns (uint256)",
  "function getUserInfo(address user) view returns (uint256 usdtPurchased, uint256 hltAmount, bool participated)",
  "function calculateHLTAmount(uint256 usdtAmount) view returns (uint256)",
  "function calculateUSDTAmount(uint256 hltAmount) view returns (uint256)"
];

const USDT_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

class HLTIntegration {
  constructor(provider, contractAddresses) {
    this.provider = provider;
    this.addresses = contractAddresses;
    
    // 初始化合约实例
    this.hltToken = new ethers.Contract(contractAddresses.HLTToken, HLT_ABI, provider);
    this.crowdsale = new ethers.Contract(contractAddresses.Crowdsale, CROWDSALE_ABI, provider);
    this.usdtToken = new ethers.Contract(contractAddresses.USDT, USDT_ABI, provider);
  }

  // 连接钱包
  async connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      this.signer = this.provider.getSigner();
      this.userAddress = await this.signer.getAddress();
      
      // 连接合约到签名者
      this.hltToken = this.hltToken.connect(this.signer);
      this.crowdsale = this.crowdsale.connect(this.signer);
      this.usdtToken = this.usdtToken.connect(this.signer);
      
      return this.userAddress;
    }
    throw new Error('请安装MetaMask');
  }

  // 获取用户信息
  async getUserInfo() {
    if (!this.userAddress) throw new Error('请先连接钱包');
    
    const [hltBalance, usdtBalance, isLocked, unlockTime, userInfo] = await Promise.all([
      this.hltToken.balanceOf(this.userAddress),
      this.usdtToken.balanceOf(this.userAddress),
      this.hltToken.isUserLocked(this.userAddress),
      this.hltToken.getUserUnlockTime(this.userAddress),
      this.crowdsale.getUserInfo(this.userAddress)
    ]);

    return {
      address: this.userAddress,
      hltBalance: ethers.utils.formatEther(hltBalance),
      usdtBalance: ethers.utils.formatUnits(usdtBalance, 6),
      isLocked,
      unlockTime: unlockTime.toNumber(),
      purchased: {
        usdtAmount: ethers.utils.formatUnits(userInfo.usdtPurchased, 6),
        hltAmount: ethers.utils.formatEther(userInfo.hltAmount),
        participated: userInfo.participated
      }
    };
  }

  // 获取众筹信息
  async getCrowdsaleInfo() {
    const [status, price, stats] = await Promise.all([
      this.crowdsale.getCrowdsaleStatus(),
      this.crowdsale.getTokenPrice(),
      this.crowdsale.getCrowdsaleStats()
    ]);

    return {
      active: status.active,
      ended: status.ended,
      startTime: status.startTime.toNumber(),
      endTime: status.endTime.toNumber(),
      price: price.toNumber(),
      stats: {
        totalUSDTRaised: ethers.utils.formatUnits(stats.totalUSDTRaised, 6),
        totalHLTSold: ethers.utils.formatEther(stats.totalHLTSold),
        totalParticipants: stats.totalParticipants.toNumber()
      }
    };
  }

  // 购买代币
  async buyTokens(usdtAmount) {
    if (!this.userAddress) throw new Error('请先连接钱包');
    
    const usdtAmountWei = ethers.utils.parseUnits(usdtAmount.toString(), 6);
    
    // 1. 检查USDT余额
    const usdtBalance = await this.usdtToken.balanceOf(this.userAddress);
    if (usdtBalance.lt(usdtAmountWei)) {
      throw new Error('USDT余额不足');
    }
    
    // 2. 检查授权
    const allowance = await this.usdtToken.allowance(this.userAddress, this.addresses.Crowdsale);
    if (allowance.lt(usdtAmountWei)) {
      // 需要授权
      const approveTx = await this.usdtToken.approve(this.addresses.Crowdsale, usdtAmountWei);
      await approveTx.wait();
    }
    
    // 3. 购买代币
    const buyTx = await this.crowdsale.buyTokens(usdtAmountWei);
    const receipt = await buyTx.wait();
    
    return {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  // 计算购买预览
  async calculatePurchase(usdtAmount) {
    const usdtAmountWei = ethers.utils.parseUnits(usdtAmount.toString(), 6);
    const hltAmount = await this.crowdsale.calculateHLTAmount(usdtAmountWei);
    
    return {
      usdtAmount: usdtAmount,
      hltAmount: ethers.utils.formatEther(hltAmount),
      price: await this.crowdsale.getTokenPrice()
    };
  }
}

// 使用示例
const provider = new ethers.providers.Web3Provider(window.ethereum);
const hlt = new HLTIntegration(provider, contractAddresses.bscTestnet);

// 连接钱包并获取信息
async function init() {
  try {
    await hlt.connectWallet();
    const userInfo = await hlt.getUserInfo();
    const crowdsaleInfo = await hlt.getCrowdsaleInfo();
    
    console.log('用户信息:', userInfo);
    console.log('众筹信息:', crowdsaleInfo);
  } catch (error) {
    console.error('初始化失败:', error);
  }
}
```

### 2. 使用 React + wagmi

```jsx
import { useAccount, useContractRead, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';

// React Hook 示例
function useCrowdsale(contractAddress) {
  const { address } = useAccount();
  
  // 读取众筹状态
  const { data: crowdsaleStatus } = useContractRead({
    address: contractAddress,
    abi: CROWDSALE_ABI,
    functionName: 'getCrowdsaleStatus'
  });
  
  // 读取用户信息
  const { data: userInfo } = useContractRead({
    address: contractAddress,
    abi: CROWDSALE_ABI,
    functionName: 'getUserInfo',
    args: [address],
    enabled: !!address
  });
  
  return {
    crowdsaleStatus,
    userInfo,
    isActive: crowdsaleStatus?.[0],
    isEnded: crowdsaleStatus?.[1]
  };
}

// 购买组件
function BuyTokens({ crowdsaleAddress, usdtAddress }) {
  const [usdtAmount, setUsdtAmount] = useState('');
  const { address } = useAccount();
  
  // 准备购买交易
  const { config } = usePrepareContractWrite({
    address: crowdsaleAddress,
    abi: CROWDSALE_ABI,
    functionName: 'buyTokens',
    args: [parseUnits(usdtAmount || '0', 6)],
    enabled: !!usdtAmount && parseFloat(usdtAmount) > 0
  });
  
  const { write: buyTokens, isLoading } = useContractWrite(config);
  
  // 准备授权交易
  const { config: approveConfig } = usePrepareContractWrite({
    address: usdtAddress,
    abi: USDT_ABI,
    functionName: 'approve',
    args: [crowdsaleAddress, parseUnits(usdtAmount || '0', 6)],
    enabled: !!usdtAmount && parseFloat(usdtAmount) > 0
  });
  
  const { write: approveUSDT, isLoading: isApproving } = useContractWrite(approveConfig);
  
  const handleBuy = async () => {
    if (!usdtAmount) return;
    
    try {
      // 先授权，再购买
      await approveUSDT?.();
      await buyTokens?.();
    } catch (error) {
      console.error('购买失败:', error);
    }
  };
  
  return (
    <div className="buy-tokens">
      <h3>购买 HLT 代币</h3>
      <div>
        <label>USDT 数量:</label>
        <input
          type="number"
          value={usdtAmount}
          onChange={(e) => setUsdtAmount(e.target.value)}
          placeholder="输入USDT数量"
        />
      </div>
      <div>
        <p>将获得: {usdtAmount ? (parseFloat(usdtAmount) * 12).toFixed(2) : '0'} HLT</p>
      </div>
      <button
        onClick={handleBuy}
        disabled={!usdtAmount || isLoading || isApproving}
      >
        {isApproving ? '授权中...' : isLoading ? '购买中...' : '购买代币'}
      </button>
    </div>
  );
}
```

## 🎯 常见场景实现

### 1. 用户钱包连接

```javascript
// MetaMask 连接
async function connectMetaMask() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      // 请求连接
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // 检查网络
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== '0x61') { // BSC测试网
        await switchToBSCTestnet();
      }
      
      return true;
    } catch (error) {
      console.error('连接失败:', error);
      return false;
    }
  } else {
    alert('请安装MetaMask');
    return false;
  }
}

// 切换到BSC测试网
async function switchToBSCTestnet() {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x61' }]
    });
  } catch (switchError) {
    // 如果网络不存在，添加网络
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x61',
          chainName: 'BSC Testnet',
          nativeCurrency: {
            name: 'BNB',
            symbol: 'BNB',
            decimals: 18
          },
          rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
          blockExplorerUrls: ['https://testnet.bscscan.com']
        }]
      });
    }
  }
}
```

### 2. 实时数据更新

```javascript
// 使用事件监听实时更新
class RealTimeUpdater {
  constructor(contracts) {
    this.contracts = contracts;
    this.listeners = [];
  }
  
  // 监听代币购买事件
  listenToPurchaseEvents(callback) {
    const filter = this.contracts.crowdsale.filters.TokensPurchased();
    
    this.contracts.crowdsale.on(filter, (buyer, usdtAmount, hltAmount, lockTime, timestamp, event) => {
      callback({
        buyer,
        usdtAmount: ethers.utils.formatUnits(usdtAmount, 6),
        hltAmount: ethers.utils.formatEther(hltAmount),
        lockTime: lockTime.toNumber(),
        timestamp: timestamp.toNumber(),
        transactionHash: event.transactionHash
      });
    });
  }
  
  // 监听众筹状态变化
  listenToCrowdsaleEvents(callback) {
    // 监听众筹开始
    this.contracts.crowdsale.on('CrowdsaleStarted', (startTime, event) => {
      callback({ type: 'started', startTime: startTime.toNumber(), event });
    });
    
    // 监听众筹结束
    this.contracts.crowdsale.on('CrowdsaleEnded', (endTime, totalUSDT, totalHLT, event) => {
      callback({
        type: 'ended',
        endTime: endTime.toNumber(),
        totalUSDT: ethers.utils.formatUnits(totalUSDT, 6),
        totalHLT: ethers.utils.formatEther(totalHLT),
        event
      });
    });
  }
  
  // 清理监听器
  cleanup() {
    this.contracts.crowdsale.removeAllListeners();
  }
}
```

### 3. 交易状态跟踪

```javascript
// 交易状态跟踪器
class TransactionTracker {
  constructor(provider) {
    this.provider = provider;
    this.pendingTxs = new Map();
  }
  
  // 跟踪交易
  async trackTransaction(txHash, description) {
    this.pendingTxs.set(txHash, { description, status: 'pending' });
    
    try {
      // 等待交易确认
      const receipt = await this.provider.waitForTransaction(txHash, 1);
      
      if (receipt.status === 1) {
        this.pendingTxs.set(txHash, { description, status: 'success', receipt });
        return { success: true, receipt };
      } else {
        this.pendingTxs.set(txHash, { description, status: 'failed', receipt });
        return { success: false, receipt };
      }
    } catch (error) {
      this.pendingTxs.set(txHash, { description, status: 'error', error });
      return { success: false, error };
    }
  }
  
  // 获取交易状态
  getTransactionStatus(txHash) {
    return this.pendingTxs.get(txHash);
  }
  
  // 获取所有待处理交易
  getPendingTransactions() {
    return Array.from(this.pendingTxs.entries())
      .filter(([_, tx]) => tx.status === 'pending');
  }
}
```

### 4. 错误处理和用户提示

```javascript
// 错误处理工具
class ErrorHandler {
  static parseError(error) {
    // 用户拒绝交易
    if (error.code === 4001) {
      return {
        type: 'USER_REJECTED',
        message: '用户取消了交易',
        userFriendly: '您取消了交易，请重试'
      };
    }
    
    // 余额不足
    if (error.message.includes('insufficient funds')) {
      return {
        type: 'INSUFFICIENT_FUNDS',
        message: '余额不足',
        userFriendly: '您的余额不足以完成此交易'
      };
    }
    
    // 合约错误
    if (error.message.includes('execution reverted')) {
      const reason = this.extractRevertReason(error.message);
      return {
        type: 'CONTRACT_ERROR',
        message: reason,
        userFriendly: this.getContractErrorMessage(reason)
      };
    }
    
    // 网络错误
    if (error.message.includes('network')) {
      return {
        type: 'NETWORK_ERROR',
        message: '网络连接错误',
        userFriendly: '网络连接不稳定，请检查网络后重试'
      };
    }
    
    return {
      type: 'UNKNOWN_ERROR',
      message: error.message,
      userFriendly: '发生未知错误，请重试'
    };
  }
  
  static extractRevertReason(errorMessage) {
    const match = errorMessage.match(/execution reverted: (.+)/);
    return match ? match[1] : '合约执行失败';
  }
  
  static getContractErrorMessage(reason) {
    const errorMessages = {
      'Crowdsale not active': '众筹尚未开始或已结束',
      'Amount too small': '购买数量太少，最少需要1 USDT',
      'Amount too large': '购买数量太多，最多100万 USDT',
      'Insufficient token balance': '合约代币余额不足',
      'Insufficient USDT allowance': '请先授权USDT',
      'USDT transfer failed': 'USDT转账失败',
      'Token transfer failed': '代币转账失败',
      'Tokens are locked for 12 months': '代币已锁仓12个月，暂时无法转账'
    };
    
    return errorMessages[reason] || reason;
  }
}
```

## ⚠️ 错误处理

### 常见错误类型

| 错误类型 | 原因 | 解决方案 |
|----------|------|----------|
| `USER_REJECTED` | 用户取消交易 | 提示用户重新操作 |
| `INSUFFICIENT_FUNDS` | 余额不足 | 检查用户余额，提示充值 |
| `NETWORK_ERROR` | 网络问题 | 检查网络连接，重试 |
| `CONTRACT_ERROR` | 合约执行失败 | 根据具体错误提示用户 |
| `INVALID_AMOUNT` | 金额无效 | 验证输入金额范围 |

### 错误处理示例

```javascript
// 完整的购买流程错误处理
async function safeBuyTokens(usdtAmount) {
  try {
    // 1. 输入验证
    if (!usdtAmount || parseFloat(usdtAmount) <= 0) {
      throw new Error('请输入有效的USDT数量');
    }
    
    if (parseFloat(usdtAmount) < 1) {
      throw new Error('最少购买1 USDT');
    }
    
    if (parseFloat(usdtAmount) > 1000000) {
      throw new Error('最多购买100万 USDT');
    }
    
    // 2. 检查众筹状态
    const crowdsaleInfo = await hlt.getCrowdsaleInfo();
    if (!crowdsaleInfo.active) {
      throw new Error('众筹尚未开始或已结束');
    }
    
    // 3. 检查用户余额
    const userInfo = await hlt.getUserInfo();
    if (parseFloat(userInfo.usdtBalance) < parseFloat(usdtAmount)) {
      throw new Error('USDT余额不足');
    }
    
    // 4. 执行购买
    const result = await hlt.buyTokens(usdtAmount);
    
    // 5. 成功提示
    showSuccess(`购买成功！交易哈希: ${result.transactionHash}`);
    
    return result;
    
  } catch (error) {
    const parsedError = ErrorHandler.parseError(error);
    showError(parsedError.userFriendly);
    throw parsedError;
  }
}

// 用户界面提示函数
function showSuccess(message) {
  // 显示成功提示
  console.log('✅', message);
}

function showError(message) {
  // 显示错误提示
  console.error('❌', message);
}
```

## 🏆 最佳实践

### 1. 安全性

```javascript
// ✅ 好的做法
// 1. 始终验证用户输入
function validateUSDTAmount(amount) {
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) {
    throw new Error('请输入有效数字');
  }
  if (num < 1) {
    throw new Error('最少购买1 USDT');
  }
  if (num > 1000000) {
    throw new Error('最多购买100万 USDT');
  }
  return true;
}

// 2. 检查合约状态
async function checkContractState() {
  const crowdsaleInfo = await hlt.getCrowdsaleInfo();
  if (!crowdsaleInfo.active) {
    throw new Error('众筹未激活');
  }
  return true;
}

// 3. 使用try-catch包装所有异步操作
async function safeContractCall(operation) {
  try {
    return await operation();
  } catch (error) {
    const parsedError = ErrorHandler.parseError(error);
    throw parsedError;
  }
}
```

### 2. 性能优化

```javascript
// ✅ 批量查询减少RPC调用
async function getBatchUserInfo(userAddress) {
  const [hltBalance, usdtBalance, isLocked, userInfo, crowdsaleStatus] = await Promise.all([
    hlt.hltToken.balanceOf(userAddress),
    hlt.usdtToken.balanceOf(userAddress),
    hlt.hltToken.isUserLocked(userAddress),
    hlt.crowdsale.getUserInfo(userAddress),
    hlt.crowdsale.getCrowdsaleStatus()
  ]);
  
  return {
    hltBalance: ethers.utils.formatEther(hltBalance),
    usdtBalance: ethers.utils.formatUnits(usdtBalance, 6),
    isLocked,
    userInfo,
    crowdsaleStatus
  };
}

// ✅ 缓存合约实例
const contractCache = new Map();

function getContract(address, abi, provider) {
  const key = `${address}-${provider.network?.chainId}`;
  if (!contractCache.has(key)) {
    contractCache.set(key, new ethers.Contract(address, abi, provider));
  }
  return contractCache.get(key);
}
```

### 3. 用户体验

```javascript
// ✅ 提供实时反馈
class UIFeedback {
  static showLoading(message = '处理中...') {
    // 显示加载状态
    console.log('⏳', message);
  }
  
  static hideLoading() {
    // 隐藏加载状态
  }
  
  static showProgress(current, total, message) {
    const percentage = Math.round((current / total) * 100);
    console.log(`📊 ${message}: ${percentage}%`);
  }
  
  static showTransactionPending(txHash) {
    console.log(`⏳ 交易提交成功，等待确认: ${txHash}`);
  }
  
  static showTransactionSuccess(txHash, message) {
    console.log(`✅ ${message}，交易哈希: ${txHash}`);
  }
}

// ✅ 预估Gas费用
async function estimateGasCost(contractMethod, args) {
  try {
    const gasEstimate = await contractMethod.estimateGas(...args);
    const gasPrice = await provider.getGasPrice();
    const gasCost = gasEstimate.mul(gasPrice);
    
    return {
      gasLimit: gasEstimate.toString(),
      gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei'),
      estimatedCost: ethers.utils.formatEther(gasCost)
    };
  } catch (error) {
    console.error('Gas估算失败:', error);
    return null;
  }
}
```

## 🧪 测试指南

### 1. 单元测试

```javascript
// 使用 Jest + ethers.js 进行测试
describe('HLT Integration Tests', () => {
  let hlt;
  let mockProvider;
  
  beforeEach(() => {
    mockProvider = new MockProvider();
    hlt = new HLTIntegration(mockProvider, testContractAddresses);
  });
  
  test('应该正确计算购买预览', async () => {
    const preview = await hlt.calculatePurchase(100);
    expect(preview.hltAmount).toBe('1200.0'); // 100 * 12
    expect(preview.price).toBe(12);
  });
  
  test('应该正确处理余额不足错误', async () => {
    // 模拟余额不足
    mockProvider.mockBalance('0');
    
    await expect(hlt.buyTokens(100))
      .rejects
      .toThrow('USDT余额不足');
  });
});
```

### 2. 集成测试

```javascript
// 端到端测试流程
describe('E2E Purchase Flow', () => {
  test('完整购买流程', async () => {
    // 1. 连接钱包
    await hlt.connectWallet();
    
    // 2. 检查初始状态
    const initialInfo = await hlt.getUserInfo();
    expect(initialInfo.address).toBeTruthy();
    
    // 3. 执行购买
    const result = await hlt.buyTokens(100);
    expect(result.transactionHash).toBeTruthy();
    
    // 4. 验证购买结果
    const finalInfo = await hlt.getUserInfo();
    expect(parseFloat(finalInfo.purchased.hltAmount)).toBeGreaterThan(0);
  });
});
```

### 3. 测试网测试清单

- [ ] 钱包连接功能
- [ ] 网络切换功能
- [ ] 余额查询功能
- [ ] 代币购买功能
- [ ] 授权流程
- [ ] 错误处理
- [ ] 事件监听
- [ ] 交易状态跟踪
- [ ] 锁仓状态查询
- [ ] 实时数据更新

## ❓ FAQ

### Q1: 如何处理网络切换？

```javascript
// 监听网络变化
window.ethereum.on('chainChanged', (chainId) => {
  // 重新初始化合约
  window.location.reload();
});

// 或者动态切换
function handleNetworkChange(chainId) {
  const networkConfig = getNetworkConfig(chainId);
  if (networkConfig) {
    // 更新合约地址
    hlt.updateContractAddresses(networkConfig.contracts);
  }
}
```

### Q2: 如何优化Gas费用？

```javascript
// 1. 批量操作
async function batchApproveAndBuy(usdtAmount) {
  // 使用 multicall 或批量交易
}

// 2. Gas价格优化
async function getOptimalGasPrice() {
  const gasPrice = await provider.getGasPrice();
  // 可以根据网络情况调整
  return gasPrice.mul(110).div(100); // 增加10%确保快速确认
}
```

### Q3: 如何处理大数精度问题？

```javascript
// 使用 ethers.js 的 BigNumber
import { BigNumber } from 'ethers';

// ✅ 正确的做法
const usdtAmount = ethers.utils.parseUnits('100.123456', 6);
const hltAmount = ethers.utils.parseEther('1200.0');

// ❌ 错误的做法
const wrongAmount = 100.123456 * 1000000; // 可能有精度问题
```

### Q4: 如何实现断线重连？

```javascript
class ConnectionManager {
  constructor(provider) {
    this.provider = provider;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }
  
  async checkConnection() {
    try {
      await this.provider.getNetwork();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      return true;
    } catch (error) {
      this.isConnected = false;
      return false;
    }
  }
  
  async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      throw new Error('重连次数超限');
    }
    
    this.reconnectAttempts++;
    
    // 等待一段时间后重试
    await new Promise(resolve => setTimeout(resolve, 1000 * this.reconnectAttempts));
    
    return this.checkConnection();
  }
}
```

### Q5: 如何实现交易历史记录？

```javascript
// 查询用户交易历史
async function getUserTransactionHistory(userAddress, fromBlock = 0) {
  const purchaseFilter = crowdsale.filters.TokensPurchased(userAddress);
  const events = await crowdsale.queryFilter(purchaseFilter, fromBlock);
  
  return events.map(event => ({
    transactionHash: event.transactionHash,
    blockNumber: event.blockNumber,
    timestamp: event.args.timestamp.toNumber(),
    usdtAmount: ethers.utils.formatUnits(event.args.usdtAmount, 6),
    hltAmount: ethers.utils.formatEther(event.args.hltAmount),
    lockTime: event.args.lockTime.toNumber()
  }));
}
```

---

## 📞 技术支持

如果在集成过程中遇到问题，请：

1. 查看本文档的FAQ部分
2. 检查合约地址和网络配置
3. 查看浏览器控制台错误信息
4. 联系技术支持团队

## 📚 相关资源

- [ethers.js 文档](https://docs.ethers.io/)
- [wagmi 文档](https://wagmi.sh/)
- [OpenZeppelin 合约](https://docs.openzeppelin.com/contracts/)
- [BSC 开发文档](https://docs.binance.org/smart-chain/)
- [MetaMask 开发文档](https://docs.metamask.io/)

---

**祝您集成顺利！** 🎉