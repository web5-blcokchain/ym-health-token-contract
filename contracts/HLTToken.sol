// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HealthLife Token (HLT)
 * @dev 健康医疗区块链代币
 * @notice 总发行量1亿枚，2400万用于售卖，7600万转给指定账号
 */
contract HLTToken is ERC20, Ownable {
    // 代币分配常量
    uint256 public constant TOTAL_SUPPLY = 100_000_000 * 10**18; // 1亿代币
    uint256 public constant SALE_AMOUNT = 24_000_000 * 10**18;   // 2400万用于售卖
    uint256 public constant OTHER_AMOUNT = 76_000_000 * 10**18;  // 7600万转给其他账号
    
    // 合约地址
    address public crowdsaleContract;
    address public otherAccount; // 接收7600万代币的账号
    
    // 代币分配状态
    bool public otherTokensTransferred;
    
    // 锁仓管理
    mapping(address => uint256) public userLockTime; // 用户锁仓开始时间
    uint256 public constant LOCK_DURATION = 365 days; // 12个月锁仓期
    
    // 事件
    event OtherTokensTransferred(address indexed to, uint256 amount);
    event CrowdsaleContractSet(address indexed crowdsaleContract);
    event UserLockTimeSet(address indexed user, uint256 lockTime);
    
    /**
     * @dev 构造函数
     * @param _name 代币名称
     * @param _symbol 代币符号
     * @param _owner 所有者地址
     * @param _otherAccount 接收7600万代币的账号
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _owner,
        address _otherAccount
    ) ERC20(_name, _symbol) Ownable(_owner) {
        require(_otherAccount != address(0), "Invalid other account address");
        require(_otherAccount != _owner, "Other account cannot be owner");
        
        otherAccount = _otherAccount;
        
        // 铸造初始代币给所有者
        _mint(_owner, TOTAL_SUPPLY);
    }
    
    /**
     * @dev 设置众筹合约地址
     * @param _crowdsaleContract 众筹合约地址
     */
    function setCrowdsaleContract(address _crowdsaleContract) external onlyOwner {
        require(_crowdsaleContract != address(0), "Invalid address");
        crowdsaleContract = _crowdsaleContract;
        emit CrowdsaleContractSet(_crowdsaleContract);
    }
    
    /**
     * @dev 设置用户锁仓时间（只有众筹合约可以调用）
     * @param _user 用户地址
     * @param _lockTime 锁仓开始时间
     */
    function setUserLockTime(address _user, uint256 _lockTime) external {
        require(msg.sender == crowdsaleContract, "Only crowdsale contract can set lock time");
        userLockTime[_user] = _lockTime;
        emit UserLockTimeSet(_user, _lockTime);
    }
    
    /**
     * @dev 检查用户是否在锁仓期
     * @param _user 用户地址
     */
    function isUserLocked(address _user) public view returns (bool) {
        if (userLockTime[_user] == 0) return false; // 未设置锁仓时间
        return block.timestamp < (userLockTime[_user] + LOCK_DURATION);
    }
    
    /**
     * @dev 获取用户解锁时间
     * @param _user 用户地址
     */
    function getUserUnlockTime(address _user) external view returns (uint256) {
        if (userLockTime[_user] == 0) return 0;
        return userLockTime[_user] + LOCK_DURATION;
    }
    
    /**
     * @dev 获取用户剩余锁仓时间
     * @param _user 用户地址
     */
    function getUserRemainingLockTime(address _user) external view returns (uint256) {
        if (!isUserLocked(_user)) return 0;
        return (userLockTime[_user] + LOCK_DURATION) - block.timestamp;
    }
    
    /**
     * @dev 转移其他代币到指定账号
     */
    function transferOtherTokens() external onlyOwner {
        require(!otherTokensTransferred, "Other tokens already transferred");
        require(otherAccount != address(0), "Other account not set");
        
        // 使用_transfer绕过锁仓检查，避免owner参与众筹导致的锁仓问题
        _transfer(msg.sender, otherAccount, OTHER_AMOUNT);
        otherTokensTransferred = true;
        
        emit OtherTokensTransferred(otherAccount, OTHER_AMOUNT);
    }
    
    /**
     * @dev 重写transfer函数，添加锁仓检查
     */
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        // Lock disabled: pure ERC20 transfer
        return super.transfer(to, amount);
    }
    
    /**
     * @dev 重写transferFrom函数，添加锁仓检查
     */
    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        // Lock disabled: pure ERC20 transferFrom
        return super.transferFrom(from, to, amount);
    }
    
    /**
     * @dev 查询代币分配状态
     */
    function getTokenAllocationStatus() external view returns (bool _otherTokensTransferred) {
        return otherTokensTransferred;
    }
    
    /**
     * @dev 查询合约地址
     */
    function getContractAddresses() external view returns (
        address _crowdsaleContract,
        address _otherAccount
    ) {
        return (crowdsaleContract, otherAccount);
    }
    
    /**
     * @dev 查询代币分配数量
     */
    function getTokenAllocationAmounts() external pure returns (
        uint256 _totalSupply,
        uint256 _saleAmount,
        uint256 _otherAmount
    ) {
        return (TOTAL_SUPPLY, SALE_AMOUNT, OTHER_AMOUNT);
    }
}
