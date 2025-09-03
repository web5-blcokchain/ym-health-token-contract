# HLT 锁仓重构方案（策略1：12个月纯锁定，单一 LockVault）

版本：v1.0  
日期：2025-09-02  
状态：草案（待评审）  
负责人：团队共同维护

## 1. 目标与范围
- 将锁仓逻辑从代币层抽离，统一由 LockVault 合约管理。HLTToken 回归“纯 ERC20”。
- 采用策略1：每笔购买生成独立的锁仓记录，锁定 12 个月，到期一次性可领取；锁定期内不可提前领取。  
- 采用“单一 LockVault（单金库）”：全局共享一个金库，按用户+多笔购买维护多条 schedule。  
- 不考虑与历史地址级锁仓的接口兼容，在新版本中以 Vault 为唯一锁仓入口与出口。

## 2. 背景与动因
- 现有锁仓为“地址级禁转”，导致地址在锁定期内所有来源的 HLT 均不可转出，用户体验与业务规则不匹配。
- 为实现“仅锁定购买对应的 HLT”，需要精准的数量级锁定与可领取逻辑，并提升可审计性与可扩展性。

## 3. 术语
- Schedule：一次购买生成的一条锁仓记录（包含数量、开始时间、解锁时间等）。
- Claim：用户在到期后从 LockVault 领取已解锁的 HLT 到自己的钱包。

## 4. 业务与功能需求（FR）
- FR-1 购买锁仓：用户通过 Crowdsale 购买后，对应 HLT 数量进入 LockVault，为用户创建一条 schedule（独立计时）。
- FR-2 锁期与释放：每条 schedule 的锁定期为 12 个月（365 天），到期一次性释放。锁定期间不可领取。
- FR-3 多笔购买：同一用户可存在多条 schedule，互不影响，到期时间按各自购买时间推算。
- FR-4 领取：用户到期后可领取对应 schedule 的全部余额到钱包；支持一次领取多条已到期 schedule。
- FR-5 查询：提供锁仓余额、可领取余额、剩余时间、schedule 明细的只读接口。
- FR-6 权限：仅 Crowdsale 能将 HLT 注入 LockVault 并为用户创建 schedule；仅用户本人可领取自己的余额。
- FR-7 事件：购买/锁定/领取产生事件，便于前端显示与审计。

## 5. 非功能需求（NFR）
- 安全：防重入、权限严格、使用 SafeERC20、状态先写后转账。
- 可审计：事件与视图清晰，代码简洁，边界明确。
- 可扩展：保留未来切换为线性释放的可扩展性（数据结构与接口命名预留）。

## 6. 合约架构
- HLTToken（纯 ERC20）：不包含锁仓限制逻辑。
- Crowdsale：
  - 定价、时间窗、购买逻辑；
  - 购买后将 HLT 划拨到 LockVault 并创建用户 schedule；
  - 发出 TokensPurchased 事件（含 usdtAmount、hltAmount、scheduleId）。
- LockVault（单金库）：
  - 记录并管理用户的多条 schedule；
  - 只读视图（余额、可领取、剩余时间、明细）；
  - 领取（claim）。

代币流：User -> USDT -> Crowdsale；Crowdsale -> HLT -> LockVault（入账至 user 的 schedule）；到期后 LockVault -> HLT -> User。

## 7. 锁仓规则（策略1）
- 每笔购买生成一条 schedule，start = 购买时间，unlock = start + 365 天；
- 锁定期内 claimable = 0；到期后 claimable = total - released（一次性领取完毕）。

## 8. 接口与事件（高层定义）
- Crowdsale：
  - buyTokens(usdtAmount)
  - calculateHLTAmount(usdtAmount) -> hltAmount（视图）
  - 事件：TokensPurchased(address buyer, uint256 usdtAmount, uint256 hltAmount, uint256 scheduleId)
- LockVault：
  - createSchedule(address user, uint256 amount, uint64 start, uint64 unlock) 仅 Crowdsale
  - claim() / claim(uint256[] scheduleIds)
  - getLockedBalance(address user) -> uint256（剩余未释放总额）
  - getClaimable(address user) -> uint256（当前可领取总额）
  - getSchedules(address user) -> Schedule[]（明细）
  - getRemainingLockTime(address user) -> uint256（最近一条未到期 schedule 的剩余时间，或 0）
  - 事件：TokensLocked(address user, uint256 scheduleId, uint256 amount, uint64 start, uint64 unlock)
  - 事件：TokensClaimed(address user, uint256 amount, uint256[] scheduleIds)

权限与安全：
- LockVault 的 createSchedule 仅允许 Crowdsale 调用；
- claim 仅允许 msg.sender 领取自己的余额；
- 使用 nonReentrant 修饰领取；
- 使用 SafeERC20 进行 HLT 转账；
- 先更新状态，再执行外部转账。

## 9. 数据结构（示意）
- struct Schedule { uint128 total; uint128 released; uint64 start; uint64 unlock; }
- mapping(address => Schedule[]) schedules;
- IERC20 hltToken; address crowdsale;（可扩展为角色）

## 10. 边界与异常
- 购买金额过小：在 Crowdsale 端设最小购买额；
- 锁仓注入失败：检查 HLT 余额/授权或改为先行补仓；
- 时间变更与暂停：Crowdsale 可支持 pause；LockVault 一般不暂停 claim；
- 时间戳依赖：使用 block.timestamp，允许一定误差；
- 重复领取：claim 前计算可领取，更新 released 后再转账。

## 11. 测试计划（要点）
- 单元测试：
  - Crowdsale：价格计算、时间窗、min/max、购买与事件、向 Vault 注入 schedule。
  - LockVault：创建 schedule、未到期不可领、到期可领（单条/多条）、可领取与剩余时间视图正确、重入保护、权限限制。
- 集成测试：端到端购买->多笔锁仓->时间推进->批量领取->统计校验。
- 模拟脚本：本地与测试网脚本（购买、查询、到期领取）。

## 12. 前端与运营对接
- 新增“锁仓/已解锁/可领取/剩余时间”展示；
- 购买后提示“资产已进入锁仓，到期后可领取”；
- 提供一键领取入口（支持多条 schedule 合并领取）。

## 13. 上线计划与里程碑
- M1 设计评审与冻结（本文档 v1.0）
- M2 合约实现：LockVault、Crowdsale 改造、HLTToken 精简
- M3 测试与审计：单元/集成测试、第三方审计（可选）
- M4 测试网部署与前端联调
- M5 主网部署与运营上线

## 14. 变更管理
- 文档版本化管理；需求或接口重大变更需重新评审并更新本文档版本号。

## 15. 参数与默认值（建议）
- LOCK_DURATION = 365 天。
- 代币精度：HLT 18 位；USDT 6 位（Crowdsale 价格计算与事件按 18 位输出 HLT）。
- 依赖库：OpenZeppelin（Ownable、ReentrancyGuard、SafeERC20）。

—— 以上为统一对齐的“最新逻辑+需求+技术方案”，后续所有开发与测试以本文档为准。