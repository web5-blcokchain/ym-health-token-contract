# HealthLife Token (HLT)

健康医疗区块链代币项目 - 基于以太坊的智能合约系统

## 项目概述

HealthLife Token (HLT) 是一个基于以太坊区块链的健康医疗代币项目，旨在构建一个安全、透明、可持续的数字健康生态系统。

### 核心特性

- **代币标准**: ERC-20
- **总发行量**: 1亿 HLT
- **区块链平台**: 以太坊网络
- **售卖机制**: 2400万代币用于售卖，7600万代币转给指定账号

### 代币分配

- **售卖部分**: 24%（2,400万 HLT）- 通过众筹合约售卖
- **其他部分**: 76%（7,600万 HLT）- 直接转给指定账号

## 技术架构

### 智能合约

1. **HLTToken.sol** - 主代币合约
   - 标准ERC-20功能
   - 权限管理系统
   - 代币分配控制
   - 自动转移其他代币到指定账号

2. **Crowdsale.sol** - 众筹合约
   - 1 USDT = 12 HLT 定价机制
   - 仅支持USDT支付
   - 购买后直接获得代币（无锁仓）

### 技术栈

- **Solidity**: 0.8.19+
- **Hardhat**: 开发环境
- **OpenZeppelin**: 安全合约库
- **Yarn**: 包管理器

## 快速开始

### 环境要求

- Node.js 18.0.0+
- Yarn 1.22.0+

### 安装依赖

```bash
yarn install
```

### 编译合约

```bash
yarn compile
```

### 运行测试

```bash
yarn test
```

### 本地部署

```bash
# 启动本地节点
yarn node

# 部署合约
yarn deploy
```

### 测试网部署

```bash
# 部署到Goerli测试网
yarn deploy:goerli

# 部署到Sepolia测试网
yarn deploy:sepolia
```

## 部署配置

### 环境变量

创建 `.env` 文件并配置以下参数：

```bash
# 网络RPC URL
GOERLI_URL=https://eth-goerli.g.alchemy.com/v2/YOUR_API_KEY
SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# 私钥 (不要提交到版本控制)
PRIVATE_KEY=your_private_key_here

# Etherscan API Key
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# Gas报告
REPORT_GAS=true
```

### 网络配置

项目支持以下网络：

- **Hardhat Network**: 本地开发
- **Goerli**: 测试网
- **Sepolia**: 测试网
- **Ethereum Mainnet**: 主网

## 合约功能

### 众筹机制

- **定价**: 1 USDT = 12 HLT
- **支付**: 仅支持USDT
- **代币**: 购买后直接获得，无需锁仓
- **管理**: 支持开始、结束、紧急停止

### 代币分配

- **售卖代币**: 2400万HLT，通过众筹合约售卖
- **其他代币**: 7600万HLT，部署后自动转给指定账号
- **分配状态**: 可查询代币分配完成状态

### 权限管理

- **角色分离**: 管理员、铸造者、暂停者
- **最小权限**: 每个角色只拥有必要权限
- **安全控制**: 严格的权限检查

## 部署流程

### 1. 准备阶段
- 配置环境变量
- 设置其他账号地址（接收7600万代币）
- 检查网络连接和账户余额

### 2. 部署阶段
- 部署HLTToken合约
- 部署Crowdsale合约
- 配置合约权限关系
- 给众筹合约分配2400万代币
- 自动转移7600万代币到指定账号

### 3. 众筹操作
- 调用`startCrowdsale(duration)`开始众筹
- 用户通过`buyTokens(usdtAmount)`购买代币
- 调用`endCrowdsale()`结束众筹
- 调用`withdrawUSDT()`提取USDT

## 测试

### 测试覆盖

- **单元测试**: 所有合约函数
- **集成测试**: 合约间交互
- **边界测试**: 异常情况处理
- **安全测试**: 权限和攻击防护

### 运行测试

```bash
# 运行所有测试
yarn test

# 运行特定测试文件
yarn test test/HLTToken.test.js

# 生成测试覆盖率报告
yarn coverage
```

## 安全特性

- **重入攻击防护**: 使用ReentrancyGuard
- **整数溢出防护**: Solidity 0.8+内置保护
- **权限控制**: 基于角色的访问控制
- **暂停机制**: 紧急情况下的合约暂停

## 开发规范

### 代码规范

- **Solidity**: 遵循官方风格指南
- **JavaScript**: 使用ES6+语法
- **注释**: 完整的NatSpec文档
- **测试**: 90%+测试覆盖率

### 提交规范

- **功能开发**: feat/
- **Bug修复**: fix/
- **文档更新**: docs/
- **测试相关**: test/

## 监控与维护

### 监控指标

- 合约调用次数和成功率
- Gas消耗情况
- 用户活跃度
- 异常交易监控

### 维护策略

- 定期安全审计
- 性能优化
- 功能升级
- 社区反馈收集

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交代码变更
4. 创建Pull Request
5. 代码审查和合并

## 许可证

MIT License

## 联系方式

- 项目地址: [GitHub Repository]
- 技术文档: [Documentation]
- 社区讨论: [Discord/Telegram]

## 免责声明

本项目仅供学习和研究使用，不构成投资建议。在使用前请仔细阅读相关法律条款和风险提示。
