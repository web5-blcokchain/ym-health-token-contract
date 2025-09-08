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

    // ============ 代币层锁仓（每笔独立条目） ============
    struct LockEntry {
        uint128 amount;   // 锁定数量
        uint64 start;     // 锁定开始时间
        uint64 unlock;    // 解锁时间
    }
    mapping(address => LockEntry[]) private _locks; // 每个用户的锁仓条目列表

    // 事件
    event OtherTokensTransferred(address indexed to, uint256 amount);
    event CrowdsaleContractSet(address indexed crowdsaleContract);
    event LockAdded(address indexed user, uint256 indexed lockId, uint256 amount, uint64 start, uint64 unlock);
    
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
     * @dev 仅供众筹合约调用：为用户新增一条锁仓记录（不会转账，仅登记锁仓）
     *      要求：调用方必须是 crowdsaleContract；amount>0 且 unlock>start。
     * @return lockId 新增条目的索引
     */
    function lockFromCrowdsale(address user, uint256 amount, uint64 start, uint64 unlock)
        external
        returns (uint256 lockId)
    {
        require(msg.sender == crowdsaleContract, "Only crowdsale");
        require(user != address(0), "Bad user");
        require(amount > 0, "Amount=0");
        require(unlock > start, "Bad time");

        lockId = _locks[user].length;
        _locks[user].push(LockEntry({
            amount: uint128(amount),
            start: start,
            unlock: unlock
        }));

        emit LockAdded(user, lockId, amount, start, unlock);
    }

    // ============ 视图查询 ============
    function getLocks(address user) external view returns (LockEntry[] memory) {
        return _locks[user];
    }

    function getLockedAmount(address user) public view returns (uint256) {
        LockEntry[] memory arr = _locks[user];
        uint256 total;
        uint256 nowTs = block.timestamp;
        for (uint256 i = 0; i < arr.length; i++) {
            if (nowTs < arr[i].unlock) {
                total += uint256(arr[i].amount);
            }
        }
        return total;
    }

    function getUnlockedAmount(address user) public view returns (uint256) {
        uint256 bal = balanceOf(user);
        uint256 locked = getLockedAmount(user);
        if (bal <= locked) return 0;
        return bal - locked;
    }

    /**
     * @dev 转移其他代币到指定账号（项目方分配），使用 _transfer 绕过锁仓检查
     */
    function transferOtherTokens() external onlyOwner {
        require(!otherTokensTransferred, "Other tokens already transferred");
        require(otherAccount != address(0), "Other account not set");
        
        _transfer(msg.sender, otherAccount, OTHER_AMOUNT);
        otherTokensTransferred = true;
        
        emit OtherTokensTransferred(otherAccount, OTHER_AMOUNT);
    }
    
    /**
     * @dev 重写transfer函数，添加未到期锁定校验：仅限制 from 的未解锁份额；非锁仓余额不受影响
     */
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        address from = _msgSender();
        if (from != address(0) && to != address(0)) {
            uint256 locked = getLockedAmount(from);
            uint256 bal = balanceOf(from);
            require(amount <= bal - locked, "Transfer exceeds unlocked");
        }
        return super.transfer(to, amount);
    }
    
    /**
     * @dev 重写transferFrom函数，添加未到期锁定校验：仅限制 from 的未解锁份额；非锁仓余额不受影响
     */
    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        if (from != address(0) && to != address(0)) {
            uint256 locked = getLockedAmount(from);
            uint256 bal = balanceOf(from);
            require(amount <= bal - locked, "Transfer exceeds unlocked");
        }
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
