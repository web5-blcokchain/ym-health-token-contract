# 前端对接说明（Crowdsale + LockVault 架构）

本说明面向前端集成，梳理当前合约的关键接口、事件与交互流程，已完全适配 LockVault 架构（HLT 不再在购买后直接进入用户钱包，而是进入 LockVault 按计划释放）。

## 一、合约清单与职责
- HLTToken：ERC20 主代币，提供众筹额度 SALE_AMOUNT 与众筹合约授权设置
- Crowdsale：众筹逻辑（购买、价格、统计、USDT 提现），负责把购买所得 HLT 锁入 LockVault
- LockVault：锁仓金库（创建计划、查询可领取、领取）
- MockUSDT：USDT 替身（6 位小数，用于测试网与本地）

## 二、计价与精度
- 价格：HLT per USDT（每 1 USDT 可兑换多少 HLT）
  - 调用 Crowdsale.getTokenPrice() 读取
- 换算函数（用于前端预估显示）
  - USDT(6位) → HLT(18位)：Crowdsale.calculateHLTAmount(usdtAmount)
  - HLT(18位) → USDT(6位)：Crowdsale.calculateUSDTAmount(hltAmount)
- 小数位
  - USDT 小数位：6（MockUSDT.decimals() = 6）
  - HLT 小数位：18

## 三、购买流程（Approve + buyTokens）
1) 用户输入购买 USDT 金额（6 位小数），前端调用 calculateHLTAmount 计算预期 HLT 展示
2) 校验金额在 [MIN_PURCHASE_USDT, MAX_PURCHASE_USDT] 范围（单位均为 6 位小数）
   - MIN_PURCHASE_USDT: 1 USDT（1000000）
   - MAX_PURCHASE_USDT: 100 万 USDT（1000000000000）
3) USDT 合约 approve(crowdsale, amount)
4) 调用 crowdsale.buyTokens(amountUSDT)
5) 购买成功后，HLT 不会立即入账用户钱包；Crowdsale 会把对应 HLT 锁入 LockVault 生成锁仓计划

## 四、锁仓与领取（通过 LockVault 查询）
- Vault 地址获取：调用 crowdsale.vault()（public 变量自动生成 getter）
- 锁仓数据展示
  - 查询用户全部锁仓计划：LockVault.schedulesOf(user)
  - 查询剩余未释放：LockVault.getLockedBalance(user)
  - 查询当前可领取：LockVault.getClaimable(user)
  - 查询剩余锁仓时间（秒）：LockVault.getRemainingLockTime(user)
- 领取
  - 一键领取全部：LockVault.claimAll()
  - 指定计划批量领取：LockVault.claim(scheduleIds[])

## 五、众筹状态与统计
- 全局状态：Crowdsale.getCrowdsaleStatus() 返回
  - crowdsaleActive: bool
  - crowdsaleEnded: bool
  - startTime: uint256（秒）
  - endTime: uint256（秒）
  - totalUSDT: uint256（6 位小数）
  - totalHLT: uint256（18 位小数）
  - totalParticipants: uint256
- 用户统计：Crowdsale.getUserInfo(user) 返回
  - usdtPurchased: uint256（总 USDT，6 位小数）
  - hltAmount: uint256（总 HLT，18 位小数）
  - participated: bool

## 六、事件订阅（用于提示与刷新）
- Crowdsale
  - CrowdsaleStarted(uint256 startTime)
  - TokensPurchased(address indexed buyer, uint256 usdtAmount, uint256 hltAmount, uint256 scheduleId, uint256 timestamp)
  - CrowdsaleEnded(uint256 endTime, uint256 totalUSDT, uint256 totalHLT)
  - USDTWithdrawn(address indexed owner, uint256 amount)
  - PriceUpdated(uint256 oldPrice, uint256 newPrice)
  - TokensUnlocked(address indexed user, uint256 amount)
- LockVault
  - CrowdsaleUpdated(address indexed oldCrowdsale, address indexed newCrowdsale)
  - TokensLocked(address indexed user, uint256 indexed scheduleId, uint256 amount, uint64 start, uint64 unlock)
  - TokensClaimed(address indexed user, uint256 amount, uint256[] scheduleIds)

## 七、前端交互建议
- 价格展示：优先通过 getTokenPrice() 并订阅 PriceUpdated 事件;
- 输入校验：在本地校验 [MIN_PURCHASE_USDT, MAX_PURCHASE_USDT] 范围；
- 购买后刷新：监听 TokensPurchased 事件，刷新“我的锁仓”与“我的统计”；
- 锁仓页：优先使用 getClaimable 和 getRemainingLockTime 渲染可领取/倒计时，需要明细再查询 schedulesOf；
- 领取按钮：getClaimable > 0 时可用，执行 claimAll() 后刷新钱包余额与锁仓数据；
- 精度与格式化：
  - USDT 使用 6 位小数；HLT 存储 18 位，展示可按 2~4 位;
  - 使用 calculateHLTAmount/calculateUSDTAmount 做前端金额换算，避免浮点误差；

## 八、常见状态判定
- 可购买：getCrowdsaleStatus().crowdsaleActive == true 且 crowdsaleEnded == false
- 已结束：结束后前端应禁用购买按钮（合约会拒绝）
- Vault 地址：从 crowdsale.vault() 获取，然后所有锁仓/领取相关查询都走 LockVault

## 九、接口一览（函数签名）
- Crowdsale
  - getTokenPrice() → uint256
  - calculateHLTAmount(uint256 usdtAmount) → uint256
  - calculateUSDTAmount(uint256 hltAmount) → uint256
  - getCrowdsaleStatus() → (bool active, bool ended, uint256 startTime, uint256 endTime, uint256 totalUSDT, uint256 totalHLT, uint256 totalParticipants)
  - getUserInfo(address user) → (uint256 usdtPurchased, uint256 hltAmount, bool participated)
  - MIN_PURCHASE_USDT() → uint256（1e6）
  - MAX_PURCHASE_USDT() → uint256（1e12）
  - vault() → address
- LockVault
  - schedulesOf(address user) → Schedule[]
  - getLockedBalance(address user) → uint256
  - getClaimable(address user) → uint256
  - getRemainingLockTime(address user) → uint256
  - claimAll()
  - claim(uint256[] scheduleIds)
- MockUSDT
  - decimals() → 6

> 说明：以上接口与事件已通过本地完整模拟与单元测试覆盖，生产使用时仅需替换合约地址与链上 USDT 地址，并在前端完成相应的 RPC 与合约 ABI 对接。