// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./HLTToken.sol";

/**
 * @title HLT Crowdsale
 * @dev 健康医疗代币众筹合约
 * @notice 支持USDT购买，价格可设置，购买后12个月锁仓
 */
contract Crowdsale is ReentrancyGuard, Ownable {
    // 代币合约
    HLTToken public token;
    
    // USDT代币合约
    IERC20 public usdtToken;
    
    // 众筹参数
    uint256 public tokensPerUSDT = 12; // 1 USDT = 12 HLT (可设置)
    uint256 public constant MIN_PURCHASE_USDT = 1000000; // 最小购买1 USDT (考虑6位小数)
    uint256 public constant MAX_PURCHASE_USDT = 1000000000000; // 最大购买100万USDT (考虑6位小数)
    uint256 public constant LOCK_DURATION = 365 days; // 12个月锁仓期
    
    // 众筹状态
    bool public crowdsaleActive;
    bool public crowdsaleEnded;
    uint256 public crowdsaleStartTime;
    uint256 public crowdsaleEndTime;
    
    // 众筹统计
    uint256 public totalUSDTRaised;
    uint256 public totalHLTSold;
    uint256 public totalParticipants;
    
    // 用户购买记录
    mapping(address => uint256) public userPurchases; // 用户购买的USDT数量
    mapping(address => uint256) public userHLTAmount; // 用户获得的HLT数量
    mapping(address => bool) public hasParticipated; // 用户是否参与过
    mapping(address => uint256) public userLockTime; // 用户锁仓开始时间
    
    // 事件
    event CrowdsaleStarted(uint256 startTime);
    event TokensPurchased(address indexed buyer, uint256 usdtAmount, uint256 hltAmount, uint256 lockTime, uint256 timestamp);
    event CrowdsaleEnded(uint256 endTime, uint256 totalUSDT, uint256 totalHLT);
    event USDTWithdrawn(address indexed owner, uint256 amount);
    event PriceUpdated(uint256 oldPrice, uint256 newPrice);
    event TokensUnlocked(address indexed user, uint256 amount);
    
    /**
     * @dev 构造函数
     * @param _token HLT代币合约地址
     * @param _usdtToken USDT代币合约地址
     * @param _owner 合约所有者
     */
    constructor(
        address _token,
        address _usdtToken,
        address _owner
    ) Ownable(_owner) {
        require(_token != address(0), "Invalid token address");
        require(_usdtToken != address(0), "Invalid USDT address");
        require(_owner != address(0), "Invalid owner address");
        
        token = HLTToken(_token);
        usdtToken = IERC20(_usdtToken);
    }
    
    /**
     * @dev 设置代币价格
     * @param _newPrice 新的价格比例 (1 USDT = _newPrice HLT)
     */
    function setTokenPrice(uint256 _newPrice) external onlyOwner {
        require(_newPrice > 0, "Price must be greater than 0");
        uint256 oldPrice = tokensPerUSDT;
        tokensPerUSDT = _newPrice;
        emit PriceUpdated(oldPrice, _newPrice);
    }
    
    /**
     * @dev 开始众筹 (不设置结束时间，由endCrowdsale决定)
     */
    function startCrowdsale() external onlyOwner {
        require(!crowdsaleActive, "Crowdsale already active");
        require(!crowdsaleEnded, "Crowdsale already ended");
        
        crowdsaleActive = true;
        crowdsaleStartTime = block.timestamp;
        // 不设置结束时间，由endCrowdsale决定
        
        emit CrowdsaleStarted(crowdsaleStartTime);
    }
    
    /**
     * @dev 购买代币
     * @param _usdtAmount USDT数量
     */
    function buyTokens(uint256 _usdtAmount) external nonReentrant {
        require(crowdsaleActive, "Crowdsale not active");
        require(!crowdsaleEnded, "Crowdsale ended");
        require(_usdtAmount >= MIN_PURCHASE_USDT, "Amount too small");
        require(_usdtAmount <= MAX_PURCHASE_USDT, "Amount too large");
        
        // 计算应得HLT数量
        uint256 hltAmount = _usdtAmount * tokensPerUSDT;
        
        // 检查代币余额
        require(token.balanceOf(address(this)) >= hltAmount, "Insufficient token balance");
        
        // 检查USDT授权
        require(usdtToken.allowance(msg.sender, address(this)) >= _usdtAmount, "Insufficient USDT allowance");
        
        // 转移USDT
        require(usdtToken.transferFrom(msg.sender, address(this), _usdtAmount), "USDT transfer failed");
        
        // 更新统计
        totalUSDTRaised += _usdtAmount;
        totalHLTSold += hltAmount;
        
        // 更新用户记录
        userPurchases[msg.sender] += _usdtAmount;
        userHLTAmount[msg.sender] += hltAmount;
        
        if (!hasParticipated[msg.sender]) {
            hasParticipated[msg.sender] = true;
            totalParticipants++;
        }
        
        // 设置锁仓时间
        userLockTime[msg.sender] = block.timestamp;
        
        // 给用户代币（锁仓状态）
        require(token.transfer(msg.sender, hltAmount), "Token transfer failed");
        
        // 在HLTToken合约中设置用户锁仓时间
        token.setUserLockTime(msg.sender, block.timestamp);
        
        emit TokensPurchased(msg.sender, _usdtAmount, hltAmount, userLockTime[msg.sender], block.timestamp);
    }
    
    /**
     * @dev 结束众筹 (设置结束时间)
     */
    function endCrowdsale() external onlyOwner {
        require(crowdsaleActive, "Crowdsale not active");
        require(!crowdsaleEnded, "Crowdsale already ended");
        
        crowdsaleActive = false;
        crowdsaleEnded = true;
        crowdsaleEndTime = block.timestamp;
        
        emit CrowdsaleEnded(crowdsaleEndTime, totalUSDTRaised, totalHLTSold);
    }
    
    /**
     * @dev 提取USDT
     */
    function withdrawUSDT() external onlyOwner {
        require(crowdsaleEnded, "Crowdsale not ended");
        
        uint256 balance = usdtToken.balanceOf(address(this));
        require(balance > 0, "No USDT to withdraw");
        
        require(usdtToken.transfer(owner(), balance), "USDT transfer failed");
        
        emit USDTWithdrawn(owner(), balance);
    }
    
    /**
     * @dev 紧急停止众筹
     */
    function emergencyStop() external onlyOwner {
        require(crowdsaleActive, "Crowdsale not active");
        
        crowdsaleActive = false;
        crowdsaleEnded = true;
        crowdsaleEndTime = block.timestamp;
        
        emit CrowdsaleEnded(crowdsaleEndTime, totalUSDTRaised, totalHLTSold);
    }
    
    /**
     * @dev 查询用户购买信息
     * @param _user 用户地址
     */
    function getUserInfo(address _user) external view returns (
        uint256 usdtPurchased,
        uint256 hltAmount,
        bool participated
    ) {
        return (
            userPurchases[_user],
            userHLTAmount[_user],
            hasParticipated[_user]
        );
    }
    
    /**
     * @dev 查询用户锁仓信息
     * @param _user 用户地址
     */
    function getUserLockInfo(address _user) external view returns (
        uint256 lockTime,
        uint256 unlockTime,
        bool isLocked
    ) {
        uint256 userUnlockTime = userLockTime[_user] + LOCK_DURATION;
        bool userIsLocked = block.timestamp < userUnlockTime;
        
        return (
            userLockTime[_user],
            userUnlockTime,
            userIsLocked
        );
    }
    
    /**
     * @dev 查询众筹状态
     */
    function getCrowdsaleStatus() external view returns (
        bool _crowdsaleActive,
        bool _crowdsaleEnded,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _totalUSDT,
        uint256 _totalHLT,
        uint256 _totalParticipants
    ) {
        return (
            crowdsaleActive,
            crowdsaleEnded,
            crowdsaleStartTime,
            crowdsaleEndTime,
            totalUSDTRaised,
            totalHLTSold,
            totalParticipants
        );
    }
    
    /**
     * @dev 查询剩余时间
     */
    function getRemainingTime() external view returns (uint256) {
        if (!crowdsaleActive || crowdsaleEnded) {
            return 0;
        }
        
        if (crowdsaleEndTime == 0) {
            return type(uint256).max; // 如果未设置结束时间，返回最大值
        }
        
        if (block.timestamp >= crowdsaleEndTime) {
            return 0;
        }
        
        return crowdsaleEndTime - block.timestamp;
    }
    
    /**
     * @dev 查询代币价格
     */
    function getTokenPrice() external view returns (uint256) {
        return tokensPerUSDT;
    }
    
    /**
     * @dev 计算USDT对应的HLT数量
     * @param _usdtAmount USDT数量
     */
    function calculateHLTAmount(uint256 _usdtAmount) external view returns (uint256) {
        return _usdtAmount * tokensPerUSDT;
    }
    
    /**
     * @dev 计算HLT对应的USDT数量
     * @param _hltAmount HLT数量
     */
    function calculateUSDTAmount(uint256 _hltAmount) external view returns (uint256) {
        // HLT是18位小数，USDT是6位小数，需要调整精度
        // 先将HLT转换为USDT，然后调整精度
        uint256 usdtAmount = _hltAmount / tokensPerUSDT;
        // 调整精度：HLT的18位小数转换为USDT的6位小数
        return usdtAmount / (10 ** 12); // 18 - 6 = 12
    }
    
    /**
     * @dev 查询锁仓信息
     */
    function getLockInfo(address _user) external view returns (
        uint256 lockTime,
        uint256 unlockTime,
        bool isLocked,
        uint256 remainingLockTime
    ) {
        lockTime = userLockTime[_user];
        unlockTime = lockTime + LOCK_DURATION;
        isLocked = block.timestamp < unlockTime;
        remainingLockTime = isLocked ? unlockTime - block.timestamp : 0;
        
        return (lockTime, unlockTime, isLocked, remainingLockTime);
    }
}
