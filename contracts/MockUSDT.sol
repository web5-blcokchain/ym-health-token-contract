// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Mock USDT
 * @dev 模拟USDT代币合约，用于测试
 */
contract MockUSDT is ERC20, Ownable {
    uint8 private _decimals;
    
    /**
     * @dev 构造函数
     * @param name_ 代币名称
     * @param symbol_ 代币符号
     * @param decimals_ 小数位数
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        _decimals = decimals_;
    }
    
    /**
     * @dev 返回代币小数位数
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    /**
     * @dev 铸造代币
     * @param to 接收地址
     * @param amount 铸造数量
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev 销毁代币
     * @param amount 销毁数量
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
